import { NextResponse } from "next/server";
import { orchestrate, createRunId } from "@/lib/jarvis/orchestrator";
import type { OrchestrateInput } from "@/lib/jarvis/orchestrator";
import { parseJson } from "@/lib/api";
import { requireJarvisOwner } from "@/lib/jarvis/owner-guard";

export const runtime = "nodejs";
const MODES = new Set(["fast", "balanced", "thorough"]);

export async function parseNetworkRequest(req: Request): Promise<Partial<OrchestrateInput>> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return await parseJson(req) as Partial<OrchestrateInput>;
  }
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const raw = await req.text();
    if (raw.length > 16_384) throw new Error("Form body too large");
    const form = new URLSearchParams(raw);
    const constraints = String(form.get("constraints") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const requestedMode = String(form.get("mode") ?? "balanced");
    return {
      goal: String(form.get("goal") ?? ""),
      constraints,
      mode: MODES.has(requestedMode) ? requestedMode as OrchestrateInput["mode"] : "balanced",
      dryRun: String(form.get("dryRun") ?? "") === "true",
    };
  }
  throw new Error("Unsupported Content-Type");
}

/**
 * POST /api/jarvis/network
 * Body: { goal: string, constraints?: string[], mode?: "fast"|"balanced"|"thorough", dryRun?: boolean }
 * Starts a JARVIS Agent Network run and returns the plan, status, and release gate.
 */
export async function POST(req: Request) {
  try {
    const accessError = await requireJarvisOwner();
    if (accessError) return accessError;
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== new URL(req.url).host) {
      return NextResponse.json({ error: "Cross-origin orchestration is forbidden" }, { status: 403 });
    }
    const body = await parseNetworkRequest(req);
    const { goal, constraints = [], mode = "balanced", dryRun = false } = body;

    if (!goal || typeof goal !== "string") {
      return NextResponse.json({ error: "goal is required" }, { status: 400 });
    }

    const runId = createRunId();
    const result = await orchestrate({
      runId,
      goal,
      constraints,
      mode,
      dryRun,
      userId: process.env.JARVIS_OWNER_ID,
    });

    return NextResponse.json({
      runId,
      status: result.status,
      graph: result.graph,
      artifacts: result.artifacts,
      findings: result.findings,
      releaseGate: result.releaseGate,
    });
  } catch (error) {
    console.error("[api/jarvis/network] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown" },
      { status: 500 }
    );
  }
}
