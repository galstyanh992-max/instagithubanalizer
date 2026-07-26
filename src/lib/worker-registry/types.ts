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
