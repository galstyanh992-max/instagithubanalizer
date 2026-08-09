import { NextResponse } from "next/server";
import { runVerification } from "@/lib/jarvis/verification-engine";
import { listVerificationResults } from "@/lib/jarvis/verification-store";
import type { VerificationType } from "@/lib/jarvis/types";

export const runtime = "nodejs";

/**
 * POST /api/jarvis/network/verify
 * Body: { runId, taskId?, type, dryRun? }
 * Runs a verification check and returns the result.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      runId?: string;
      taskId?: string;
      type?: VerificationType;
      dryRun?: boolean;
    };

    if (!body.runId || !body.type) {
      return NextResponse.json(
        { error: "runId and type are required" },
        { status: 400 }
      );
    }

    const result = await runVerification({
      runId: body.runId,
      taskId: body.taskId,
      type: body.type,
      dryRun: body.dryRun ?? false,
    });

    return NextResponse.json({ verification: result });
  } catch (error) {
    console.error("[api/jarvis/network/verify] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jarvis/network/verify?runId=...
 * Lists verification results for a run.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const runId = searchParams.get("runId");

    if (!runId) {
      return NextResponse.json({ error: "runId query param required" }, { status: 400 });
    }

    const results = await listVerificationResults(runId);
    return NextResponse.json({ verifications: results });
  } catch (error) {
    console.error("[api/jarvis/network/verify] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown" },
      { status: 500 }
    );
  }
}
