import { NextResponse } from "next/server";
import { jarvisRoleRouter } from "@/services/jarvis-role-router.service";
import { initProviders } from "@/lib/ai-provider/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  role: z.enum([
    "orchestrator",
    "senior_dev",
    "second_dev",
    "designer",
    "design_critic",
    "research",
    "browser",
    "memory",
    "legal",
    "media",
  ]),
  task: z.string().min(1).max(20000),
  context: z.string().max(20000).optional(),
  preferredModel: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(32768).optional(),
});

export async function POST(req: Request) {
  try {
    await initProviders();

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const response = await jarvisRoleRouter.delegateToSpecialist(
      parsed.data.role,
      parsed.data.task,
      parsed.data.context,
    );

    return NextResponse.json({
      content: response.content,
      model: response.model,
      provider: response.provider,
      role: response.role,
      latencyMs: response.latencyMs,
      usage: response.usage,
    });
  } catch (error) {
    console.error("[jarvis/delegate] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    );
  }
}