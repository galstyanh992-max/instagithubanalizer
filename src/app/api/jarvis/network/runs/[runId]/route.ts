import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireJarvisOwner } from "@/lib/jarvis/owner-guard";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ runId: string }>;
}

/**
 * GET /api/jarvis/network/runs/[runId]
 * Returns a run, its tasks, executions, artifacts, findings, checkpoints, and decision logs.
 */
export async function GET(_req: Request, { params }: Params) {
  try {
    const accessError = await requireJarvisOwner();
    if (accessError) return accessError;
    const { runId } = await params;

    const run = await db.orchestrationRun.findFirst({ where: { id: runId, ownerUserId: process.env.JARVIS_OWNER_ID } });
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const [tasks, executions, artifacts, findings, checkpoints, decisionLogs, verificationResults] =
      await Promise.all([
        db.agentTask.findMany({ where: { runId } }),
        db.agentExecution.findMany({ where: { runId } }),
        db.artifact.findMany({ where: { runId } }),
        db.finding.findMany({ where: { runId } }),
        db.checkpoint.findMany({ where: { runId } }),
        db.decisionLog.findMany({ where: { runId } }),
        db.verificationResult.findMany({ where: { runId } }),
      ]);

    return NextResponse.json({
      run,
      tasks,
      executions,
      artifacts,
      findings,
      checkpoints,
      decisionLogs,
      verificationResults,
    });
  } catch (error) {
    console.error("[api/jarvis/network/runs] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown" },
      { status: 500 }
    );
  }
}
