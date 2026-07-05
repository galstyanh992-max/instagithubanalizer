import { ok, err, safe, parseJson } from "@/lib/api";
import { z } from "zod";
import { buildLocalAgentCommandEnvelope } from "@/lib/local-agent-runtime/envelope-builder";

export const runtime = "nodejs";
const schema = z.object({
  text: z.string().min(1).max(2000),
  capability: z.enum(["workspace_read", "workspace_write", "safe_command", "preview_open", "mcp_bridge", "desktop_commander", "browser_control", "app_control", "unknown"]).optional(),
  actorId: z.string().optional(), actorRole: z.string().optional(),
  actorSource: z.enum(["web", "telegram", "api", "system", "agent"]).optional(),
  workspaceId: z.string().optional(),
});

export const POST = safe(async (req: Request) => {
  const body = await parseJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("text required", 400, { issues: parsed.error.flatten() });
  const plan = await buildLocalAgentCommandEnvelope(parsed.data);
  return ok({ plan }); // never executes
});
