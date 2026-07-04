import { describe, it, expect, beforeEach, vi } from "vitest";
import { getDefaultMcpBridgeProfiles } from "./profiles";
import { classifyBridgeKind, classifyCapability } from "./capability-classifier";
import { getMcpBridgeStatus } from "./handshake";
import { planMcpBridgeAction } from "./planner";
import { setBrainAdapter } from "@/lib/project-brain/project-brain-service";
import { InMemoryBrainAdapter } from "@/lib/project-brain/in-memory-adapter";

const brain = new InMemoryBrainAdapter();
beforeEach(() => { brain.reset(); setBrainAdapter(brain); vi.unstubAllEnvs(); });

describe("profiles", () => {
  it("default profiles never connected, local_agent_required/connection_planned", () => {
    const profiles = getDefaultMcpBridgeProfiles();
    for (const p of profiles) expect(["local_agent_required", "connection_planned"]).toContain(p.status);
  });
  it("desktop commander has expected capabilities", () => {
    const p = getDefaultMcpBridgeProfiles().find((x) => x.kind === "desktop_commander")!;
    expect(p.capabilities).toContain("terminal_command");
    expect(p.capabilities).toContain("screenshot");
  });
  it("mcp profile has mcp_tool_call", () => {
    const p = getDefaultMcpBridgeProfiles().find((x) => x.kind === "mcp")!;
    expect(p.capabilities).toContain("mcp_tool_call");
  });
});

describe("classifiers", () => {
  it("bridge kind", () => {
    expect(classifyBridgeKind("через Desktop Commander")).toBe("desktop_commander");
    expect(classifyBridgeKind("вызови MCP server")).toBe("mcp");
  });
  it("capability", () => {
    expect(classifyCapability("сделай скриншот")).toBe("screenshot");
    expect(classifyCapability("прочитай .env")).toBe("filesystem_read");
  });
});

describe("handshake/status", () => {
  it("desktop commander status local_agent_required, never connected", () => {
    const h = getMcpBridgeStatus("desktop_commander");
    expect(h.status).toBe("local_agent_required");
    expect(h.connected).toBe(false);
  });
});

describe("planner", () => {
  const owner = { actorId: "u1", actorRole: "owner", actorSource: "web" as const };

  it("filesystem_write requires approval", async () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    const p = await planMcpBridgeAction({ text: "запиши файл", ...owner });
    expect(p.requiresApproval).toBe(true);
  });

  it("terminal dangerous command denied", async () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    const p = await planMcpBridgeAction({ text: "выполни команду", command: "rm -rf /", ...owner });
    expect(p.nextAction).toBe("deny");
  });

  it(".env path denied", async () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    const p = await planMcpBridgeAction({ text: "прочитай .env", targetPath: ".env", ...owner });
    expect(p.nextAction).toBe("deny");
  });

  it("path traversal denied", async () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    const p = await planMcpBridgeAction({ text: "прочитай файл", capability: "filesystem_read", targetPath: "../../etc/passwd", ...owner });
    expect(p.nextAction).toBe("deny");
  });

  it("screenshot requires approval", async () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    const p = await planMcpBridgeAction({ text: "сделай скриншот", ...owner });
    expect(p.requiresApproval).toBe(true);
  });

  it("telegram source stricter (filesystem_write denied)", async () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    const p = await planMcpBridgeAction({ text: "запиши файл", actorId: "u1", actorRole: "owner", actorSource: "telegram" });
    expect(p.nextAction).toBe("deny");
  });

  it("unknown actor denied", async () => {
    const p = await planMcpBridgeAction({ text: "запиши файл", actorId: "unknown", actorRole: "viewer", actorSource: "api" });
    expect(p.nextAction).toBe("deny");
  });

  it("bridge action returns local_agent_required, never connected", async () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    const p = await planMcpBridgeAction({ text: "вызови mcp tool", bridgeKind: "mcp", capability: "mcp_tool_call", ...owner });
    expect(p.status).not.toBe("connected_mock");
  });

  it("brain failure does not break plan", async () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    setBrainAdapter({ save: async () => { throw new Error("down"); }, list: async () => [], search: async () => [] });
    const p = await planMcpBridgeAction({ text: "сделай скриншот", ...owner });
    expect(p.capability).toBe("screenshot");
  });
});

describe("local operator desktop commander uses mcp bridge plan", () => {
  it("routes through mcp bridge", async () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    setBrainAdapter(brain);
    const { planLocalOperatorAction } = await import("@/lib/local-operator/planner");
    const p = await planLocalOperatorAction({ text: "через Desktop Commander открой терминал", actorId: "u1", actorRole: "owner", actorSource: "web" });
    expect(p.status).toBe("local_agent_required");
    expect(p.steps.some((s) => /Bridge/i.test(s))).toBe(true);
  });
});

describe("mcp-bridge status API-level (no port check)", () => {
  it("status route content never claims connected", async () => {
    const { GET } = await import("@/app/api/mcp-bridge/status/route");
    const res = await GET(new Request("http://localhost/api/mcp-bridge/status"));
    const body = await res.json() as any;
    expect(body.connected).toBe(false);
  });
});
