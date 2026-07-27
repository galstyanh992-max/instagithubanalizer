import { WorkerAdapter, WorkerHealth, WorkerCapabilities, TaskPayload, ExecutionPlan, NormalizedResult, WorkerResult, ModelProfile } from '../types';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Owner-approved Antigravity models (verified against local agy.exe 1.1.7).
 *
 * PRIMARY = Gemini 3.1 Pro  -> gemini-3.1-pro-high
 * FAST    = Gemini 3.6 Flash -> gemini-3.6-flash-medium
 *
 * No stale 2.5 models. No internal default model. No API IDs. No silent
 * fallback. Every value here was accepted by the local CLI via
 * `--model <value>` and returned the expected verification token.
 */
export type AntigravityModelTier = 'primary' | 'fast';

export interface AntigravityModelEntry {
  label: string;
  cliValue: string;
}

export const ANTIGRAVITY_MODEL_CONFIG: Record<AntigravityModelTier, AntigravityModelEntry> = {
  primary: {
    label: 'Gemini 3.1 Pro',
    cliValue: 'gemini-3.1-pro-high'
  },
  fast: {
    label: 'Gemini 3.6 Flash',
    cliValue: 'gemini-3.6-flash-medium'
  }
};

export const ALLOWED_ANTIGRAVITY_MODELS = [
  ANTIGRAVITY_MODEL_CONFIG.primary.cliValue,
  ANTIGRAVITY_MODEL_CONFIG.fast.cliValue
] as const;

/**
 * Maps a worker ModelProfile to an owner-approved model tier.
 * DEEP_REASONING/CODE_REVIEW -> primary (Gemini 3.1 Pro).
 * FAST/BALANCED -> fast (Gemini 3.6 Flash).
 */
export const MODEL_PROFILE_MAP: Record<ModelProfile, AntigravityModelTier> = {
  FAST: 'fast',
  BALANCED: 'fast',
  DEEP_REASONING: 'primary',
  CODE_REVIEW: 'primary'
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

  /**
   * Build a minimal, secret-free environment for spawning agy.exe.
   * Only non-secret OS locator variables are forwarded so the CLI can find its
   * config/OAuth store. Credentials, API keys, service-role keys, tokens and
   * project secrets are never forwarded.
   */
  private buildSafeEnv(): NodeJS.ProcessEnv {
    const SAFE_ENV_KEYS = [
      'PATH',
      'USERPROFILE',
      'HOMEDRIVE',
      'HOMEPATH',
      'LOCALAPPDATA',
      'APPDATA',
      'SystemRoot',
      'TEMP',
      'TMP',
      'ComSpec',
      'OS',
      'PATHEXT'
    ];
    const env: NodeJS.ProcessEnv = {
      NODE_ENV: process.env.NODE_ENV || 'production'
    };
    for (const key of SAFE_ENV_KEYS) {
      if (process.env[key] !== undefined && process.env[key] !== '') {
        env[key] = process.env[key];
      }
    }
    return env;
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
      
      // Perform non-interactive probe in temporary isolated workspace.
      // Explicit --model is always passed: Antigravity is never launched without it.
      const tempProbeDir = path.join('D:\\JARVIS_WORKSPACES', 'phase05-e2e', 'antigravity-auth-check');
      if (!fs.existsSync(tempProbeDir)) {
        fs.mkdirSync(tempProbeDir, { recursive: true });
      }

      const probeOutput = child_process.execSync(
        `"${execPath}" --model "${ANTIGRAVITY_MODEL_CONFIG.primary.cliValue}" -p "Reply exactly ANTIGRAVITY_AUTH_OK. Do not create or modify files."`,
        { cwd: tempProbeDir, stdio: 'pipe' }
      ).toString().trim();

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

  /**
   * Resolve the owner-approved model descriptor for a profile.
   *
   * Fail closed for unknown / missing profile. NEVER returns an internal
   * default, undefined, a stale 2.5 model, or a substituted model. There is
   * no silent fallback: an unresolved profile throws before any spawn.
   */
  public resolveModelDescriptor(profile?: ModelProfile): {
    tier: AntigravityModelTier;
    label: string;
    cliValue: string;
  } {
    if (!profile) {
      throw new Error('ANTIGRAVITY_MODEL_PROFILE_UNKNOWN');
    }
    const tier = MODEL_PROFILE_MAP[profile];
    if (!tier) {
      throw new Error('ANTIGRAVITY_MODEL_PROFILE_UNKNOWN');
    }
    const entry = ANTIGRAVITY_MODEL_CONFIG[tier];
    if (!entry || !entry.cliValue) {
      throw new Error('ANTIGRAVITY_MODEL_NOT_CONFIGURED');
    }
    return { tier, label: entry.label, cliValue: entry.cliValue };
  }

  /**
   * Resolve the exact verified CLI model value for a profile.
   * Fail closed for unknown / missing profile. Never returns a default.
   */
  public resolveModel(profile?: ModelProfile): string {
    return this.resolveModelDescriptor(profile).cliValue;
  }

  async prepareExecutionPlan(task: TaskPayload, workspaceRoot: string): Promise<ExecutionPlan> {
    const validation = this.validateTask(task);
    if (!validation.valid) {
      if (validation.reason === 'WORKER_CAPABILITY_DENIED') {
        throw new Error(validation.reason);
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

    // Explicit model resolution. Fail closed BEFORE spawn for unknown/missing
    // profile. No silent fallback, no internal default model.
    const descriptor = this.resolveModelDescriptor(task.requestedProfile);

    // `--model <verified CLI value>` is always present in production args.
    // The model is passed as an array element, never as a shell string.
    const agyArgs = [
      '--add-dir',
      workspaceRoot,
      '--mode',
      'plan',
      '--model',
      descriptor.cliValue,
      '-p',
      task.instructions
    ];

    return {
      command: execPath,
      args: agyArgs,
      cwd: workspaceRoot,
      shell: false,
      env: this.buildSafeEnv(),
      modelProfile: descriptor.tier,
      modelLabel: descriptor.label,
      modelCliValue: descriptor.cliValue
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

    // Explicit model routing diagnostics attached to every executed result.
    const modelDiagnostics = {
      modelProfile: plan.modelProfile,
      modelLabel: plan.modelLabel,
      modelCliValue: plan.modelCliValue,
      modelSelection: 'explicit-cli-argument' as const,
      internalDefaultAllowed: false,
      modelFallbackUsed: false,
      permissionPolicy: 'READ_ONLY_FAIL_CLOSED' as const,
      writeCapability: 'disabled' as const,
      commandExecutionCapability: 'disabled' as const,
      dangerousPermissionsUsed: false
    };

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
            errors: ['Process killed due to execution timeout.'],
            ...modelDiagnostics
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
          errors: code !== 0 ? [stderr || 'Non-zero exit code returned'] : [],
          ...modelDiagnostics
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
          errors: [err.message],
          ...modelDiagnostics
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
