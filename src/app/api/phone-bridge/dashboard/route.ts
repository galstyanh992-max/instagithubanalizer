import { ok, safe } from "@/lib/api";
import { buildPhoneBridgeDashboard } from "@/lib/phone-bridge";

export const runtime = "nodejs";

/** GET /api/phone-bridge/dashboard — UI-safe module status. No execution, no secrets, no live DB required. */
export const GET = safe(async () => {
  const dashboard = buildPhoneBridgeDashboard();
  return ok({ dashboard });
});
