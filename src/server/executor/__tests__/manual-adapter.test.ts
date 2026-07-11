import { describe, it, expect, vi } from "vitest";
import { ManualAdapter } from "../manual-adapter";
import { JarvisTask } from "../types";
import * as tasks from "../../local-control/tasks";

// Mock the tasks filesystem logic
vi.mock("../../local-control/tasks", () => ({
  readTaskFile: vi.fn(),
  writeTaskFile: vi.fn(),
}));

describe("ManualAdapter", () => {
  const adapter = new ManualAdapter();
  
  it("prepares by moving status to prepared", async () => {
    const task: JarvisTask = {
      taskId: "123",
      projectId: "p1",
      repoPath: "/mock/repo",
      mode: "IMPLEMENTATION",
      executor: "manual",
      status: "draft",
      promptPath: "prompt.md",
      createdAt: "",
      updatedAt: ""
    };

    vi.mocked(tasks.readTaskFile).mockResolvedValue("Existing prompt");
    
    await adapter.prepare(task);
    expect(task.status).toBe("prepared");
  });

  it("collects report correctly", async () => {
    const task: JarvisTask = {
      taskId: "123",
      projectId: "p1",
      repoPath: "/mock/repo",
      mode: "IMPLEMENTATION",
      executor: "manual",
      status: "awaiting_manual_report",
      promptPath: "prompt.md",
      createdAt: "",
      updatedAt: ""
    };

    vi.mocked(tasks.readTaskFile).mockResolvedValue("Manual user output");
    const report = await adapter.collectReport(task);
    expect(report.stdout).toBe("Manual user output");
  });
});
