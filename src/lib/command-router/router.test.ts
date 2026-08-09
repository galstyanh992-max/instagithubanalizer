import { describe, it, expect } from "vitest";
import { routeCommand } from "./router";
import { classifyIntent } from "./intent-classifier";
import { buildCommandApprovalPayload } from "./approval";
import type { SafetyActor } from "@/lib/safety/actor";

const owner: SafetyActor = { id: "u1", role: "owner", source: "web" };

function run(text: string, actor: SafetyActor = owner) {
  return routeCommand({ text, actor, source: "voice" });
}

describe("intent classifier", () => {
  it("classifies known intents", () => {
    expect(classifyIntent("поговори со мной")).toBe("conversation");
    expect(classifyIntent("открой dashboard")).toBe("open_page");
    expect(classifyIntent("проанализируй github репозиторий")).toBe("github_analysis");
    expect(classifyIntent("запусти npm test")).toBe("terminal_task");
    expect(classifyIntent("реализуй по этим промптам")).toBe("developer_task");
    expect(classifyIntent("проверь базу данных")).toBe("database_task");
    expect(classifyIntent("запомни это")).toBe("memory_task");
    expect(classifyIntent("создай агента")).toBe("agent_task");
    expect(classifyIntent("asdfghjkl")).toBe("unknown");
  });
});

describe("command router", () => {
  it("conversation → LOW allowed", async () => {
    const r = await run("поговори со мной");
    expect(r.intent).toBe("conversation");
    expect(r.allowed).toBe(true);
    expect(r.riskLevel).toBe("LOW");
  });

  it("open dashboard → LOW allowed with route target", async () => {
    const r = await run("открой dashboard");
    expect(r.allowed).toBe(true);
    expect(r.nextAction).toBe("execute_safe_action");
    expect(r.data?.path).toBe("/dashboard");
  });

  it("unknown actor → deny", async () => {
    const r = await run("открой dashboard", { id: "unknown", role: "viewer", source: "api" });
    expect(r.allowed).toBe(false);
    expect(r.nextAction).toBe("deny");
  });

  it("terminal command → requires approval", async () => {
    const r = await run("запусти git push origin main");
    expect(r.requiresApproval).toBe(true);
    expect(r.nextAction).toBe("request_approval");
  }, 15000);

  it("dangerous terminal command → deny/critical", async () => {
    const r = await run("запусти rm -rf /");
    expect(r.allowed).toBe(false);
    expect(["deny", "request_approval"]).toContain(r.nextAction);
    expect(r.riskLevel).toBe("CRITICAL");
  }, 15000);

  it("create agent → requires approval", async () => {
    const r = await run("создай агента");
    expect(r.requiresApproval).toBe(true);
  });

  it("developer task → requires approval", async () => {
    const r = await run("реализуй по этим промптам");
    expect(r.requiresApproval).toBe(true);
  });

  it("unknown text → clarify", async () => {
    const r = await run("qwertyuiop");
    expect(r.nextAction).toBe("clarify");
  });

  it("approval payload includes actor/source/intent/reason", async () => {
    const p = buildCommandApprovalPayload({
      actor: owner,
      source: "voice",
      text: "git push",
      intent: "terminal_task",
      reason: "test reason",
      riskLevel: "HIGH",
    });
    expect(p.actorId).toBe("u1");
    expect(p.actorRole).toBe("owner");
    expect(p.actorSource).toBe("web");
    expect(p.source).toBe("voice");
    expect(p.intent).toBe("terminal_task");
    expect(p.reason).toBe("test reason");
  });

  it("ui_control toggle chat is allowed", async () => {
    const r = await run("открой чат");
    expect(r.intent).toBe("ui_control");
    expect(r.allowed).toBe(true);
    expect(r.nextAction).toBe("execute_safe_action");
    expect(r.data?.uiAction).toBe("toggle_chat");
    expect(r.data?.params).toEqual({ open: true });
  });

  it("ui_control switches hub tab", async () => {
    const r = await run("вкладка агенты");
    expect(r.intent).toBe("ui_control");
    expect(r.nextAction).toBe("execute_safe_action");
    expect(r.data?.uiAction).toBe("set_hub_tab");
    expect(r.data?.params).toEqual({ tab: "agents" });
  });
});
