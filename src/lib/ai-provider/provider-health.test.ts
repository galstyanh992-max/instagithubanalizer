import { describe, expect, it, vi } from "vitest";
import type { AIProvider } from "./types";
import { safeProviderMessage, testProviderHealth } from "./provider-health";

function provider(overrides: Partial<AIProvider> = {}): AIProvider {
  return {
    id: "real",
    name: "Real",
    isAvailable: vi.fn().mockResolvedValue(true),
    complete: vi.fn().mockResolvedValue({
      content: "ok",
      model: "model-a",
      provider: "real",
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      finishReason: "stop",
    }),
    listModels: vi.fn().mockResolvedValue([{ id: "model-a", name: "A", provider: "real" }]),
    ...overrides,
  };
}

describe("testProviderHealth", () => {
  it("blocks missing and mock providers as AUTH_REQUIRED", async () => {
    expect((await testProviderHealth(undefined, { providerId: "missing" })).code).toBe("AUTH_REQUIRED");
    expect((await testProviderHealth(provider({ id: "mock" }), { providerId: "mock" })).code).toBe("AUTH_REQUIRED");
  });

  it("uses the real availability and model-list adapter paths", async () => {
    const target = provider();
    const result = await testProviderHealth(target, { providerId: "real", model: "model-a" });
    expect(result.code).toBe("CONNECTED");
    expect(target.isAvailable).toHaveBeenCalledOnce();
    expect(target.listModels).toHaveBeenCalledOnce();
  });

  it("reports invalid models", async () => {
    expect((await testProviderHealth(provider(), { providerId: "real", model: "bad" })).code).toBe("INVALID_MODEL");
  });

  it("normalizes timeouts", async () => {
    const never = new Promise<boolean>(() => undefined);
    const result = await testProviderHealth(provider({ isAvailable: () => never }), {
      providerId: "real",
      timeoutMs: 5,
    });
    expect(result.code).toBe("TIMEOUT");
  });

  it("redacts credential-shaped adapter errors", () => {
    expect(safeProviderMessage(new Error("bearer=super-secret-token-value"))).not.toContain("super-secret-token-value");
  });
});
