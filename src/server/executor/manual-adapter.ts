import { ExecutorAdapter, JarvisTask, ExecutionResult, ExecutionReport } from "./types";
import { writeTaskFile, readTaskFile } from "../local-control/tasks";

export class ManualAdapter implements ExecutorAdapter {
  name = "manual";

  async prepare(task: JarvisTask): Promise<void> {
    if (!task.promptPath) {
      throw new Error("Task promptPath is required for manual adapter");
    }
    try {
      await readTaskFile(task.taskId, task.repoPath, "prompt.md");
    } catch {
      await writeTaskFile(task.taskId, task.repoPath, "prompt.md", "# Manual Prompt\nPlease execute this manually.");
    }
    
    task.status = "prepared";
  }

  async run(task: JarvisTask): Promise<ExecutionResult> {
    if (task.status !== "prepared" && task.status !== "awaiting_approval") {
      return { success: false, message: "Task must be prepared to run" };
    }
    
    // In manual mode, we literally do nothing but wait for the user to paste the result into report.md
    task.status = "awaiting_manual_report";
    return { success: true, message: "Awaiting manual execution. Please write report.md" };
  }

  async collectReport(task: JarvisTask): Promise<ExecutionReport> {
    if (task.status !== "awaiting_manual_report") {
      throw new Error("Cannot collect report unless awaiting_manual_report");
    }
    try {
      const content = await readTaskFile(task.taskId, task.repoPath, "report.md");
      task.status = "report_submitted";
      return {
        taskId: task.taskId,
        filesChanged: [], // Cannot reliably extract without diff in manual mode
        stdout: content,
        stderr: ""
      };
    } catch (e: any) {
      throw new Error(`Failed to collect manual report: ${e.message}`);
    }
  }

  async stop(taskId: string): Promise<void> {
    // No-op for manual adapter
  }
}
