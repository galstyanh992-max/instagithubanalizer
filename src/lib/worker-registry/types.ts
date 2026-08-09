export interface WorkerCapabilities {
  FILES_READ: boolean;
  FILES_CREATE: boolean;
  FILES_MODIFY: boolean;
  ARTIFACT_CREATE: boolean;
  GIT_READ: boolean;
  PROCESS_RUN_TESTS: boolean;
  TASK_PACKAGE_CREATE?: boolean;
  PROMPT_PACKAGE_CREATE?: boolean;
  PATCH_IMPORT?: boolean;
  ARTIFACT_IMPORT?: boolean;
  MANUAL_REVIEW_REQUIRED?: boolean;
}

export interface WorkerHealth {
  status: 'ONLINE' | 'OFFLINE' | 'UNAVAILABLE' | 'BLOCKED_BY_AUTH';
  version?: string;
  errorMessage?: string;
}

export type ModelProfile = 'FAST' | 'BALANCED' | 'DEEP_REASONING' | 'CODE_REVIEW';

export interface TaskPayload {
  taskId: string;
  runId: string;
  projectId?: string;
  projectRoot: string;
  instructions: string;
  files: string[];
  requestedProfile?: ModelProfile;
  executablePath?: string; // Must be ignored / validated against allowlist
  customFlags?: string[]; // Must be denied / ignored
  requiresFilesystemWrite?: boolean;
  requiresCommandExecution?: boolean;
}

export interface ExecutionPlan {
  command: string;
  args: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  shell?: boolean;
  fingerprint?: string;
  // Antigravity explicit model routing diagnostics (owner-approved, verified CLI values).
  modelProfile?: 'primary' | 'fast';
  modelLabel?: string;
  modelCliValue?: string;
}

export interface NormalizedPatch {
  diffContent: string;
  changedFiles: string[];
  securityFlags: string[];
}

export interface NormalizedResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  patch?: NormalizedPatch;
}

export interface WorkerResult {
  workerId: string;
  taskId: string;
  runId: string;
  executionId: string;
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'TIMEOUT' | 'BLOCKED_BY_AUTH' | 'BLOCKED_BY_CAPABILITY_POLICY';
  summary: string;
  changedFiles: string[];
  createdFiles: string[];
  deletedFiles: string[];
  artifacts: string[];
  patchPath: string;
  stdoutSummary: string;
  stderrSummary: string;
  exitCode: number;
  durationMs: number;
  warnings: string[];
  errors: string[];
  // Terminal-state classification reason (non-secret). Explains why a run
  // reached its terminal status, with strict precedence:
  // CANCELLED > TIMED_OUT > FAILED(spawn/no-exit-code/non-zero) > SUCCESS(exit 0).
  terminalReason?: string;
  // Raw terminal signal reported by the OS on close (non-secret, diagnostics only).
  terminalSignal?: string | null;
  // Antigravity explicit model routing diagnostics (non-secret).
  modelProfile?: 'primary' | 'fast';
  modelLabel?: string;
  modelCliValue?: string;
  modelSelection?: 'explicit-cli-argument';
  internalDefaultAllowed?: boolean;
  modelFallbackUsed?: boolean;
  permissionPolicy?: 'READ_ONLY_FAIL_CLOSED';
  writeCapability?: 'disabled';
  commandExecutionCapability?: 'disabled';
  dangerousPermissionsUsed?: boolean;
}

export interface WorkerAdapter {
  id: string;
  displayName: string;
  healthCheck(): Promise<WorkerHealth>;
  capabilities(): Promise<WorkerCapabilities>;
  availability?(): Promise<{ available: boolean; reason?: string }>;
  validateTask?(task: TaskPayload): { valid: boolean; reason?: string };
  prepareExecutionPlan(task: TaskPayload, workspaceRoot: string): Promise<ExecutionPlan>;
  execute?(task: TaskPayload, workspaceRoot: string, options?: { timeoutMs?: number }): Promise<WorkerResult>;
  cancel?(runId: string): Promise<boolean>;
  normalizeResult(rawStdout: string, rawStderr: string, exitCode: number, workspaceRoot: string): Promise<NormalizedResult>;
}

