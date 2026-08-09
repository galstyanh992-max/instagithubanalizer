import { WorkerAdapter, WorkerHealth, WorkerCapabilities, TaskPayload, ExecutionPlan, NormalizedResult, WorkerResult, classifyWorkerTerminal, formatTerminalDiagnostics } from '../types';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Fail-closed sandbox policy for this adapter. These values are surfaced as
// diagnostic strings on every WorkerResult (success, failure, timeout,
// cancellation) so downstream auditing can confirm no dangerous bypass was
// ever used, without requiring changes to the shared WorkerResult type.
const CODEX_SANDBOX_DIAGNOSTICS = [
  'sandboxPolicy=workspace-write',
  'approvalPolicy=never-via-inline-config',
  'dangerousBypassUsed=false',
  'networkAccessEnabled=false'
];

// Structured, fail-closed failure classification for non-zero-exit results.
// No dangerous fallback is ever attempted for any of these — a rejected/denied
// run always surfaces as FAILED with a labeled reason, never a dangerous retry.
function classifyCodexFailure(stderr: string, terminalReason?: string): string {
  const text = stderr || '';
  if (/unexpected argument|error: unrecognized|found\s*$/im.test(text) && /codex exec/i.test(text)) {
    return `CODEX_CLI_ARGUMENT_REJECTED: ${text}`;
  }
  if (/sandbox/i.test(text) && /(denied|not permitted|permission)/i.test(text)) {
    return `CODEX_SANDBOX_DENIED: ${text}`;
  }
  if (terminalReason === 'NO_EXIT_CODE') {
    return `CODEX_NO_EXIT_CODE: ${text || 'Process terminated without a confirmed exit code.'}`;
  }
  return `CODEX_EXECUTION_FAILED: ${text || 'Non-zero exit code returned'}`;
}

export class CodexWorkerAdapter implements WorkerAdapter {
  id = 'codex_cli';
  displayName = 'Codex Local CLI';

  private activeProcesses: Map<string, child_process.ChildProcess> = new Map();
  private cancelledRuns: Set<string> = new Set();

  async healthCheck(): Promise<WorkerHealth> {
    try {
      const versionStr = child_process.execSync('codex --version', { stdio: 'pipe' }).toString().trim();
      const statusOutput = child_process.execSync('codex login status 2>&1', { stdio: 'pipe' }).toString().trim();
      if (statusOutput.toLowerCase().includes('logged in')) {
        return { status: 'ONLINE', version: versionStr };
      }
      return {
        status: 'BLOCKED_BY_AUTH',
        version: versionStr,
        errorMessage: 'Manual login required. Run "codex login" manually.'
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

    // NON_INTERACTIVE_SANDBOXED policy: sandbox stays enabled (workspace-write),
    // approvals are never prompted for (fully non-interactive), and the
    // dangerous full-bypass flag is never emitted. The prompt itself is never
    // passed as a CLI argument — it is written to stdin and terminated with
    // EOF (see execute()); '-' tells Codex to read the prompt from stdin.
    //
    // `--ask-for-approval` is intentionally NOT used: the installed `codex exec`
    // subcommand (verified against codex-cli 0.145.0's own `--help`) does not
    // expose that flag at all — it only exists on the top-level interactive
    // `codex` command and is rejected by `exec` with "unexpected argument"
    // (exit code 2). `codex exec` is already non-interactive by construction,
    // so the equivalent, exec-supported mechanism is an inline config override
    // via `-c approval_policy="never"`, which `codex exec --help` confirms is
    // accepted (`-c, --config <key=value>`). This preserves the same fail-closed
    // "never ask for approval" intent without passing an argument exec rejects.
    let command = 'codex';
    let args = [
      'exec',
      '--sandbox', 'workspace-write',
      '-c', 'approval_policy="never"',
      '--cd', workspaceRoot,
      '--json',
      '--skip-git-repo-check',
      '-'
    ];

    if (process.platform === 'win32') {
      command = 'node';
      const codexPath = process.env.APPDATA ? `${process.env.APPDATA}\\npm\\node_modules\\@openai\\codex\\bin\\codex.js` : 'C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\@openai\\codex\\bin\\codex.js';
      args = [
        codexPath,
        'exec',
        '--sandbox', 'workspace-write',
        '-c', 'approval_policy="never"',
        '--cd', workspaceRoot,
        '--json',
        '--skip-git-repo-check',
        '-'
      ];
    }

    const customEnv = { ...process.env };
    // API-key fallback is explicitly disallowed: this adapter relies on the
    // ChatGPT subscription OAuth session already established via `codex login`.
    delete customEnv.OPENAI_API_KEY;
    delete customEnv.CODEX_API_KEY;

    return {
      command,
      args,
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
      // terminal handler - before any `await` - otherwise a second event that
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

      // Prompt is delivered exclusively via stdin, then EOF-terminated.
      // It is never interpolated into argv (avoids arg-injection surface).
      child.stdin?.write(task.instructions);
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
        if (!claimTerminal()) return;
        const durationMs = Date.now() - startTime;

        // Strict terminal precedence. A null/undefined exit code is NEVER
        // coerced to 0, so a signal-only close can never become SUCCESS.
        const classification = classifyWorkerTerminal({
          cancelRequested: this.cancelledRuns.has(runId),
          timedOut: isTimedOut,
          spawnError: null,
          exitCode,
          signal
        });
        const diagnostics = formatTerminalDiagnostics(classification);
        const code = classification.exitCode;

        if (classification.status === 'CANCELLED' || classification.status === 'TIMEOUT') {
          const isTimeout = classification.status === 'TIMEOUT';
          return settle({
            workerId: this.id,
            taskId,
            runId,
            executionId,
            status: classification.status,
            summary: isTimeout
              ? `Execution timed out after ${timeoutMs}ms`
              : 'Execution cancelled by caller.',
            changedFiles: [],
            createdFiles: [],
            deletedFiles: [],
            artifacts: [],
            patchPath: '',
            stdoutSummary: stdout.substring(0, 1000),
            stderrSummary: stderr.substring(0, 1000),
            exitCode: -1,
            durationMs,
            warnings: isTimeout
              ? ['TIMEOUT_EXCEEDED', ...CODEX_SANDBOX_DIAGNOSTICS, ...diagnostics]
              : [...CODEX_SANDBOX_DIAGNOSTICS, ...diagnostics],
            errors: [isTimeout
              ? 'CODEX_TIMED_OUT: Process killed due to execution timeout. No automatic dangerous-mode retry was attempted.'
              : 'CODEX_CANCELLED: Process terminated via cancel(). No automatic dangerous-mode retry was attempted.'],
            terminalReason: classification.reason,
            terminalSignal: classification.diagnostics.signal
          });
        }

        await this.normalizeResult(stdout, stderr, code, workspaceRoot);

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
          ? 'Codex CLI task completed successfully.'
          : `Task failed with exit code ${code}.`;

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
          exitCode: code,
          durationMs,
          warnings: [...CODEX_SANDBOX_DIAGNOSTICS, ...diagnostics],
          errors: classification.status === 'FAILED'
            ? [classifyCodexFailure(stderr, classification.reason)]
            : [],
          terminalReason: classification.reason,
          terminalSignal: classification.diagnostics.signal
        });
      });

      child.on('error', (err: Error) => {
        if (!claimTerminal()) return;
        const durationMs = Date.now() - startTime;
        // Spawn/process error is terminal on its own and always FAILED.
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
          warnings: [...CODEX_SANDBOX_DIAGNOSTICS, ...formatTerminalDiagnostics(classification)],
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
