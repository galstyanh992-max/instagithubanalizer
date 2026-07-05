import { ok, safe } from "@/lib/api";
import { buildPhoneApprovalInbox } from "@/lib/phone-bridge";

export const runtime = "nodejs";

/**
 * GET /api/phone-bridge/approvals — UI-safe approval inbox.
 * Read-only. No approve/reject in this phase. Safe empty fallback without live DB.
 * Optional query: ?workspaceId=...
 */
export const GET = safe(async (req: Request) => {
  const workspaceId = new URL(req.url).searchParams.get("workspaceId") ?? undefined;
  const inbox = await buildPhoneApprovalInbox(workspaceId);
  return ok({ inbox });
});
