import { NextResponse } from "next/server";
import { designCriticService } from "@/services/jarvis-design-critic.service";
import { initProviders } from "@/lib/ai-provider/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  brief: z.string().min(1).max(8000),
  context: z.string().max(20000).optional(),
  maxRounds: z.number().int().min(1).max(5).default(2),
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

    const result = await designCriticService.runDesignLoop(
      parsed.data.brief,
      parsed.data.context,
      parsed.data.maxRounds,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[jarvis/design-critic] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    );
  }
}