import { WorkerAdapter, WorkerHealth, WorkerCapabilities, TaskPayload, ExecutionPlan, NormalizedResult, WorkerResult, ModelProfile } from '../types';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export const ALLOWED_ANTIGRAVITY_MODELS = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-1.5-pro'
] as const;

export const DEFAULT_ANTIGRAVITY_MODEL = 'gemini-2.5-pro';

export const MODEL_PROFILE_MAP: Record<ModelProfile, string> = {
  FAST: 'gemini-2.5-flash',
  BALANCED: 'gemini-2.5-flash',
  DEEP_REASONING: 'gemini-2.5-pro',
  CODE_REVIEW: 'gemini-2.5-pro'
};

export class AntigravityWorkerAdapter implements WorkerAdapter {
  id = 'ANTIGRAVITY_CLI';
  displayName = 'Antigravity Official CLI';

  private activeProcesses: Map<string, child_process.ChildProcess> = new Map();

  /**
   * Discover executable path locally via trusted discovery.
   * NEVER trust executable path passed in task payload.
   * Rejects non-official / fake wrappers.
   */
  public resolveExecutablePath(): string | null {
    const officialPath = path.normalize('C:\\Users\\Admin\\AppData\\Local\\agy\\bin\\agy.exe');
    if (fs.existsSync(officialPath)) {
      return officialPath;
    }

    try {
      const output = child_process.execSync('where.exe agy', { stdio: 'pipe' }).toString();
      const lines = output.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        const norm = path.normalize(line).toLowerCase();
        if (norm.includes('appdata\\local\\agy\\bin') && norm.endsWith('agy.exe')) {
          return line;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  async healthCheck(): Promise<WorkerHealth> {
    const execPath = this.resolveExecutablePath();
    if (!execPath) {
      return {
        status: 'UNAVAILABLE',
        errorMessage: 'Official agy CLI executable not found in system PATH.'
      };
    }

    try {
      const versionStr = child_process.execSync(`"${execPath}" --version`, { stdio: 'pipe' }).toString().trim();
      
      // Perform non-interactive probe in temporary isolated workspace
      const tempProbeDir = path.join('D:\\JARVIS_WORKSPACES', 'phase05-e2e', 'antigravity-auth-check');
      if (!fs.existsSync(tempProbeDir)) {
        fs.mkdirSync(tempProbeDir, { recursive: true });
      }

      const probeOutput = child_process.execSync(`"${execPath}" -p "Reply exactly ANTIGRAVITY_AUTH_OK. Do not create or modify files."`, {
        cwd: tempProbeDir,
        stdio: 'pipe'
      }).toString().trim();

      if (probeOutput.includes('ANTIGRAVITY_AUTH_OK')) {
        return {
          status: 'ONLINE',
          version: versionStr
        };
      } else {
        return {
          status: 'BLOCKED_BY_AUTH',
          version: versionStr,
          errorMessage: 'Headless auth probe failed to return ANTIGRAVITY_AUTH_OK.'
        };
      }
    } catch (e: any) {
      return {
        status: 'OFFLINE',
        errorMessage: e.message || 'Error running agy health check probe.'
      };
    }
  }

  async availability(): Promise<{ available: boolean; reason?: string }> {
    const health = await this.healthCheck();
    return {
      available: health.status === 'ONLINE',
      reason: health.errorMessage
    };
  }

  async capabilities(): Promise<WorkerCapabilities> {
    return {
      FILES_READ: true,
      FILES_CREATE: false,
      FILES_MODIFY: false,
      ARTIFACT_CREATE: true,
      GIT_READ: true,
      PROCESS_RUN_TESTS: false,
      TASK_PACKAGE_CREATE: true,
      PROMPT_PACKAGE_CREATE: true,
      PATCH_IMPORT: true,
      ARTIFACT_IMPORT: true,
      MANUAL_REVIEW_REQUIRED: false
    };
  }

  validateTask(task: TaskPayload): { valid: boolean; reason?: string; policy?: string; requiredCapability?: string } {
    if (!task.instructions || task.instructions.trim().length === 0) {
      return { valid: false, reason: 'Task instructions cannot be empty.' };
    }

    if (task.executablePath) {
      return { valid: false, reason: 'Security Violation: Task payload cannot specify executablePath.' };
    }

    if (task.customFlags && task.customFlags.length > 0) {
      return { valid: false, reason: 'Security Violation: Task payload cannot specify arbitrary CLI flags.' };
    }

    if (task.requiresFilesystemWrite || task.requiresCommandExecution) {
      return { 
        valid: false, 
        reason: 'WORKER_CAPABILITY_DENIED',
        policy: 'READ_ONLY_FAIL_CLOSED',
        requiredCapability: task.requiresFilesystemWrite ? 'FILESYSTEM_WRITE' : 'COMMAND_EXECUTION'
      };
    }

    return { valid: true };
  }

  public resolveModel(profile?: ModelProfile): string {
    if (profile && MODEL_PROFILE_MAP[profile]) {
      const mappedModel = MODEL_PROFILE_MAP[profile];
      if (ALLOWED_ANTIGRAVITY_MODELS.includes(mappedModel as any)) {
        return mappedModel;
      }
    }
    return DEFAULT_ANTIGRAVITY_MODEL;
  }

  async prepareExecutionPlan(task: TaskPayload, workspaceRoot: string): Promise<ExecutionPlan> {
    const validation = this.validateTask(task);
    if (!validation.valid) {
      if (validation.reason === 'WORKER_CAPABILITY_DENIED') {
        throw new Error(validation.reason); // We will catch this in execute or it gets caught by orchestrator. But wait, if execute() calls validateTask directly, we can avoid this.
      }
      throw new Error(`Invalid Task Payload: ${validation.reason}`);
    }

    const execPath = this.resolveExecutablePath();
    if (!execPath) {
      throw new Error('Antigravity CLI (agy) executable not found.');
    }

    // Prevent main repo execution
    const normalizedRoot = path.normalize(workspaceRoot).toLowerCase();
    if (normalizedRoot.includes('d:\\агент\\джарвис') && !normalizedRoot.includes('jarvis_workspaces')) {
      throw new Error('Security Violation: Antigravity Worker cannot be executed directly in main project repository.');
    }

    const agyArgs = ['--add-dir', workspaceRoot, '--mode', 'plan', '-p', task.instructions];

    return {
      command: execPath,
      args: agyArgs,
      cwd: workspaceRoot,
      shell: false,
      env: {
        NODE_ENV: process.env.NODE_ENV || 'production',
        PATH: process.env.PATH || ''
      }
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

    const validation = this.validateTask(task);
    if (!validation.valid && validation.reason === 'WORKER_CAPABILITY_DENIED') {
      return {
        workerId: this.id,
        taskId,
        runId,
        executionId,
        status: 'BLOCKED_BY_CAPABILITY_POLICY',
        summary: `Task blocked by policy ${validation.policy}. Required capability: ${validation.requiredCapability}. Safe alternatives: CODEX, CLAUDE_CODE`,
        changedFiles: [],
        createdFiles: [],
        deletedFiles: [],
        artifacts: [],
        patchPath: '',
        stdoutSummary: '',
        stderrSummary: `Denied by policy ${validation.policy}`,
        exitCode: -1,
        durationMs: 0,
        warnings: [],
        errors: ['WORKER_CAPABILITY_DENIED']
      };
    }

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

      child.on('close', async (exitCode: number | null, signal: string | null) => {
        clearTimeout(timer);
        this.activeProcesses.delete(runId);
        const durationMs = Date.now() - startTime;
        let code = exitCode ?? 0;
        if (exitCode === null && signal) {
          code = -1;
        }

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

        // Dynamically discover created files in workspaceRoot
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

        let status: 'SUCCESS' | 'FAILED' | 'TIMEOUT' | 'CANCELLED' | 'BLOCKED_BY_AUTH' = code === 0 ? 'SUCCESS' : 'FAILED';
        if (signal === 'SIGTERM') {
          status = 'CANCELLED';
        }
        
        const summary = status === 'SUCCESS' ? 'Antigravity CLI task completed successfully.' 
          : (status === 'CANCELLED' ? 'Execution cancelled.' : `Task failed with exit code ${code}.`);

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
          patchPath: path.join(workspaceRoot, 'result.patch'),
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
    const patchPath = path.join(workspaceRoot, 'result.patch');
    let patchContent = '';

    if (fs.existsSync(patchPath)) {
      patchContent = fs.readFileSync(patchPath, 'utf-8');
    }

    return {
      exitCode,
      stdout: rawStdout,
      stderr: rawStderr,
      patch: {
        diffContent: patchContent,
        changedFiles: [],
        securityFlags: []
      }
    };
  }
}
