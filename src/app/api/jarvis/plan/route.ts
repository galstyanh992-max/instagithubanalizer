import { NextResponse } from "next/server";
import { jarvisRoleRouter } from "@/services/jarvis-role-router.service";
import { initProviders } from "@/lib/ai-provider/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  request: z.string().min(1).max(20000),
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

    const plan = await jarvisRoleRouter.planTask(parsed.data.request);

    return NextResponse.json(plan);
  } catch (error) {
    console.error("[jarvis/plan] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    );
  }
}