import { NextResponse } from "next/server";
import { parseTask, executeTask, type JarvisTask } from "@/services/jarvis-orchestrator.service";
import { initProviders } from "@/lib/ai-provider/server";

export const runtime = "nodejs";

/**
 * Jarvis orchestrator endpoint.
 * POST { "message": "сгенерируй изображение космического кота" }
 * Returns the parsed task + chat result, or instructions for media upload.
 */
export async function POST(req: Request) {
  try {
    await initProviders();
    const { message, preferredType } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const task = parseTask(message, preferredType as JarvisTask["type"] | undefined);
    const execution = await executeTask(task);

    return NextResponse.json({
      task,
      ...execution,
    });
  } catch (error) {
    console.error("[jarvis/orchestrate] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown" },
      { status: 500 }
    );
  }
}
