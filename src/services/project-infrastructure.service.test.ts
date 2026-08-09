import { describe, expect, it } from "vitest";
import { normalizeDDrivePath, redactSecrets } from "./project-infrastructure.service";

describe("infrastructure safety helpers", () => {
  it("accepts only child paths on D drive", () => {
    expect(normalizeDDrivePath("D:\\Projects\\jarvis-demo")).toBe("D:\\Projects\\jarvis-demo");
    expect(() => normalizeDDrivePath("C:\\temp")).toThrow(/forbidden/);
    expect(() => normalizeDDrivePath("\\\\server\\share")).toThrow(/forbidden/);
    expect(() => normalizeDDrivePath("D:\\")).toThrow(/child/);
  });

  it("redacts secret-shaped values", () => {
    expect(redactSecrets({ apiKey: "private", nested: { ok: true } })).toEqual({ apiKey: "[REDACTED]", nested: { ok: true } });
  });
});
