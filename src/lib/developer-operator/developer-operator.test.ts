import { describe, it, expect, beforeEach } from "vitest";
import { classifyDeveloperAction } from "./action-classifier";
import { planDeveloperOperator } from "./developer-operator";
import { setBrainAdapter } from "@/lib/project-brain/project-brain-service";
import { InMemoryBrainAdapter } from "@/lib/project-brain/in-memory-adapter";
import type { SafetyActor } from "@/lib/safety/actor";

const owner: SafetyActor = { id: "u1", role: "owner", source: "web" };
const brain = new InMemoryBrainAdapter();

beforeEach(() => { brain.reset(); setBrainAdapter(brain); });

const run = (text: string, actor: SafetyActor = owner) => planDeveloperOperator({ text, actor });

describe("developer action classifier", () => {
  it("classifies", () => {
    expect(classifyDeveloperAction("запусти тесты")).toBe("run_tests");
    expect(classifyDeveloperAction("открой preview")).toBe("open_preview");
    expect(classifyDeveloperAction("реализуй по этим промптам")).toBe("prepare_prompt_implementation");
    expect(classifyDeveloperAction("загрузи в github")).toBe("prepare_github_push");
    expect(classifyDeveloperAction("сделай deploy в vercel")).toBe("prepare_vercel_deploy");
    expect(classifyDeveloperAction("проверь проект")).toBe("inspect_project");
    expect(classifyDeveloperAction("бла бла")).toBe("unknown");
  });
});

describe("developer operator planner", () => {
  it("run_tests → plan, no execution", async () => {
    const r = await run("запусти тесты");
    expect(r.action).toBe("run_tests");
    expect(r.commands?.[0].command).toBe("npm test");
    expect(r.nextAction).not.toBe("run_safe_command");
  });

  it("open_preview → plan (approval, no execution)", async () => {
    const r = await run("открой preview");
    expect(r.action).toBe("open_preview");
    expect(r.requiresApproval).toBe(true);
  });

  it("prepare_prompt_implementation → approval", async () => {
    const r = await run("реализуй по этим промптам");
    expect(r.requiresApproval).toBe(true);
  });

  it("github push → approval", async () => {
    const r = await run("загрузи в github");
    expect(r.requiresApproval).toBe(true);
  });

  it("vercel deploy → CRITICAL approval", async () => {
    const r = await run("сделай deploy в vercel");
    expect(r.requiresApproval).toBe(true);
    expect(r.commands?.some((c) => c.riskLevel === "CRITICAL")).toBe(true);
  });

  it("unknown dev task → clarify", async () => {
    const r = await run("абракадабра");
    expect(r.nextAction).toBe("clarify");
  });

  it("unknown actor → deny", async () => {
    const r = await run("запусти тесты", { id: "unknown", role: "viewer", source: "api" });
    expect(r.nextAction).toBe("deny");
  });

  it("planner does not break if brain recording fails", async () => {
    setBrainAdapter({ save: async () => { throw new Error("down"); }, list: async () => [], search: async () => [] });
    const r = await run("запусти тесты");
    expect(r.action).toBe("run_tests");
  });
});

describe("command router developer_task integration", () => {
  it("routes developer_task through operator", async () => {
    setBrainAdapter(brain);
    const { routeCommand } = await import("@/lib/command-router/router");
    const r = await routeCommand({ text: "реализуй по этим промптам", actor: owner, source: "web" });
    expect(r.requiresApproval).toBe(true);
    expect((r.data as any)?.plan).toBeTruthy();
  });
});
