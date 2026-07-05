import { ok, safe } from "@/lib/api";
import { buildHandshakePlan } from "@/lib/local-agent-runtime/handshake";
import { buildLocalAgentQueueSpec } from "@/lib/local-agent-runtime/queue-spec";

export const runtime = "nodejs";

export const GET = safe(async () => {
  return ok({ handshake: buildHandshakePlan(), queueSpec: buildLocalAgentQueueSpec(), specOnly: true });
});
