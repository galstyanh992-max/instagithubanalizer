import { describe, it, expect, vi } from "vitest";
import { CodexCliAdapter } from "../codex-cli-adapter";
import { JarvisTask } from "../types";
import * as sandbox from "../../local-control/sandbox";

vi.mock("@/lib/ai-provider/codex-subscription", () => ({
  codexSubscriptionProvider: {
    id: "codex-chatgpt-subscription",
    startThread: vi.fn().mockResolvedValue({ threadId: "thread-1" }),
    startTurn: vi.fn().mockResolvedValue({ turnId: "turn-1", status: "inProgress" }),
    cancelTurn: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock dependencies
vi.mock("../../local-control/command-runner", () => ({
  runAllowedCommand: vi.fn().mockResolvedValue({ exitCode: 0, stdout: "Success", stderr: "" }),
}));

vi.mock("../../local-control/tasks", () => ({
  readTaskFile: vi.fn().mockResolvedValue("Mock content"),
  writeTaskFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../local-control/sandbox", () => ({
  assertPathAllowed: vi.fn(),
}));

describe("CodexCliAdapter", () => {
  const adapter = new CodexCliAdapter();
  
  const baseTask: JarvisTask = {
    taskId: "456",
    projectId: "p1",
    repoPath: "/mock/repo",
    mode: "IMPLEMENTATION",
    executor: "codex_cli",
    status: "draft",
    promptPath: "prompt.md",
    createdAt: "",
    updatedAt: ""
  };

  it("prepare asserts path bounds", async () => {
    await adapter.prepare(baseTask);
    expect(sandbox.assertPathAllowed).toHaveBeenCalledWith(baseTask.repoPath, baseTask.repoPath);
  });

  it("run requires approvalId", async () => {
    const result = await adapter.run({ ...baseTask, approvalId: undefined });
    expect(result.success).toBe(false);
    expect(result.message).toContain("requires approvalId");
  });

  it("run succeeds with approvalId", async () => {
    const result = await adapter.run({ ...baseTask, approvalId: "mock-approval-123" });
    expect(result.success).toBe(true);
    expect(result.message).toContain("turn-1");
  });
});
