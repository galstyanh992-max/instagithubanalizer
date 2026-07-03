import { ok, safe } from "@/lib/api";
import { deployReadinessService } from "@/services/deploy-readiness.service";

export const POST = safe(async () => {
  const result = deployReadinessService.check();
  return ok({ result });
});
