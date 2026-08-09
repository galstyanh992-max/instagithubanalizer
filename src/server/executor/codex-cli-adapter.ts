import { ExecutorAdapter, JarvisTask, ExecutionResult, ExecutionReport } from "./types";
import { writeTaskFile, readTaskFile } from "../local-control/tasks";
import { assertPathAllowed } from "../local-control/sandbox";
import { codexSubscriptionProvider } from "@/lib/ai-provider/codex-subscription";

export class CodexCliAdapter implements ExecutorAdapter {
  name = "codex_cli";
  private readonly running = new Map<string, { threadId: string; turnId: string }>();

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
      const prompt = await readTaskFile(task.taskId, task.repoPath, "prompt.md");
      const thread = await codexSubscriptionProvider.startThread({
        cwd: task.repoPath,
        sandbox: "workspace-write",
      });
      const turn = await codexSubscriptionProvider.startTurn(thread.threadId, prompt);
      this.running.set(task.taskId, { threadId: thread.threadId, turnId: turn.turnId });
      await writeTaskFile(
        task.taskId,
        task.repoPath,
        "codex-execution.json",
        JSON.stringify({
          providerId: codexSubscriptionProvider.id,
          threadId: thread.threadId,
          turnId: turn.turnId,
          status: turn.status,
        }, null, 2),
      );
      return { success: true, message: `Codex turn ${turn.turnId} started` };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async collectReport(task: JarvisTask): Promise<ExecutionReport> {
    try {
      const content = await readTaskFile(task.taskId, task.repoPath, "codex-execution.json");
      return {
        taskId: task.taskId,
        filesChanged: [],
        stdout: content,
        stderr: ""
      };
    } catch (e: any) {
      throw new Error(`Failed to collect report: ${e.message}`);
    }
  }

  async stop(taskId: string): Promise<void> {
    const active = this.running.get(taskId);
    if (!active) return;
    await codexSubscriptionProvider.cancelTurn(active.threadId, active.turnId);
    this.running.delete(taskId);
  }
}
