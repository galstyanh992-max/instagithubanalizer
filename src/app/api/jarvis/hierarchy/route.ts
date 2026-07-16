import { NextResponse } from "next/server";
import { jarvisRoleRouter } from "@/services/jarvis-role-router.service";
import { initProviders } from "@/lib/ai-provider/server";
import { resolveRoleBindings } from "@/lib/ai-provider/model-hierarchy";
import { getProviderEntryById } from "@/lib/ai-provider/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await initProviders();
  const statuses = jarvisRoleRouter.getRoleStatuses();
  const bindings = resolveRoleBindings();

  const enriched = statuses.map((s) => {
    const binding = bindings.find((b) => b.role === s.role);
    const entry = getProviderEntryById(s.providerId);
    return {
      ...s,
      providerName: entry?.name ?? s.providerId,
      configured: binding?.available ?? false,
    };
  });

  return NextResponse.json({
    roles: enriched,
    hierarchy: {
      orchestrator: "GPT-5.5 Thinking — CEO brain, planning, architecture",
      senior_dev: "GLM 5.2 — Senior Software Engineer (frontend/backend/refactor)",
      second_dev: "Kimi K2.7 Code — Automation Engineer (MCP/tool use/agents)",
      designer: "GLM 5.2 — Creative Director (design proposals)",
      design_critic: "GPT-5.5 Thinking — Design Critic (audits proposals)",
      research: "GPT-5.5 Thinking — Analyst (deep research)",
      browser: "Kimi K2.7 — Browser Agent (actions)",
      memory: "Ollama Cloud — Memory Agent (long-term memory)",
      legal: "Legal Armenia AI — Legal/RAG/PDF (isolated)",
      media: "OpenRouter — Media generation (image/video/music)",
    },
  });
}