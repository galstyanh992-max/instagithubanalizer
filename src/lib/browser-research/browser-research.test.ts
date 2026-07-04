import { describe, it, expect, beforeEach } from "vitest";
import { classifyResearchMode } from "./mode-classifier";
import { planBrowserResearch } from "./planner";
import { buildResearchReportDraft } from "./report-draft";
import { setBrainAdapter } from "@/lib/project-brain/project-brain-service";
import { InMemoryBrainAdapter } from "@/lib/project-brain/in-memory-adapter";

const brain = new InMemoryBrainAdapter();
beforeEach(() => { brain.reset(); setBrainAdapter(brain); });

describe("research mode classifier", () => {
  it("deep research text", () => expect(classifyResearchMode("включи режим глубокого исследования по теме X")).toBe("deep_research"));
  it("movie text", () => expect(classifyResearchMode("найди фильм на этих сайтах")).toBe("movie_recommendation"));
});

describe("browser research planner", () => {
  it("competitor analysis → public-only policy", async () => {
    const p = await planBrowserResearch({ text: "анализируй конкурентов" });
    expect(p.sourcePolicy).toContain("public_only");
    expect(p.sourcePolicy).toContain("no_private_data");
  });

  it("paywall bypass request → denied/blocked", async () => {
    const p = await planBrowserResearch({ text: "обойди paywall на этом сайте" });
    expect(p.allowed).toBe(false);
    expect(p.blockedReasons.length).toBeGreaterThan(0);
  });

  it("private data request → denied/blocked", async () => {
    const p = await planBrowserResearch({ text: "собери частные данные пользователя" });
    expect(p.allowed).toBe(false);
  });

  it("github source discovery → plan only", async () => {
    const p = await planBrowserResearch({ text: "найди github ссылки из этих источников" });
    expect(p.mode).toBe("github_source_discovery");
    expect(p.steps.some((s) => /GitHub Watcher/i.test(s))).toBe(true);
  });

  it("brain failure does not break plan", async () => {
    setBrainAdapter({ save: async () => { throw new Error("down"); }, list: async () => [], search: async () => [] });
    const p = await planBrowserResearch({ text: "найди фильм" });
    expect(p.mode).toBe("movie_recommendation");
  });
});

describe("research report draft", () => {
  it("deep research contains evidence requirements", () => {
    const d = buildResearchReportDraft({ text: "исследуй подробно рынок AI агентов" });
    expect(d.evidenceRequirements.length).toBeGreaterThan(0);
  });
  it("movie recommendation asks preference/mood questions", () => {
    const d = buildResearchReportDraft({ text: "найди фильм на этих сайтах" });
    expect(d.questionsToAnswer.length).toBeGreaterThan(0);
  });
});

describe("command router browser_task", () => {
  it("returns plan via router", async () => {
    setBrainAdapter(brain);
    const { routeCommand } = await import("@/lib/command-router/router");
    const r = await routeCommand({ text: "найди фильм на этих сайтах", actor: { id: "u1", role: "owner", source: "web" }, source: "web" });
    expect(r.intent).toBe("browser_task");
    expect((r.data as any)?.plan).toBeTruthy();
  });
});
