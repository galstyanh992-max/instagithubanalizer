import { describe, it, expect, beforeEach } from "vitest";
import { looksLikeSecret, validateSecretRef, redactApiRegistryItem } from "./secret-policy";
import {
  registerApi, listApis, getApiById, getApisByCategory, updateApiStatus,
  getApiCapabilities, planConnectionTest, buildDailyTopicReportPlan, resetRegistry,
} from "./api-registry-service";
import { DEFAULT_APIS } from "./defaults";
import { setBrainAdapter } from "@/lib/project-brain/project-brain-service";
import { InMemoryBrainAdapter } from "@/lib/project-brain/in-memory-adapter";
import type { ApiRegistryItem } from "./types";

const brain = new InMemoryBrainAdapter();
beforeEach(() => { resetRegistry(); brain.reset(); setBrainAdapter(brain); });

const item: ApiRegistryItem = {
  id: "test-api", name: "Test", category: "custom", provider: "custom",
  secretRef: "TEST_API_KEY", capabilities: [], status: "not_configured", enabled: false,
};

describe("secret policy", () => {
  it("detects real-looking secrets", () => {
    expect(looksLikeSecret("sk-abcdef1234567890abcd")).toBe(true);
    expect(looksLikeSecret("ghp_abcdefghijklmnopqrstuvwxyz1234")).toBe(true);
    expect(looksLikeSecret("OPENROUTER_API_KEY")).toBe(false);
  });
  it("validates env-style ref, rejects real key", () => {
    expect(validateSecretRef("OPENROUTER_API_KEY").ok).toBe(true);
    expect(validateSecretRef("sk-abcdef1234567890abcd").ok).toBe(false);
    expect(validateSecretRef("lowercase").ok).toBe(false);
  });
  it("redacts secret-value in secretRef field", () => {
    const r = redactApiRegistryItem({ ...item, secretRef: "sk-abcdef1234567890abcd" });
    expect(r.secretRef).toBe("[REDACTED]");
  });
});

describe("registry service", () => {
  it("register metadata", () => {
    expect(registerApi(item).ok).toBe(true);
    expect(getApiById("test-api")?.name).toBe("Test");
  });
  it("reject real-looking secret value in field", () => {
    const r = registerApi({ ...item, notes: "key sk-abcdef1234567890abcd" });
    expect(r.ok).toBe(false);
  });
  it("allow env-style secretRef", () => {
    expect(registerApi({ ...item, secretRef: "MY_API_KEY" }).ok).toBe(true);
  });
  it("list by category", () => {
    expect(getApisByCategory("ai").length).toBeGreaterThanOrEqual(2);
  });
  it("capabilities", () => {
    expect(getApiCapabilities("github").length).toBeGreaterThan(0);
  });
  it("update status", () => {
    expect(updateApiStatus("glm", "test_passed")).toBe(true);
    expect(getApiById("glm")?.status).toBe("test_passed");
  });
  it("plan connection test = PLANNED, no call", () => {
    const p = planConnectionTest("openrouter");
    expect(p?.status).toBe("PLANNED");
    expect(p?.note).toMatch(/no external call/i);
  });
  it("daily topic report plan (finance)", () => {
    const p = buildDailyTopicReportPlan("finance");
    expect(p.status).toBe("PLANNED");
  });
  it("defaults contain no real keys", () => {
    for (const a of DEFAULT_APIS) {
      expect(looksLikeSecret(a.secretRef ?? "")).toBe(false);
    }
  });
});

describe("command router api_task", () => {
  it("recognizes api task", async () => {
    setBrainAdapter(brain);
    const { routeCommand } = await import("@/lib/command-router/router");
    const r = await routeCommand({ text: "какие api у нас есть", actor: { id: "u1", role: "owner", source: "web" }, source: "web" });
    expect(r.intent).toBe("api_task");
    expect((r.data as any)?.apis?.length).toBeGreaterThan(0);
  });
});
