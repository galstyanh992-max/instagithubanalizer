import { ok, safe } from "@/lib/api";
import { getDefaultMcpBridgeProfiles } from "@/lib/mcp-bridge/profiles";
import { getMcpBridgeStatus } from "@/lib/mcp-bridge/handshake";

export const runtime = "nodejs";

export const GET = safe(async () => {
  const profiles = getDefaultMcpBridgeProfiles();
  const handshakes = profiles.map((p) => getMcpBridgeStatus(p.kind));
  return ok({ profiles, handshakes, connected: false });
});