// ─── Worker Terminal-State Precedence Contract ────────────
// Single source of truth for how a CLI worker run is classified at process
// termination. Guarantees that SUCCESS is reachable ONLY when the process
// really exited with exit code strictly 0 AND no cancellation, timeout, or
// spawn error occurred. Null/undefined exit code is NEVER coerced to 0.
//
// Precedence (first match wins):
//   1. CANCELLED  — owner/caller requested cancellation before close.
//   2. TIMED_OUT  — the execution timeout fired.
//   3. FAILED     — a spawn/process error occurred.
//   4. FAILED     — exit code is null/undefined (no confirmed exit code).
//   5. FAILED     — exit code is non-zero.
//   6. SUCCESS    — exit code is strictly 0.
export interface WorkerTerminalContext {
  cancelRequested: boolean;
  timedOut: boolean;
  spawnError?: Error | null;
  exitCode: number | null | undefined;
  signal: NodeJS.Signals | string | null | undefined;
}

export type WorkerTerminalReason =
  | 'CANCELLED_BY_OWNER'
  | 'TIMED_OUT'
  | 'SPAWN_ERROR'
  | 'NO_EXIT_CODE'
  | 'NON_ZERO_EXIT_CODE'
  | 'EXIT_CODE_ZERO';

export interface WorkerTerminalClassification {
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'TIMEOUT';
  reason: WorkerTerminalReason;
  exitCode: number; // -1 for cancel/timeout/spawn-error/no-exit-code; the real code otherwise
  // Non-secret structured diagnostics for audit logs.
  diagnostics: {
    terminalReason: WorkerTerminalReason;
    exitCode: number | null;
    signal: string | null;
    cancelRequested: boolean;
    timedOut: boolean;
    spawnError: boolean;
  };
}

export function classifyWorkerTerminal(ctx: WorkerTerminalContext): WorkerTerminalClassification {
  // Normalize: `undefined` is treated exactly like `null` — an ABSENT exit
  // code. It is NEVER coerced to 0.
  const rawExitCode: number | null =
    typeof ctx.exitCode === 'number' && Number.isFinite(ctx.exitCode) ? ctx.exitCode : null;
  const rawSignal: string | null = ctx.signal ?? null;

  const build = (
    status: WorkerTerminalClassification['status'],
    reason: WorkerTerminalReason,
    exitCode: number
  ): WorkerTerminalClassification => ({
    status,
    reason,
    exitCode,
    diagnostics: {
      terminalReason: reason,
      exitCode: rawExitCode,
      signal: rawSignal,
      cancelRequested: ctx.cancelRequested === true,
      timedOut: ctx.timedOut === true,
      spawnError: Boolean(ctx.spawnError)
    }
  });

  // 1. Cancellation always wins.
  if (ctx.cancelRequested === true) {
    return build('CANCELLED', 'CANCELLED_BY_OWNER', -1);
  }
  // 2. Timeout.
  if (ctx.timedOut === true) {
    return build('TIMEOUT', 'TIMED_OUT', -1);
  }
  // 3. Spawn / process error.
  if (ctx.spawnError) {
    return build('FAILED', 'SPAWN_ERROR', -1);
  }
  // 4. No confirmed exit code (includes signal-only close). NEVER success.
  if (rawExitCode === null) {
    return build('FAILED', 'NO_EXIT_CODE', -1);
  }
  // 5. Non-zero exit.
  if (rawExitCode !== 0) {
    return build('FAILED', 'NON_ZERO_EXIT_CODE', rawExitCode);
  }
  // 6. Strict exit code 0 — the ONLY path to SUCCESS.
  return build('SUCCESS', 'EXIT_CODE_ZERO', 0);
}

/**
 * Renders the non-secret structured diagnostics of a terminal classification
 * as flat `key=value` strings suitable for WorkerResult.warnings.
 * Contains no credentials, tokens, env values, or command arguments.
 */
export function formatTerminalDiagnostics(
  classification: WorkerTerminalClassification
): string[] {
  const d = classification.diagnostics;
  return [
    `terminalReason=${d.terminalReason}`,
    `exitCode=${d.exitCode === null ? 'null' : d.exitCode}`,
    `signal=${d.signal === null ? 'null' : d.signal}`,
    `cancelRequested=${d.cancelRequested}`,
    `timedOut=${d.timedOut}`
  ];
}
