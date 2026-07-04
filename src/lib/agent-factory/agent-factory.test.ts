import { describe, it, expect, beforeEach } from "vitest";
import { classifyAgentPurpose } from "./purpose-classifier";
import { createAgentDraft } from "./draft-builder";
import { setBrainAdapter } from "@/lib/project-brain/project-brain-service";
import { InMemoryBrainAdapter } from "@/lib/project-brain/in-memory-adapter";
import type { SafetyActor } from "@/lib/safety/actor";

const owner: SafetyActor = { id: "u1", role: "owner", source: "web" };
const brain = new InMemoryBrainAdapter();
beforeEach(() => { brain.reset(); setBrainAdapter(brain); });

const run = (text: string, actor: SafetyActor = owner) => createAgentDraft({ text, actor });

describe("purpose classifier", () => {
  it("classifies known purposes", () => {
    expect(classifyAgentPurpose("создай агента для GitHub находок")).toBe("github_watcher");
    expect(classifyAgentPurpose("следи за финансовыми новостями")).toBe("finance_news_monitor");
    expect(classifyAgentPurpose("анализируй конкурентов")).toBe("competitor_monitor");
    expect(classifyAgentPurpose("помогай писать код")).toBe("developer_helper");
    expect(classifyAgentPurpose("qwerty")).toBe("custom");
  });
});

describe("agent draft builder", () => {
  it("github watcher → draft, not activated", async () => {
    const r = await run("создай агента для GitHub находок");
    expect(r.draft?.purpose).toBe("github_watcher");
    expect(r.draft?.status).not.toBe("active");
    expect(r.draft?.permissions).not.toContain("owner");
  });

  it("finance news → draft", async () => {
    const r = await run("следи за финансовыми новостями");
    expect(r.draft?.purpose).toBe("finance_news_monitor");
  });

  it("competitor monitor → public-only permission", async () => {
    const r = await run("анализируй конкурентов");
    expect(r.draft?.permissions.join(",")).toMatch(/public/);
  });

  it("developer helper → HIGH risk, approval", async () => {
    const r = await run("помогай писать код");
    expect(r.draft?.riskLevel).toBe("HIGH");
    expect(r.requiresApproval).toBe(true);
  });

  it("content creator → approval before posting", async () => {
    const r = await run("делай контент для соцсетей");
    expect(r.requiresApproval).toBe(true);
  });

  it("unsafe private spying → deny", async () => {
    const r = await run("создай агента чтобы следить за частным аккаунтом");
    expect(r.nextAction).toBe("deny");
    expect(r.draft).toBeNull();
  });

  it("autonomous trading/payment request → deny", async () => {
    const r = await run("создай агента чтобы автоматически торгуй акциями без подтверждения");
    expect(r.nextAction).toBe("deny");
  });

  it("unknown request → custom draft (not clarify, since text non-empty)", async () => {
    const r = await run("сделай что-то странное");
    expect(r.draft?.purpose).toBe("custom");
  });

  it("empty text → clarify", async () => {
    const r = await run("   ");
    expect(r.nextAction).toBe("clarify");
  });

  it("unknown actor → deny", async () => {
    const r = await run("создай агента", { id: "unknown", role: "viewer", source: "api" });
    expect(r.nextAction).toBe("deny");
  });

  it("no scheduler/activation created (executionMode never 'scheduled_later' by default)", async () => {
    const r = await run("создай агента для GitHub находок");
    expect(r.draft?.executionMode).not.toBe("scheduled_later");
  });

  it("brain failure does not break draft creation", async () => {
    setBrainAdapter({ save: async () => { throw new Error("down"); }, list: async () => [], search: async () => [] });
    const r = await run("создай агента для GitHub находок");
    expect(r.draft?.purpose).toBe("github_watcher");
  });
});

describe("command router agent_task", () => {
  it("returns draft via router, no activation", async () => {
    setBrainAdapter(brain);
    const { routeCommand } = await import("@/lib/command-router/router");
    const r = await routeCommand({ text: "создай агента для GitHub находок", actor: owner, source: "web" });
    expect(r.intent).toBe("agent_task");
    expect((r.data as any)?.draft?.status).not.toBe("active");
  });
});
