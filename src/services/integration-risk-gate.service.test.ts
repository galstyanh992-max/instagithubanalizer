// Тесты для integration-risk-gate.service.ts
import { describe, it, expect } from "vitest";
import { integrationRiskGate } from "@/services/integration-risk-gate.service";

describe("integrationRiskGate", () => {
  it("блокирует AGPL лицензию", () => {
    const result = integrationRiskGate.evaluate({
      license: "agpl-3.0", gpuRequired: false, archived: false, disabled: false,
      commercialUseStatus: "HIGH_RISK", securityStatus: "SAFE", hasDocker: true,
      description: "test", readmeText: "", openIssues: 10, stars: 100,
    });
    expect(result.allowed).toBe(false);
    expect(result.riskLevel).toBe("HIGH");
    expect(result.blockingIssues.length).toBeGreaterThan(0);
  });

  it("разрешает MIT лицензию", () => {
    const result = integrationRiskGate.evaluate({
      license: "mit", gpuRequired: false, archived: false, disabled: false,
      commercialUseStatus: "SAFE", securityStatus: "SAFE", hasDocker: true,
      description: "test", readmeText: "", openIssues: 10, stars: 100,
    });
    expect(result.allowed).toBe(true);
    expect(result.riskLevel).toBe("LOW");
  });

  it("блокирует архивированные репозитории", () => {
    const result = integrationRiskGate.evaluate({
      license: "mit", gpuRequired: false, archived: true, disabled: false,
      commercialUseStatus: "SAFE", securityStatus: "SAFE", hasDocker: false,
      description: "test", readmeText: "", openIssues: 5, stars: 50,
    });
    expect(result.allowed).toBe(false);
    expect(result.riskLevel).toBe("HIGH");
  });

  it("предупреждает о GPU requirement", () => {
    const result = integrationRiskGate.evaluate({
      license: "mit", gpuRequired: true, archived: false, disabled: false,
      commercialUseStatus: "SAFE", securityStatus: "SAFE", hasDocker: false,
      description: "test", readmeText: "", openIssues: 5, stars: 50,
    });
    expect(result.warnings).toContainEqual(expect.stringContaining("GPU"));
  });
});
