import { ok, safe } from "@/lib/api";
import { getLocalAgentProfile } from "@/lib/local-agent-runtime/handshake";

export const runtime = "nodejs";

export const GET = safe(async () => {
  const profile = getLocalAgentProfile();
  return ok({ profile, connected: false });
});
