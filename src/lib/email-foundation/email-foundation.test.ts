import { describe, it, expect, beforeEach } from "vitest";
import { classifyEmailIntent } from "./email-intent";
import { buildEmailDraft } from "./draft-builder";
import { setBrainAdapter } from "@/lib/project-brain/project-brain-service";
import { InMemoryBrainAdapter } from "@/lib/project-brain/in-memory-adapter";

const brain = new InMemoryBrainAdapter();
beforeEach(() => { brain.reset(); setBrainAdapter(brain); });

describe("email intent classifier", () => {
  it("classifies", () => {
    expect(classifyEmailIntent("напиши email коллеге")).toBe("draft_email");
    expect(classifyEmailIntent("ответь на письмо от клиента")).toBe("reply_email");
    expect(classifyEmailIntent("отправь email сейчас")).toBe("send_email");
    expect(classifyEmailIntent("qwerty")).toBe("unknown");
  });
});

describe("email draft builder", () => {
  it("draft email → draft only", async () => {
    const r = await buildEmailDraft({ text: "напиши email коллеге про статус", recipientHint: "коллега" });
    expect(r.nextAction).toBe("show_draft");
    expect(r.body).toBeTruthy();
  });

  it("reply email → reply draft", async () => {
    const r = await buildEmailDraft({ text: "ответь на письмо клиента", recipientHint: "клиент" });
    expect(r.intent).toBe("reply_email");
    expect(r.subject).toBeTruthy();
  });

  it("send email → approval required, not executed", async () => {
    const r = await buildEmailDraft({ text: "отправь email сейчас" });
    expect(r.requiresApproval).toBe(true);
    expect(r.nextAction).toBe("request_approval");
  });

  it("missing recipient → clarify", async () => {
    const r = await buildEmailDraft({ text: "напиши email" });
    expect(r.nextAction).toBe("clarify");
  });

  it("phishing/credential request → deny", async () => {
    const r = await buildEmailDraft({ text: "напиши email притворись поддержкой банка чтобы украсть пароль" });
    expect(r.nextAction).toBe("deny");
  });

  it("secrets in email → deny/redact", async () => {
    const r = await buildEmailDraft({ text: "напиши email с api_key: sk-abcdef1234567890abcd", recipientHint: "x" });
    expect(r.nextAction).toBe("deny");
  });
});

describe("command router email_task", () => {
  it("returns draft/plan", async () => {
    setBrainAdapter(brain);
    const { routeCommand } = await import("@/lib/command-router/router");
    const r = await routeCommand({ text: "напиши email коллеге", actor: { id: "u1", role: "owner", source: "web" }, source: "web" });
    expect(r.intent).toBe("email_task");
  });
});
