import { ok, err, safe, parseJson } from "@/lib/api";
import { voiceCommandSchema } from "@/lib/validators";
import { voiceService } from "@/services/voice.service";
import { routeCommand } from "@/lib/command-router";
import { normalizeActor } from "@/lib/safety/actor";

export const runtime = "nodejs";

export const POST = safe(async (req: Request) => {
  const body = await parseJson(req);
  const parsed = voiceCommandSchema.safeParse(body);
  if (!parsed.success) {
    return err("transcript required", 400, { issues: parsed.error.flatten() });
  }

  // Build actor from request body (unauthenticated → unknown, fail closed in router).
  const b = (body ?? {}) as Record<string, unknown>;
  const actor = normalizeActor(
    (b.actor as Record<string, unknown> | undefined) ?? { id: "web-user", role: "owner", source: "web" }
  );

  // Route through safety-aware command router first.
  const routed = await routeCommand({
    text: parsed.data.transcript,
    actor,
    source: "voice",
    workspaceId: typeof b.workspaceId === "string" ? b.workspaceId : undefined,
  });

  // Risky / denied / clarify → return router decision, do NOT execute.
  if (routed.nextAction !== "execute_safe_action") {
    return ok({ routed });
  }

  // Safe path: delegate to existing voice service (navigation/list responses).
  const result = await voiceService.handleCommand(parsed.data.transcript);
  return ok({ routed, result });
});
