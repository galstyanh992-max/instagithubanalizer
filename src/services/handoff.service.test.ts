import { expect, test, vi, beforeEach, afterEach } from "vitest";
import { handoffService } from "./handoff.service";
import { db } from "@/lib/db";

// Minimal mock setup for the DB since this is a unit test.
vi.mock("@/lib/db", () => ({
  db: {
    department: {
      findUnique: vi.fn(),
    },
    handoffRecord: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
});

test("createHandoff should throw if department not found", async () => {
  (db.department.findUnique as any).mockResolvedValue(null);

  await expect(
    handoffService.createHandoff({
      workspaceId: "ws1",
      fromDepartment: "depA",
      toDepartment: "depB",
      triggerEvent: "event",
    })
  ).rejects.toThrow("Source department 'depA' not found");
});

test("createHandoff should create pending handoff", async () => {
  (db.department.findUnique as any).mockResolvedValue({ key: "depA" });
  (db.handoffRecord.create as any).mockResolvedValue({ id: "h1", status: "pending" });

  const result = await handoffService.createHandoff({
    workspaceId: "ws1",
    fromDepartment: "depA",
    toDepartment: "depB",
    triggerEvent: "event",
  });

  expect(result.status).toBe("pending");
  expect(db.handoffRecord.create).toHaveBeenCalled();
});

test("acceptHandoff should transition from pending to in_progress", async () => {
  (db.handoffRecord.findUnique as any).mockResolvedValue({ id: "h1", status: "pending" });
  (db.handoffRecord.update as any).mockResolvedValue({ id: "h1", status: "in_progress" });

  const result = await handoffService.acceptHandoff("h1", { agentId: "agent1" });

  expect(result.status).toBe("in_progress");
  expect(db.handoffRecord.update).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ status: "in_progress", receivingAgentId: "agent1" }),
    })
  );
});

test("acceptHandoff should throw if not pending", async () => {
  (db.handoffRecord.findUnique as any).mockResolvedValue({ id: "h1", status: "completed" });

  await expect(handoffService.acceptHandoff("h1", {})).rejects.toThrow(
    "Cannot accept handoff in status 'completed'. Expected 'pending'."
  );
});

test("resolveHandoff should transition from in_progress to completed", async () => {
  (db.handoffRecord.findUnique as any).mockResolvedValue({ id: "h1", status: "in_progress" });
  (db.handoffRecord.update as any).mockResolvedValue({ id: "h1", status: "completed" });

  const result = await handoffService.resolveHandoff("h1", {
    agentId: "agent1",
    resolution: { status: "completed" },
  });

  expect(result.status).toBe("completed");
});
