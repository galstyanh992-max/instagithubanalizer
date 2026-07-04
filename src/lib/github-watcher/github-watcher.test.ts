import { describe, it, expect, beforeEach } from "vitest";
import { extractGitHubCandidates } from "./url-extractor";
import { evaluateGitHubCandidate } from "./evaluator";
import { buildGitHubWatchReport } from "./report-builder";
import { setBrainAdapter } from "@/lib/project-brain/project-brain-service";
import { InMemoryBrainAdapter } from "@/lib/project-brain/in-memory-adapter";

const brain = new InMemoryBrainAdapter();
beforeEach(() => { brain.reset(); setBrainAdapter(brain); });

describe("url extractor", () => {
  it("extracts single URL", () => {
    const c = extractGitHubCandidates("check https://github.com/vercel/ai please");
    expect(c).toHaveLength(1);
    expect(c[0].normalizedName).toBe("vercel/ai");
  });
  it("extracts multiple URLs", () => {
    const c = extractGitHubCandidates("https://github.com/modelcontextprotocol/servers and github.com/openai/openai-node?tab=readme");
    expect(c).toHaveLength(2);
  });
  it("dedupes duplicates", () => {
    const c = extractGitHubCandidates("https://github.com/vercel/ai https://github.com/vercel/ai/");
    expect(c).toHaveLength(1);
  });
  it("ignores invalid/non-repo urls", () => {
    const c = extractGitHubCandidates("https://github.com/topics/ai and https://example.com/vercel/ai");
    expect(c).toHaveLength(0);
  });
});

describe("evaluator", () => {
  it("marks AI/MCP/tool repo useful", () => {
    const c = extractGitHubCandidates("https://github.com/modelcontextprotocol/servers")[0];
    const e = evaluateGitHubCandidate(c, "mcp tool agent api server");
    expect(["high", "medium"]).toContain(e.usefulness);
    expect(e.recommendedNextAction).not.toBe("ignore");
  });
  it("flags malware/exploit repo as risk/manual_review", () => {
    const c = extractGitHubCandidates("https://github.com/foo/bar")[0];
    const e = evaluateGitHubCandidate(c, "malware exploit credential stealer");
    expect(e.riskLevel).toBe("HIGH");
    expect(e.recommendedNextAction).toBe("manual_review");
  });
});

describe("watch report builder", () => {
  it("sorts high relevance first", async () => {
    const text = "unrelated repo https://github.com/foo/randomrepo nothing special here at all just a plain link. " +
      "Meanwhile this one is great: mcp agent api tool ai server -> https://github.com/modelcontextprotocol/servers";
    const r = await buildGitHubWatchReport({ text });
    expect(r.candidates[0].candidate.normalizedName).toBe("modelcontextprotocol/servers");
  });
  it("never recommends auto-install", async () => {
    const r = await buildGitHubWatchReport({ text: "https://github.com/foo/bar" });
    expect(r.recommendedNextActions.join(" ")).toMatch(/никогда auto-install/);
  });
  it("brain failure does not break report", async () => {
    setBrainAdapter({ save: async () => { throw new Error("down"); }, list: async () => [], search: async () => [] });
    const r = await buildGitHubWatchReport({ text: "https://github.com/foo/bar" });
    expect(r.candidates).toHaveLength(1);
  });
});

describe("command router github analysis", () => {
  it("handles github links text", async () => {
    setBrainAdapter(brain);
    const { routeCommand } = await import("@/lib/command-router/router");
    const r = await routeCommand({ text: "проанализируй https://github.com/vercel/ai для нашего проекта", actor: { id: "u1", role: "owner", source: "web" }, source: "web" });
    expect(r.intent).toBe("github_analysis");
    expect((r.data as any)?.report?.candidates?.length).toBeGreaterThan(0);
  });
});
