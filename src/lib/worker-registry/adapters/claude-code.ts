import { WorkerAdapter, WorkerHealth, WorkerCapabilities, TaskPayload, ExecutionPlan, NormalizedResult, WorkerResult, classifyWorkerTerminal, formatTerminalDiagnostics } from '../types';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export class ClaudeCodeWorkerAdapter implements WorkerAdapter {
  id = 'claude_code';
  displayName = 'Claude Code CLI';

  private activeProcesses: Map<string, child_process.ChildProcess> = new Map();
  // Runs whose cancellation was requested by the owner before the process
  // closed. Drives the CANCELLED terminal classification (precedence over
  // timeout / null-exit / exit code).
  private cancelledRuns: Set<string> = new Set();

  async healthCheck(): Promise<WorkerHealth> {
    try {
      const versionOutput = child_process.execSync('claude --version', { stdio: 'pipe' }).toString().trim();
      const authOutput = child_process.execSync('claude auth status 2>&1', { stdio: 'pipe' }).toString().trim();
      let loggedIn = false;
      try {
        const authObj = JSON.parse(authOutput);
        loggedIn = authObj.loggedIn === true;
      } catch {
        loggedIn = authOutput.includes('"loggedIn": true') || authOutput.toLowerCase().includes('logged in');
      }

      if (loggedIn) {
        return { status: 'ONLINE', version: versionOutput };
      }
      return {
        status: 'BLOCKED_BY_AUTH',
        version: versionOutput,
        errorMessage: 'Manual login required. Run "claude login" to verify.'
      };
    } catch (e: any) {
      return { status: 'OFFLINE', errorMessage: e.message };
    }
  }

  async availability(): Promise<{ available: boolean; reason?: string }> {
    const health = await this.healthCheck();
    return {
      available: health.status === 'ONLINE',
      reason: health.errorMessage
    };
  }

  validateTask(task: TaskPayload): { valid: boolean; reason?: string } {
    if (!task.instructions || task.instructions.trim().length === 0) {
      return { valid: false, reason: 'Task instructions cannot be empty.' };
    }
    if (task.executablePath) {
      return { valid: false, reason: 'Security Violation: Task payload cannot specify executablePath.' };
    }
    if (task.customFlags && task.customFlags.length > 0) {
      return { valid: false, reason: 'Security Violation: Task payload cannot specify arbitrary CLI flags.' };
    }
    return { valid: true };
  }

  async capabilities(): Promise<WorkerCapabilities> {
    return {
      FILES_READ: true,
      FILES_CREATE: true,
      FILES_MODIFY: true,
      ARTIFACT_CREATE: true,
      GIT_READ: true,
      PROCESS_RUN_TESTS: true
    };
  }

  async prepareExecutionPlan(task: TaskPayload, workspaceRoot: string): Promise<ExecutionPlan> {
    const validation = this.validateTask(task);
    if (!validation.valid) {
      throw new Error(`Invalid Task Payload: ${validation.reason}`);
    }
    const customEnv = { ...process.env };
    delete customEnv.ANTHROPIC_API_KEY;
    delete customEnv.CLAUDE_API_KEY;
    delete customEnv.ANTHROPIC_BASE_URL;

    return {
      command: process.platform === 'win32' ? 'claude.exe' : 'claude',
      args: ['--safe-mode', '-p', task.instructions, '--no-session-persistence', '--permission-mode', 'bypassPermissions', '--setting-sources', 'project'],
      cwd: workspaceRoot,
      shell: false,
      env: customEnv
    };
  }

  protected spawnProcess(command: string, args: string[], options: child_process.SpawnOptions): child_process.ChildProcess {
    return child_process.spawn(command, args, options);
  }

  async execute(task: TaskPayload, workspaceRoot: string, options: { timeoutMs?: number } = {}): Promise<WorkerResult> {
    const startTime = Date.now();
    const runId = task.runId || `run-${Date.now()}`;
    const taskId = task.taskId;
    const executionId = `exec-${Date.now()}`;
    const timeoutMs = options.timeoutMs || 180000;

    const plan = await this.prepareExecutionPlan(task, workspaceRoot);

    return new Promise<WorkerResult>((resolve) => {
      let stdout = '';
      let stderr = '';
      let isTimedOut = false;
      // Single-finalization guard: the Promise resolves exactly once regardless
      // of whether 'close' and/or 'error' fire, and regardless of event order.
      let finalized = false;
      let timer: ReturnType<typeof setTimeout> | undefined;

      // Single-finalization protocol.
      //
      // `claimTerminal()` MUST be called synchronously at the very top of every
      // terminal handler — before any `await` — otherwise a second event that
      // arrives during the await window would slip past the guard and race the
      // first one. The first claimant wins; every later event returns early.
      // Timers are cleared as part of the claim.
      const claimTerminal = (): boolean => {
        if (finalized) return false;
        finalized = true;
        if (timer !== undefined) {
          clearTimeout(timer);
          timer = undefined;
        }
        this.activeProcesses.delete(runId);
        return true;
      };

      const settle = (result: WorkerResult): void => {
        this.cancelledRuns.delete(runId);
        resolve(result);
      };

      const child = this.spawnProcess(plan.command, plan.args, {
        cwd: plan.cwd,
        shell: false,
        env: plan.env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      child.stdin?.end();

      this.activeProcesses.set(runId, child);

      timer = setTimeout(() => {
        if (finalized) return;
        isTimedOut = true;
        child.kill('SIGKILL');
      }, timeoutMs);

      child.stdout?.on('data', (data: Buffer | string) => {
        stdout += data.toString();
        if (stdout.length > 1000000) {
          stdout = stdout.substring(0, 1000000) + '\n[TRUNCATED_OUTPUT_LIMIT_EXCEEDED]';
          child.kill('SIGKILL');
        }
      });

      child.stderr?.on('data', (data: Buffer | string) => {
        stderr += data.toString();
        if (stderr.length > 500000) {
          stderr = stderr.substring(0, 500000) + '\n[TRUNCATED_ERR_LIMIT_EXCEEDED]';
        }
      });

      child.on('close', async (exitCode: number | null, signal: NodeJS.Signals | null) => {
        // Claim synchronously: this handler awaits below, and a late 'error'
        // event must not be able to overwrite an already-decided terminal state.
        if (!claimTerminal()) return;
        const cancelRequested = this.cancelledRuns.has(runId);
        const durationMs = Date.now() - startTime;

        const classification = classifyWorkerTerminal({
          cancelRequested,
          timedOut: isTimedOut,
          spawnError: null,
          exitCode,
          signal
        });
        const diagnostics = formatTerminalDiagnostics(classification);

        // Cancellation / timeout are terminal without a workspace file scan.
        if (classification.status === 'CANCELLED' || classification.status === 'TIMEOUT') {
          return settle({
            workerId: this.id,
            taskId,
            runId,
            executionId,
            status: classification.status,
            summary: classification.status === 'CANCELLED'
              ? 'Execution cancelled by caller.'
              : `Execution timed out after ${timeoutMs}ms`,
            changedFiles: [],
            createdFiles: [],
            deletedFiles: [],
            artifacts: [],
            patchPath: '',
            stdoutSummary: stdout.substring(0, 1000),
            stderrSummary: stderr.substring(0, 1000),
            exitCode: -1,
            durationMs,
            warnings: [
              classification.status === 'TIMEOUT' ? 'TIMEOUT_EXCEEDED' : 'CANCELLED_BY_OWNER',
              ...diagnostics
            ],
            errors: [classification.status === 'TIMEOUT'
              ? 'CLAUDE_TIMED_OUT: Process killed due to execution timeout.'
              : 'CLAUDE_CANCELLED: Process terminated via cancel().'],
            terminalReason: classification.reason,
            terminalSignal: classification.diagnostics.signal
          });
        }

        // SUCCESS or FAILED: discover created files before finalizing.
        await this.normalizeResult(stdout, stderr, classification.exitCode, workspaceRoot);

        const createdFiles: string[] = [];
        try {
          const scanDir = (dir: string, baseDir: string) => {
            if (!fs.existsSync(dir)) return;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
              const fullPath = path.join(dir, entry.name);
              if (entry.isDirectory()) {
                if (entry.name !== 'node_modules' && entry.name !== '.git') {
                  scanDir(fullPath, baseDir);
                }
              } else {
                const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
                createdFiles.push(relPath);
              }
            }
          };
          scanDir(workspaceRoot, workspaceRoot);
        } catch {
          // ignore scan errors
        }

        const summary = classification.status === 'SUCCESS'
          ? 'Claude Code CLI task completed successfully.'
          : `Task failed with exit code ${classification.exitCode}.`;

        settle({
          workerId: this.id,
          taskId,
          runId,
          executionId,
          status: classification.status,
          summary,
          changedFiles: createdFiles,
          createdFiles,
          deletedFiles: [],
          artifacts: [],
          patchPath: '',
          stdoutSummary: stdout.substring(0, 1000),
          stderrSummary: stderr.substring(0, 1000),
          exitCode: classification.exitCode,
          durationMs,
          warnings: [...diagnostics],
          errors: classification.status === 'FAILED'
            ? [stderr || `CLAUDE_EXECUTION_FAILED: ${classification.reason}`]
            : [],
          terminalReason: classification.reason,
          terminalSignal: classification.diagnostics.signal
        });
      });

      child.on('error', (err: Error) => {
        if (!claimTerminal()) return;
        const durationMs = Date.now() - startTime;
        // A spawn/process error is terminal on its own: the process never
        // produced a confirmed exit code, so this is always FAILED. It is
        // never re-interpreted as SUCCESS.
        const classification = classifyWorkerTerminal({
          cancelRequested: false,
          timedOut: false,
          spawnError: err,
          exitCode: null,
          signal: null
        });
        settle({
          workerId: this.id,
          taskId,
          runId,
          executionId,
          status: classification.status,
          summary: `Failed to spawn process: ${err.message}`,
          changedFiles: [],
          createdFiles: [],
          deletedFiles: [],
          artifacts: [],
          patchPath: '',
          stdoutSummary: '',
          stderrSummary: err.message,
          exitCode: classification.exitCode,
          durationMs,
          warnings: [...formatTerminalDiagnostics(classification)],
          errors: [err.message],
          terminalReason: classification.reason,
          terminalSignal: null
        });
      });
    });
  }

  async cancel(runId: string): Promise<boolean> {
    const child = this.activeProcesses.get(runId);
    if (child) {
      // Record cancellation BEFORE killing so the close handler classifies
      // the run as CANCELLED (precedence over timeout / null exit / exit code).
      this.cancelledRuns.add(runId);
      child.kill('SIGTERM');
      this.activeProcesses.delete(runId);
      return true;
    }
    return false;
  }

  async normalizeResult(rawStdout: string, rawStderr: string, exitCode: number, workspaceRoot: string): Promise<NormalizedResult> {
    return {
      exitCode,
      stdout: rawStdout,
      stderr: rawStderr,
      patch: {
        diffContent: '',
        changedFiles: [],
        securityFlags: []
      }
    };
  }
}
