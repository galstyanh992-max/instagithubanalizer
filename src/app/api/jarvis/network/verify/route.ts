import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { listVerificationResults } from "@/lib/jarvis/verification-store";
import type { VerificationType } from "@/lib/jarvis/types";

export const runtime = "nodejs";

/**
 * POST /api/jarvis/network/verify
 * Body: { runId, taskId?, type, dryRun? }
 * Runs a verification check and returns the result.
 *
 * runVerification's non-dryRun checks call execSync (npm run
 * build/lint/test/typecheck) — local-runtime only. Never imported
 * statically so it can't ship in a Vercel web-control-plane bundle.
 */
export async function POST(req: Request) {
  try {
    if (env.JARVIS_RUNTIME_ROLE === "web-control-plane") {
      return NextResponse.json(
        { error: "Verification runs on the local JARVIS runtime only." },
        { status: 501 }
      );
    }

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

    const { runVerification } = await import("@/local-runtime/services/verification-engine");
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
