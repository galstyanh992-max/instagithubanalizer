import { db } from "@/lib/db";
import { ok, err, safe, parseParams } from "@/lib/api";
import { integrationRiskGate } from "@/services/integration-risk-gate.service";

export const POST = safe(async (_req: Request, ctx) => {
  const { id } = await parseParams(ctx);
  const repo = await db.repository.findUnique({ where: { id } });
  if (!repo) return err("Repository not found", 404);
  const result = integrationRiskGate.evaluate({
    license: repo.license, gpuRequired: repo.gpuRequired, archived: repo.archived,
    disabled: repo.disabled, commercialUseStatus: repo.commercialUseStatus,
    securityStatus: repo.securityStatus, hasDocker: repo.hasDocker,
    description: repo.description, readmeText: repo.readmeText,
    openIssues: repo.openIssues, stars: repo.stars,
  });
  return ok({ riskGate: result });
});
