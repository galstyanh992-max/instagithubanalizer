import { ok, safe } from "@/lib/api";
import { getDbConfigStatus } from "@/lib/db-config/config";

export const runtime = "nodejs";

export const GET = safe(async () => {
  const cfg = getDbConfigStatus();
  return ok({ config: cfg, liveCheck: cfg.liveCheckPossible ? "NOT RUN (requires explicit smoke:db-live-readiness)" : "NOT RUN: DATABASE_URL not configured" });
});
