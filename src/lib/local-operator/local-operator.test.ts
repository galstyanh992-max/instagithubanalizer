import { describe, it, expect, beforeEach, vi } from "vitest";
import { classifyLocalCapability } from "./capability-classifier";
import { checkPathAllowed } from "./workspace-policy";
import { planLocalOperatorAction } from "./planner";
import { getLocalToolBridgePlan } from "./tool-bridge";
import { setBrainAdapter } from "@/lib/project-brain/project-brain-service";
import { InMemoryBrainAdapter } from "@/lib/project-brain/in-memory-adapter";

const brain = new InMemoryBrainAdapter();
beforeEach(() => { brain.reset(); setBrainAdapter(brain); vi.unstubAllEnvs(); });

describe("capability classifier", () => {
  it("classifies", () => {
    expect(classifyLocalCapability("покажи файлы проекта")).toBe("list_workspace");
    expect(classifyLocalCapability("открой preview")).toBe("open_preview");
    expect(classifyLocalCapability("вызови MCP tool")).toBe("mcp_tool_call");
    expect(classifyLocalCapability("через Desktop Commander открой файл")).toBe("desktop_commander_action");
  });
});

describe("workspace policy", () => {
  it("no workspace → not ok", () => {
    const r = checkPathAllowed(undefined, null);
    expect(r.ok).toBe(false);
  });
  it("path traversal denied", () => {
    const ws = { id: "d", name: "d", rootPath: "/tmp/ws", allowedOperations: [], requiresApprovalForWrite: true } as any;
    const r = checkPathAllowed("../../etc/passwd", ws);
    expect(r.ok).toBe(false);
  });
  it(".env read blocked", () => {
    const ws = { id: "d", name: "d", rootPath: "/tmp/ws", allowedOperations: [], requiresApprovalForWrite: true } as any;
    const r = checkPathAllowed(".env", ws);
    expect(r.ok).toBe(false);
  });
});

describe("planner", () => {
  const owner = { actorId: "u1", actorRole: "owner", actorSource: "web" as const };

  it("no workspace → local_agent_required", async () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "");
    const p = await planLocalOperatorAction({ text: "покажи файлы проекта", ...owner });
    expect(["local_agent_required", "blocked"]).toContain(p.status);
  });

  it("list workspace plan allowed (workspace configured)", async () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    const p = await planLocalOperatorAction({ text: "покажи файлы проекта", ...owner });
    expect(p.capability).toBe("list_workspace");
    expect(p.nextAction).not.toBe("deny");
  });

  it("read project file only inside workspace", async () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    const p = await planLocalOperatorAction({ text: "прочитай файл", requestedPath: "../../etc/passwd", ...owner });
    expect(p.nextAction).toBe("deny");
  });

  it("prepare_file_change requires approval", async () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    const p = await planLocalOperatorAction({ text: "измени файл", ...owner });
    expect(p.requiresApproval).toBe(true);
  });

  it("apply_file_change denies/critical for telegram", async () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    const p = await planLocalOperatorAction({ text: "примени изменение", actorId: "u1", actorRole: "owner", actorSource: "telegram" });
    expect(p.nextAction).toBe("deny");
  });

  it("open preview returns plan only", async () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    const p = await planLocalOperatorAction({ text: "открой preview", ...owner });
    expect(p.capability).toBe("open_preview");
    expect(p.plannedCommand).toBeTruthy();
  });

  it("run tests uses terminal guard", async () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    const p = await planLocalOperatorAction({ text: "запусти тесты", ...owner });
    expect(p.plannedCommand).toBe("npm test");
  });

  it("desktop commander → local_agent_required", async () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    const p = await planLocalOperatorAction({ text: "через Desktop Commander открой терминал", ...owner });
    expect(p.status).toBe("local_agent_required");
  });

  it("mcp tool call → local_agent_required", async () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    const p = await planLocalOperatorAction({ text: "вызови MCP tool", ...owner });
    expect(p.status).toBe("local_agent_required");
  });

  it("telegram source is stricter", async () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    const p = await planLocalOperatorAction({ text: "отредактируй файл config", actorId: "u1", actorRole: "owner", actorSource: "telegram" });
    expect(p.nextAction).toBe("deny");
  });

  it("brain failure does not break plan", async () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    setBrainAdapter({ save: async () => { throw new Error("down"); }, list: async () => [], search: async () => [] });
    const p = await planLocalOperatorAction({ text: "покажи файлы проекта", ...owner });
    expect(p.capability).toBe("list_workspace");
  });
});

describe("tool bridge contract", () => {
  it("mcp/desktop commander never live", () => {
    expect(getLocalToolBridgePlan("mcp").status).toBe("not_configured");
    expect(getLocalToolBridgePlan("desktop_commander").requiresUserInstall).toBe(true);
  });
});

describe("command router local_operator", () => {
  it("returns plan via router", async () => {
    setBrainAdapter(brain);
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    const { routeCommand } = await import("@/lib/command-router/router");
    const r = await routeCommand({ text: "покажи файлы проекта", actor: { id: "u1", role: "owner", source: "web" }, source: "web" });
    expect(r.intent).toBe("local_operator");
    expect((r.data as any)?.plan).toBeTruthy();
  });
});
