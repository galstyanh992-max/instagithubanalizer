import { ok, err, safe, parseJson } from "@/lib/api";
import { z } from "zod";
import { planMcpBridgeAction } from "@/lib/mcp-bridge/planner";

export const runtime = "nodejs";
const schema = z.object({
  text: z.string().min(1).max(2000),
  bridgeKind: z.enum(["mcp", "desktop_commander", "custom_local_agent"]).optional(),
  capability: z.enum(["filesystem_read", "filesystem_write", "terminal_command", "browser_control", "app_control", "clipboard", "screenshot", "window_management", "mcp_tool_call", "unknown"]).optional(),
  actorId: z.string().optional(), actorRole: z.string().optional(),
  actorSource: z.enum(["web", "telegram", "api", "system", "agent"]).optional(),
  workspaceId: z.string().optional(), targetPath: z.string().optional(), command: z.string().optional(),
});

export const POST = safe(async (req: Request) => {
  const body = await parseJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("text required", 400, { issues: parsed.error.flatten() });
  const plan = await planMcpBridgeAction(parsed.data);
  return ok({ plan }); // never connects, never executes
});
