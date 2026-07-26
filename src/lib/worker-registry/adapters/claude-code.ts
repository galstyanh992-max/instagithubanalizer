import { WorkerAdapter, WorkerHealth, WorkerCapabilities, TaskPayload, ExecutionPlan, NormalizedResult, WorkerResult } from '../types';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export class ClaudeCodeWorkerAdapter implements WorkerAdapter {
  id = 'claude_code';
  displayName = 'Claude Code CLI';

  private activeProcesses: Map<string, child_process.ChildProcess> = new Map();

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

      const child = this.spawnProcess(plan.command, plan.args, {
        cwd: plan.cwd,
        shell: false,
        env: plan.env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      child.stdin?.end();

      this.activeProcesses.set(runId, child);

      const timer = setTimeout(() => {
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

      child.on('close', async (exitCode: number | null) => {
        clearTimeout(timer);
        this.activeProcesses.delete(runId);
        const durationMs = Date.now() - startTime;
        const code = exitCode ?? 0;

        if (isTimedOut) {
          return resolve({
            workerId: this.id,
            taskId,
            runId,
            executionId,
            status: 'TIMEOUT',
            summary: `Execution timed out after ${timeoutMs}ms`,
            changedFiles: [],
            createdFiles: [],
            deletedFiles: [],
            artifacts: [],
            patchPath: '',
            stdoutSummary: stdout.substring(0, 1000),
            stderrSummary: stderr.substring(0, 1000),
            exitCode: -1,
            durationMs,
            warnings: ['TIMEOUT_EXCEEDED'],
            errors: ['Process killed due to execution timeout.']
          });
        }

        const normalized = await this.normalizeResult(stdout, stderr, code, workspaceRoot);

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

        const status = code === 0 ? 'SUCCESS' : 'FAILED';
        const summary = status === 'SUCCESS' ? 'Claude Code CLI task completed successfully.' : `Task failed with exit code ${code}.`;

        resolve({
          workerId: this.id,
          taskId,
          runId,
          executionId,
          status,
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
          warnings: [],
          errors: code !== 0 ? [stderr || 'Non-zero exit code returned'] : []
        });
      });

      child.on('error', (err: Error) => {
        clearTimeout(timer);
        this.activeProcesses.delete(runId);
        const durationMs = Date.now() - startTime;
        resolve({
          workerId: this.id,
          taskId,
          runId,
          executionId,
          status: 'FAILED',
          summary: `Failed to spawn process: ${err.message}`,
          changedFiles: [],
          createdFiles: [],
          deletedFiles: [],
          artifacts: [],
          patchPath: '',
          stdoutSummary: '',
          stderrSummary: err.message,
          exitCode: -1,
          durationMs,
          warnings: [],
          errors: [err.message]
        });
      });
    });
  }

  async cancel(runId: string): Promise<boolean> {
    const child = this.activeProcesses.get(runId);
    if (child) {
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
