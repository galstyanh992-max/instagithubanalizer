import { describe, it, expect, beforeEach } from "vitest";
import { classifyContentMode } from "./content-intent";
import { planContentGeneration } from "./planner";
import { setBrainAdapter } from "@/lib/project-brain/project-brain-service";
import { InMemoryBrainAdapter } from "@/lib/project-brain/in-memory-adapter";

const brain = new InMemoryBrainAdapter();
beforeEach(() => { brain.reset(); setBrainAdapter(brain); });

describe("content mode classifier", () => {
  it("classifies", () => {
    expect(classifyContentMode("создай изображение заката")).toBe("image");
    expect(classifyContentMode("сгенерируй видео о продукте")).toBe("video");
    expect(classifyContentMode("сделай голос для ролика")).toBe("voice");
    expect(classifyContentMode("напиши пост в инстаграм")).toBe("social_post");
  });
});

describe("content generation planner", () => {
  it("image request → image plan only", async () => {
    const p = await planContentGeneration({ text: "создай изображение заката" });
    expect(p.mode).toBe("image");
    expect(p.nextAction).not.toBe("deny");
  });

  it("video request → video plan only, approval", async () => {
    const p = await planContentGeneration({ text: "сгенерируй видео о продукте" });
    expect(p.requiresApproval).toBe(true);
  });

  it("voice request → voice plan, approval", async () => {
    const p = await planContentGeneration({ text: "сделай голос для ролика" });
    expect(p.requiresApproval).toBe(true);
  });

  it("social post → draft/plan", async () => {
    const p = await planContentGeneration({ text: "напиши пост в инстаграм" });
    expect(p.promptDraft).toBeTruthy();
  });

  it("publish request → approval required, not executed", async () => {
    const p = await planContentGeneration({ text: "опубликуй этот пост" });
    expect(p.requiresApproval).toBe(true);
    expect(p.nextAction).toBe("request_approval");
  });

  it("impersonation voice request → deny", async () => {
    const p = await planContentGeneration({ text: "сделай голос реального человека знаменитости" });
    expect(p.nextAction).toBe("deny");
  });

  it("spam/mass content → deny", async () => {
    const p = await planContentGeneration({ text: "создай изображение для массовой рассылки spam campaign" });
    expect(p.nextAction).toBe("deny");
  });
});

describe("command router content_task", () => {
  it("returns plan", async () => {
    setBrainAdapter(brain);
    const { routeCommand } = await import("@/lib/command-router/router");
    const r = await routeCommand({ text: "создай изображение заката", actor: { id: "u1", role: "owner", source: "web" }, source: "web" });
    expect(r.intent).toBe("content_task");
  });
});
