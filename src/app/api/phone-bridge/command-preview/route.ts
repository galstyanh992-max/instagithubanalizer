import { ok, err, safe, parseJson } from "@/lib/api";
import { previewPhoneCommand } from "@/lib/phone-bridge";
import type { PhoneCommandSource } from "@/lib/phone-bridge";

export const runtime = "nodejs";

const SOURCES: PhoneCommandSource[] = ["mobile_web", "telegram", "desktop_web", "api"];

/**
 * POST /api/phone-bridge/command-preview
 * Body: { text: string, source?: PhoneCommandSource, actorId?: string, workspaceId?: string }
 * Returns a UI-safe plan preview. NEVER executes, NEVER auto-approves.
 */
export const POST = safe(async (req: Request) => {
  const body = (await parseJson(req)) as Record<string, unknown>;
  const text = typeof body.text === "string" ? body.text : "";
  if (!text.trim()) {
    return err("text required", 400);
  }
  const source: PhoneCommandSource = SOURCES.includes(body.source as PhoneCommandSource)
    ? (body.source as PhoneCommandSource)
    : "mobile_web";

  const preview = await previewPhoneCommand({
    text,
    source,
    actorId: typeof body.actorId === "string" ? body.actorId : undefined,
    workspaceId: typeof body.workspaceId === "string" ? body.workspaceId : undefined,
  });

  // Preview only: response carries a plan, never an execution result.
  return ok({ preview });
});
