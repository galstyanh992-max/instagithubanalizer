import { describe, it, expect, beforeEach, vi } from "vitest";
import { parseTelegramCommand } from "./command-parser";
import { getTelegramConfig, isTelegramConfigured, validateTelegramUser } from "./config";
import { handleTelegramMessage } from "./message-router";
import { setBrainAdapter } from "@/lib/project-brain/project-brain-service";
import { InMemoryBrainAdapter } from "@/lib/project-brain/in-memory-adapter";

const brain = new InMemoryBrainAdapter();
beforeEach(() => { brain.reset(); setBrainAdapter(brain); vi.unstubAllEnvs(); });

describe("command parser", () => {
  it("parses commands", () => {
    expect(parseTelegramCommand("/status")).toBe("status");
    expect(parseTelegramCommand("/help")).toBe("help");
    expect(parseTelegramCommand("/approve abc")).toBe("approve");
    expect(parseTelegramCommand("/reject abc")).toBe("reject");
    expect(parseTelegramCommand("/reports")).toBe("reports");
    expect(parseTelegramCommand("/github_report")).toBe("github_report");
    expect(parseTelegramCommand("проанализируй github.com/x/y")).toBe("route_command");
    expect(parseTelegramCommand("")).toBe("unknown");
  });
});

describe("config", () => {
  it("redacts / never exposes token; missing token != failure", () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    vi.stubEnv("TELEGRAM_ALLOWED_USER_ID", "");
    const cfg = getTelegramConfig();
    expect(cfg.tokenConfigured).toBe(false);
    expect(isTelegramConfigured()).toBe(false);
    expect(JSON.stringify(cfg)).not.toMatch(/bot_token|:[0-9]{6,}:/i);
  });
  it("validateTelegramUser false when unconfigured", () => {
    vi.stubEnv("TELEGRAM_ALLOWED_USER_ID", "");
    expect(validateTelegramUser("123")).toBe(false);
  });
  it("validateTelegramUser true only for matching allowed id", () => {
    vi.stubEnv("TELEGRAM_ALLOWED_USER_ID", "555");
    expect(validateTelegramUser("555")).toBe(true);
    expect(validateTelegramUser("999")).toBe(false);
  });
});

describe("message router", () => {
  const allowedInput = (text: string) => ({ text, chatId: "c1", user: { telegramUserId: "555", isAllowed: true } });
  const unauthorizedInput = (text: string) => ({ text, chatId: "c1", user: { telegramUserId: "999", isAllowed: true } });

  it("/status handled", async () => {
    vi.stubEnv("TELEGRAM_ALLOWED_USER_ID", "555");
    const r = await handleTelegramMessage(allowedInput("/status"));
    expect(r.command).toBe("status");
    expect(r.allowed).toBe(true);
  });

  it("/help handled", async () => {
    vi.stubEnv("TELEGRAM_ALLOWED_USER_ID", "555");
    const r = await handleTelegramMessage(allowedInput("/help"));
    expect(r.command).toBe("help");
  });

  it("/approve abc parsed (plan-only, no execution)", async () => {
    vi.stubEnv("TELEGRAM_ALLOWED_USER_ID", "555");
    const r = await handleTelegramMessage(allowedInput("/approve abc123"));
    expect(r.nextAction).toBe("approve_action");
    expect(r.approvalId).toBe("abc123");
  });

  it("/reject abc parsed", async () => {
    vi.stubEnv("TELEGRAM_ALLOWED_USER_ID", "555");
    const r = await handleTelegramMessage(allowedInput("/reject abc123"));
    expect(r.nextAction).toBe("reject_action");
  });

  it("unauthorized user denied", async () => {
    vi.stubEnv("TELEGRAM_ALLOWED_USER_ID", "555");
    const r = await handleTelegramMessage(unauthorizedInput("/status"));
    expect(r.allowed).toBe(false);
    expect(r.nextAction).toBe("deny");
  });

  it("allowed user routes safe command via Command Router", async () => {
    vi.stubEnv("TELEGRAM_ALLOWED_USER_ID", "555");
    const r = await handleTelegramMessage(allowedInput("поговори со мной"));
    expect(r.nextAction).toBe("route_to_command_router");
    expect(r.routedIntent).toBe("conversation");
    expect(r.allowed).toBe(true);
  });

  it("risky command from telegram requires approval", async () => {
    vi.stubEnv("TELEGRAM_ALLOWED_USER_ID", "555");
    const r = await handleTelegramMessage(allowedInput("сделай deploy в vercel"));
    expect(r.requiresApproval).toBe(true);
  });

  it("unknown/unauthorized user cannot route risky command", async () => {
    vi.stubEnv("TELEGRAM_ALLOWED_USER_ID", "555");
    const r = await handleTelegramMessage(unauthorizedInput("сделай deploy в vercel"));
    expect(r.allowed).toBe(false);
    expect(r.nextAction).toBe("deny");
  });

  it("/github_report returns plan/placeholder", async () => {
    vi.stubEnv("TELEGRAM_ALLOWED_USER_ID", "555");
    const r = await handleTelegramMessage(allowedInput("/github_report"));
    expect(r.command).toBe("github_report");
    expect(r.allowed).toBe(true);
  });

  it("brain failure does not break router", async () => {
    vi.stubEnv("TELEGRAM_ALLOWED_USER_ID", "555");
    setBrainAdapter({ save: async () => { throw new Error("down"); }, list: async () => [], search: async () => [] });
    const r = await handleTelegramMessage(allowedInput("/status"));
    expect(r.allowed).toBe(true);
  });
});
