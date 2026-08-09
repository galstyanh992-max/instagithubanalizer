import { ok, safe } from "@/lib/api";
import { registerBuiltinSkillsAndTools } from "@/lib/agent-core/config-loader";
import { skillRegistry } from "@/lib/skills/registry";
import { toolRegistry } from "@/lib/tools/registry";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export const GET = safe(async () => {
  registerBuiltinSkillsAndTools();
  const settings = await db.setting.findUnique({
    where: { id: "singleton" },
    select: { vercelToken: true },
  }).catch(() => null);

  return ok({
    skills: skillRegistry.getStats(),
    tools: toolRegistry.getStats(),
    plugins: [
      { id: "mcp-bridge", name: "MCP Bridge", configured: true },
      { id: "vercel", name: "Vercel", configured: Boolean(settings?.vercelToken) },
    ],
  });
});
