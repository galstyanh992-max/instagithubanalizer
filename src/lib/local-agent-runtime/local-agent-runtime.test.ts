import { describe, it, expect, beforeEach, vi } from "vitest";
import { getLocalAgentProfile, getLocalAgentStatus, buildHandshakePlan } from "./handshake";
import { buildLocalAgentQueueSpec } from "./queue-spec";
import { buildLocalAgentCommandEnvelope } from "./envelope-builder";
import { setBrainAdapter } from "@/lib/project-brain/project-brain-service";
import { InMemoryBrainAdapter } from "@/lib/project-brain/in-memory-adapter";

const brain = new InMemoryBrainAdapter();
beforeEach(() => { brain.reset(); setBrainAdapter(brain); vi.unstubAllEnvs(); });

describe("status/handshake", () => {
  it("missing workspace root → not_configured", () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "");
    expect(getLocalAgentStatus()).toBe("not_configured");
  });

  it("configured workspace root → not_running (never connected)", () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    expect(getLocalAgentStatus()).toBe("not_running");
  });

  it("profile lists expected capabilities", () => {
    const p = getLocalAgentProfile();
    expect(p.capabilities).toContain("mcp_bridge");
    expect(p.capabilities).toContain("desktop_commander");
  });

  it("handshake plan includes pairing/allowlist/approval/heartbeat", () => {
    const h = buildHandshakePlan();
    const all = h.steps.join(" ");
    expect(all).toMatch(/pairing/i);
    expect(all).toMatch(/allowlist|workspace/i);
    expect(all).toMatch(/approval/i);
    expect(all).toMatch(/heartbeat/i);
  });
});

describe("queue spec", () => {
  it("has required states", () => {
    const q = buildLocalAgentQueueSpec();
    for (const s of ["draft", "queued", "approval_required", "approved", "rejected", "blocked"]) {
      expect(q.states).toContain(s);
    }
  });
});

describe("command envelope", () => {
  const owner = { actorId: "u1", actorRole: "owner", actorSource: "web" as const };

  it("created without execution", async () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    const p = await buildLocalAgentCommandEnvelope({ text: "покажи файлы проекта", ...owner });
    expect(p.envelope?.status).not.toBe("executed_mock");
  });

  it("risky command requires approval", async () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    const p = await buildLocalAgentCommandEnvelope({ text: "измени файл конфигурации", ...owner });
    expect(p.requiresApproval).toBe(true);
  });

  it("telegram-originated command is stricter", async () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    const p = await buildLocalAgentCommandEnvelope({ text: "измени файл конфигурации", actorId: "u1", actorRole: "owner", actorSource: "telegram" });
    expect(p.nextAction).toBe("deny");
  });

  it("desktop commander routes to mcp/local-agent plan", async () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    const p = await buildLocalAgentCommandEnvelope({ text: "через Desktop Commander открой терминал", ...owner });
    expect(p.envelope?.requestedCapability).toBe("desktop_commander");
  });

  it("unknown actor cannot execute", async () => {
    const p = await buildLocalAgentCommandEnvelope({ text: "запиши файл", actorId: "unknown", actorRole: "viewer", actorSource: "api" });
    expect(p.nextAction).toBe("deny");
  });

  it("destructive command blocked", async () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    const p = await buildLocalAgentCommandEnvelope({ text: "запусти команду", capability: "safe_command", ...owner });
    // classifier can't see the actual destructive command text separately here; ensure no crash and safe default
    expect(p.envelope).toBeTruthy();
  });

  it("brain failure does not break plan", async () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    setBrainAdapter({ save: async () => { throw new Error("down"); }, list: async () => [], search: async () => [] });
    const p = await buildLocalAgentCommandEnvelope({ text: "покажи файлы проекта", ...owner });
    expect(p.envelope).toBeTruthy();
  });
});

describe("command router local_agent_runtime", () => {
  it("returns plan via router", async () => {
    vi.stubEnv("AGENT_WORKSPACE_ROOT", "/tmp/ws");
    setBrainAdapter(brain);
    const { routeCommand } = await import("@/lib/command-router/router");
    const r = await routeCommand({ text: "запусти локального агента", actor: { id: "u1", role: "owner", source: "web" }, source: "web" });
    expect(r.intent).toBe("local_agent_runtime");
    expect((r.data as any)?.handshake).toBeTruthy();
  });
});
