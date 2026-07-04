import { describe, it, expect, beforeEach, vi } from "vitest";
import { getDbConfigStatus, redactIfSecretLike } from "./config";
import { runPersistenceProbe } from "./persistence-probe";

beforeEach(() => { vi.unstubAllEnvs(); });

describe("db config validator", () => {
  it("missing DATABASE_URL → not_configured", () => {
    vi.stubEnv("DATABASE_URL", "");
    const cfg = getDbConfigStatus();
    expect(cfg.databaseUrlConfigured).toBe(false);
    expect(cfg.liveCheckPossible).toBe(false);
  });

  it("placeholder DATABASE_URL treated as not configured", () => {
    vi.stubEnv("DATABASE_URL", 'postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require');
    expect(getDbConfigStatus().databaseUrlConfigured).toBe(false);
  });

  it("configured DATABASE_URL returns true without exposing value", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://real:pass@db.example.com:5432/prod");
    const cfg = getDbConfigStatus();
    expect(cfg.databaseUrlConfigured).toBe(true);
    expect(JSON.stringify(cfg)).not.toContain("real:pass");
  });

  it("redacts secret-looking connection strings", () => {
    expect(redactIfSecretLike("postgresql://user:pass@host/db")).toBe("[REDACTED]");
    expect(redactIfSecretLike("hello")).toBe("hello");
  });
});

describe("persistence probe", () => {
  it("default is dry-run when DB not configured", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const r = await runPersistenceProbe();
    expect(r.mode).toBe("dry_run");
    expect(r.status).toBe("not_configured");
  });

  it("write requires explicit flag even if DATABASE_URL configured", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://real:pass@db.example.com:5432/prod");
    vi.stubEnv("JARVIS_DB_PERSISTENCE_PROBE_WRITE", "");
    const r = await runPersistenceProbe();
    expect(r.mode).toBe("dry_run");
    expect(r.status).toBe("planned");
  });
});
