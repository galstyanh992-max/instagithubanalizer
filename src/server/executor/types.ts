export type JarvisTask = {
  taskId: string;
  projectId: string;
  repoPath: string;
  mode: "PRODUCT_BLUEPRINT" | "IMPLEMENTATION" | "REPAIR_LOOP" | "FINAL_AUDIT";
  executor: "codex_cli" | "codex_ide" | "manual";
  status: "draft" | "prepared" | "awaiting_approval" | "running" | "awaiting_manual_report" | "report_submitted" | "verification" | "needs_repair" | "done" | "blocked";
  promptPath: string;
  reportPath?: string;
  createdAt: string;
  updatedAt: string;
  approvalId?: string;
  iterationCount?: number;
};

export interface ExecutionResult {
  success: boolean;
  message?: string;
}

export interface ExecutionReport {
  taskId: string;
  filesChanged: string[];
  stdout: string;
  stderr: string;
}

export interface ExecutorAdapter {
  name: string;
  prepare(task: JarvisTask): Promise<void>;
  run(task: JarvisTask): Promise<ExecutionResult>;
  collectReport(task: JarvisTask): Promise<ExecutionReport>;
  stop(taskId: string): Promise<void>;
}
