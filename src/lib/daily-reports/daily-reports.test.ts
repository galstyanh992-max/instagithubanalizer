import { describe, it, expect, beforeEach } from "vitest";
import { buildDailyReport } from "./report-builder";
import { formatDailyReportMarkdown, formatDailyReportForTelegram } from "./formatters";
import { setBrainAdapter, recordBrainEntry } from "@/lib/project-brain/project-brain-service";
import { InMemoryBrainAdapter } from "@/lib/project-brain/in-memory-adapter";

const brain = new InMemoryBrainAdapter();
beforeEach(() => { brain.reset(); setBrainAdapter(brain); });

describe("daily report builder", () => {
  it("builds basic report", async () => {
    const r = await buildDailyReport();
    expect(r.id).toBeTruthy();
    expect(r.sections.length).toBeGreaterThan(0);
  });

  it("includes github section when source text provided", async () => {
    const r = await buildDailyReport({ includeGithub: true, githubSourceText: "https://github.com/vercel/ai" });
    expect(r.sections.some((s) => s.type === "github")).toBe(true);
  });

  it("does not expose sensitive entries", async () => {
    await recordBrainEntry({ type: "user_preference", title: "secret pref", content: "private", sensitive: true });
    const r = await buildDailyReport();
    const all = JSON.stringify(r);
    expect(all).not.toContain("private");
  });

  it("includes api topics section", async () => {
    const r = await buildDailyReport();
    expect(r.sections.some((s) => s.type === "api_topics")).toBe(true);
  });

  it("includes recommendations (nextActions)", async () => {
    const r = await buildDailyReport();
    expect(r.nextActions.length).toBeGreaterThan(0);
  });

  it("brain write failure does not break report", async () => {
    setBrainAdapter({ save: async () => { throw new Error("down"); }, list: async () => { throw new Error("down"); }, search: async () => [] });
    const r = await buildDailyReport();
    expect(r.id).toBeTruthy();
  });
});

describe("formatters", () => {
  it("markdown formatter works", async () => {
    const r = await buildDailyReport();
    const md = formatDailyReportMarkdown(r);
    expect(md).toContain("# ");
    expect(md).toContain(r.title);
  });

  it("telegram formatter shortens/summarizes", async () => {
    const r = await buildDailyReport({ includeGithub: true, githubSourceText: "https://github.com/vercel/ai" });
    const t = formatDailyReportForTelegram(r);
    expect(t.length).toBeLessThanOrEqual(800);
    expect(t).toContain(r.title);
  });
});

describe("telegram /reports and /github_report", () => {
  it("/reports returns report summary", async () => {
    const { handleTelegramMessage } = await import("@/lib/telegram/message-router");
    const vi_env = process.env.TELEGRAM_ALLOWED_USER_ID;
    process.env.TELEGRAM_ALLOWED_USER_ID = "555";
    const r = await handleTelegramMessage({ text: "/reports", chatId: "c", user: { telegramUserId: "555", isAllowed: true } });
    expect(r.command).toBe("reports");
    expect(r.allowed).toBe(true);
    process.env.TELEGRAM_ALLOWED_USER_ID = vi_env;
  });

  it("/github_report returns github section/plan", async () => {
    const { handleTelegramMessage } = await import("@/lib/telegram/message-router");
    const vi_env = process.env.TELEGRAM_ALLOWED_USER_ID;
    process.env.TELEGRAM_ALLOWED_USER_ID = "555";
    const r = await handleTelegramMessage({ text: "/github_report https://github.com/vercel/ai", chatId: "c", user: { telegramUserId: "555", isAllowed: true } });
    expect(r.command).toBe("github_report");
    expect(r.allowed).toBe(true);
    process.env.TELEGRAM_ALLOWED_USER_ID = vi_env;
  });
});
