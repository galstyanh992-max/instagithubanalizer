import { ExecutorAdapter, JarvisTask, ExecutionResult, ExecutionReport } from "./types";
import { runAllowedCommand } from "../local-control/command-runner";
import { writeTaskFile, readTaskFile } from "../local-control/tasks";
import { assertPathAllowed } from "../local-control/sandbox";

export class CodexCliAdapter implements ExecutorAdapter {
  name = "codex_cli";

  async prepare(task: JarvisTask): Promise<void> {
    assertPathAllowed(task.repoPath, task.repoPath); // Ensure sandbox exists

    // In a real scenario, this would prepare the CLI arguments
    try {
      await readTaskFile(task.taskId, task.repoPath, "prompt.md");
    } catch {
      throw new Error(`prompt.md not found for task ${task.taskId}`);
    }
  }

  async run(task: JarvisTask): Promise<ExecutionResult> {
    if (!task.approvalId) {
      return { success: false, message: "Codex CLI execution requires approvalId" };
    }

    try {
      // In a real scenario, Codex CLI would be an allowlisted command
      // However, for the sake of the prompt requirements "Codex is not allowed to run arbitrary shell commands on its own without going through the JARVIS Command Allowlist."
      // Since Codex CLI itself is an execution, we mock it via a dummy call or assume it's part of the allowlist
      
      // We will simulate it generating a report for now
      await writeTaskFile(task.taskId, task.repoPath, "report.md", "Simulated Codex CLI Execution Report.");
      
      return { success: true, message: "Codex CLI run completed" };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async collectReport(task: JarvisTask): Promise<ExecutionReport> {
    try {
      const content = await readTaskFile(task.taskId, task.repoPath, "report.md");
      return {
        taskId: task.taskId,
        filesChanged: ["unknown"], // In reality parsed from report
        stdout: content,
        stderr: ""
      };
    } catch (e: any) {
      throw new Error(`Failed to collect report: ${e.message}`);
    }
  }

  async stop(taskId: string): Promise<void> {
    // Kill running process logic here
  }
}
