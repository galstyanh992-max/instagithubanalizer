import { describe, it, expect, beforeEach, vi } from "vitest";
import { buildPhoneBridgeDashboard } from "./dashboard";
import { previewPhoneCommand } from "./command-preview";
import { buildPhoneApprovalInbox } from "./approval-inbox";
import { setBrainAdapter } from "@/lib/project-brain/project-brain-service";
import { InMemoryBrainAdapter } from "@/lib/project-brain/in-memory-adapter";

const brain = new InMemoryBrainAdapter();

beforeEach(() => {
  brain.reset();
  setBrainAdapter(brain);
  vi.unstubAllEnvs();
  // Ensure NO live DB for deterministic safe-empty inbox.
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("DIRECT_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
});

describe("dashboard", () => {
  it("1. builds without live DB", () => {
    const d = buildPhoneBridgeDashboard();
    expect(d).toBeTruthy();
    expect(d.generatedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(["ready", "partial", "not_configured", "blocked"]).toContain(d.status);
    expect(d.modules.commandRouter).toBe("available");
    expect(d.status).not.toBe("blocked"); // never throws → never blocked here
  });

  it("2. warns when local agent not configured/running", () => {
    const d = buildPhoneBridgeDashboard();
    expect(d.warnings.join(" ")).toMatch(/Локальный агент не запущен/i);
    expect(d.modules.localAgent).not.toBe("connected_mock");
  });

  it("also warns when DB missing", () => {
    const d = buildPhoneBridgeDashboard();
    expect(d.modules.db).toBe("not_configured");
    expect(d.warnings.join(" ")).toMatch(/Live DB не настроена/i);
  });
});

describe("command preview — no execution", () => {
  it("3. local/computer action does not execute (returns a plan/approval only)", async () => {
    const p = await previewPhoneCommand({ text: "подключи Desktop Commander", source: "mobile_web" });
    expect(p).toBeTruthy();
    // No "executed" status exists in the type — only safe outcomes.
    expect(["planned", "approval_required", "blocked", "not_implemented", "local_agent_not_running"]).toContain(p.status);
    expect(p.status).toBe("local_agent_not_running");
    expect(p.nextAction).toBe("configure_local_agent");
  });

  it("4. destructive action is blocked", async () => {
    const p = await previewPhoneCommand({ text: "удали папку проекта", source: "desktop_web" });
    expect(p.status).toBe("blocked");
    expect(p.nextAction).toBe("deny");
    expect(p.blockedReasons.length).toBeGreaterThan(0);
    expect(p.requiresApproval).toBe(false);
  });

  it("5. email send requires approval or not implemented (never sends)", async () => {
    const p = await previewPhoneCommand({ text: "отправь письмо клиенту", source: "mobile_web" });
    expect(["approval_required", "not_implemented"]).toContain(p.status);
  });

  it("6. content generation returns a plan (no publish)", async () => {
    const p = await previewPhoneCommand({ text: "напиши пост для Instagram", source: "desktop_web" });
    expect(p.status).toBe("planned");
    expect(p.intent).toBe("content_task");
  });

  it("7. daily report / open dashboard returns a plan", async () => {
    const p = await previewPhoneCommand({ text: "покажи dashboard daily report", source: "desktop_web" });
    expect(p.status).toBe("planned");
  });

  it("8. mobile/telegram source is stricter than desktop web", async () => {
    const text = "напиши пост для Instagram"; // MEDIUM risk content task
    const desktop = await previewPhoneCommand({ text, source: "desktop_web" });
    const mobile = await previewPhoneCommand({ text, source: "mobile_web" });
    const telegram = await previewPhoneCommand({ text, source: "telegram" });
    expect(desktop.status).toBe("planned");
    expect(desktop.requiresApproval).toBe(false);
    expect(mobile.status).toBe("approval_required");
    expect(mobile.requiresApproval).toBe(true);
    expect(telegram.requiresApproval).toBe(true);
  });

  it("empty command → clarify", async () => {
    const p = await previewPhoneCommand({ text: "   ", source: "mobile_web" });
    expect(p.status).toBe("not_implemented");
    expect(p.nextAction).toBe("clarify");
  });
});

describe("approval inbox", () => {
  it("9. returns safe output without live DB", async () => {
    const inbox = await buildPhoneApprovalInbox();
    expect(inbox.liveDb).toBe(false);
    expect(inbox.items).toEqual([]);
    expect(inbox.warnings.length).toBeGreaterThan(0);
  });
});

describe("no-secret guarantees (serialized DTO scan)", () => {
  const SECRET_RE = /postgres(ql)?:\/\/|eyJ[A-Za-z0-9_-]{10,}|BEGIN [A-Z ]*PRIVATE KEY|sk-[A-Za-z0-9]{10,}/;

  it("10. dashboard DTO contains no secret-like strings", () => {
    const s = JSON.stringify(buildPhoneBridgeDashboard());
    expect(s).not.toMatch(SECRET_RE);
  });

  it("11. command preview DTO contains no secret-like strings & no execution result", async () => {
    const p = await previewPhoneCommand({ text: "покажи dashboard", source: "mobile_web" });
    const s = JSON.stringify(p);
    expect(s).not.toMatch(SECRET_RE);
    expect(s).not.toMatch(/"executed"|executionResult|stdout|exitCode/);
  });
});
