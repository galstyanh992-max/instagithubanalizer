// Тесты для license.service.ts
import { describe, it, expect } from "vitest";
import { licenseService } from "@/services/license.service";

describe("licenseService", () => {
  it("классифицирует MIT как SAFE", () => {
    const result = licenseService.classifyLicense("mit");
    expect(result.status).toBe("SAFE");
  });

  it("классифицирует Apache-2.0 как SAFE", () => {
    const result = licenseService.classifyLicense("apache-2.0");
    expect(result.status).toBe("SAFE");
  });

  it("классифицирует AGPL-3.0 как HIGH_RISK", () => {
    const result = licenseService.classifyLicense("agpl-3.0");
    expect(result.status).toBe("HIGH_RISK");
  });

  it("классифицирует GPL-3.0 как WARNING", () => {
    const result = licenseService.classifyLicense("gpl-3.0");
    expect(result.status).toBe("WARNING");
  });

  it("классифицирует null как HIGH_RISK", () => {
    const result = licenseService.classifyLicense(null);
    expect(result.status).toBe("HIGH_RISK");
  });

  it("классифицирует unknown как UNKNOWN", () => {
    const result = licenseService.classifyLicense("some-weird-license");
    expect(result.status).toBe("UNKNOWN");
  });
});
