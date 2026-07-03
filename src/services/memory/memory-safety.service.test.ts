// Тесты для memory-safety.service.ts
import { describe, it, expect } from "vitest";
import { memorySafetyService } from "@/services/memory/memory-safety.service";

describe("memorySafetyService", () => {
  it("блокирует OpenAI ключи", () => {
    const result = memorySafetyService.checkMemory("My key is sk-abcdef1234567890abcdef1234567890");
    expect(result.safe).toBe(false);
  });

  it("блокирует GitHub токены", () => {
    const result = memorySafetyService.checkMemory("Token: ghp_1234567890abcdef1234567890abcdef1234");
    expect(result.safe).toBe(false);
  });

  it("блокирует process.env ссылки", () => {
    const result = memorySafetyService.checkMemory("Use process.env.OPENAI_API_KEY");
    expect(result.safe).toBe(false);
  });

  it("пропускает обычный текст", () => {
    const result = memorySafetyService.checkMemory("Jarwisyan использует русский язык по умолчанию");
    expect(result.safe).toBe(true);
  });

  it("фильтрует sensitive records", () => {
    const records = [
      { sensitive: true, content: "secret" },
      { sensitive: false, content: "safe content" },
    ];
    const result = memorySafetyService.filterSafe(records);
    expect(result.length).toBe(1);
    expect(result[0]).toBe("safe content");
  });
});
