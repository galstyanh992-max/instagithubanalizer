import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryBrainAdapter } from "./in-memory-adapter";
import {
  setBrainAdapter,
  recordBrainEntry,
  recordUserCommand,
  recordRouterDecision,
  searchBrainEntries,
  listRecentBrainEntries,
} from "./project-brain-service";

const adapter = new InMemoryBrainAdapter();

beforeEach(() => {
  adapter.reset();
  setBrainAdapter(adapter);
});

describe("project brain service", () => {
  it("records a normal entry", async () => {
    const e = await recordBrainEntry({ type: "daily_note", title: "t", content: "hello" });
    expect(e?.id).toBeTruthy();
    expect(e?.sensitive).toBe(false);
  });

  it("auto-flags sensitive content and hides it in search", async () => {
    await recordBrainEntry({ type: "note" as never, title: "leak", content: "key is sk-abcdef1234567890abcdef1234567890" });
    const res = await searchBrainEntries("leak");
    expect(res[0].sensitive).toBe(true);
    expect(res[0].content).toBe("[SENSITIVE — HIDDEN]");
  });

  it("explicit sensitive entry hidden in list", async () => {
    await recordBrainEntry({ type: "user_preference", title: "secret pref", content: "private detail", sensitive: true });
    const res = await listRecentBrainEntries();
    expect(res[0].content).toBe("[SENSITIVE — HIDDEN]");
  });

  it("records user command", async () => {
    const e = await recordUserCommand("открой dashboard", { id: "u1", role: "owner", source: "web" }, "voice");
    expect(e?.type).toBe("user_command");
  });

  it("records router decision", async () => {
    const e = await recordRouterDecision("git push", { intent: "terminal_task", riskLevel: "HIGH" });
    expect(e?.type).toBe("router_decision");
  });

  it("search + list work with mocked adapter", async () => {
    await recordBrainEntry({ type: "daily_note", title: "alpha", content: "one" });
    await recordBrainEntry({ type: "daily_note", title: "beta", content: "two" });
    expect((await listRecentBrainEntries()).length).toBe(2);
    expect((await searchBrainEntries("alpha")).length).toBe(1);
  });

  it("record does not throw when adapter fails (non-fatal)", async () => {
    setBrainAdapter({
      save: async () => { throw new Error("db down"); },
      list: async () => [],
      search: async () => [],
    });
    const e = await recordBrainEntry({ type: "daily_note", title: "x", content: "y" });
    expect(e).toBeNull();
  });

  it("metadata is JSON-safe (drops circular)", async () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const e = await recordBrainEntry({ type: "daily_note", title: "c", content: "z", metadata: circular });
    expect(e).not.toBeNull();
    expect(e?.metadata).toEqual({});
  });
});

describe("command router still works if brain recording fails", () => {
  it("router returns despite failing recorder", async () => {
    setBrainAdapter({
      save: async () => { throw new Error("db down"); },
      list: async () => [],
      search: async () => [],
    });
    const { routeCommand } = await import("@/lib/command-router/router");
    const r = await routeCommand({ text: "поговори со мной", actor: { id: "u1", role: "owner", source: "web" }, source: "voice" });
    expect(r.allowed).toBe(true);
    expect(r.intent).toBe("conversation");
  });
});
