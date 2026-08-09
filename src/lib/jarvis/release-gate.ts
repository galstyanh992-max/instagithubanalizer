// ─── JARVIS Agent Network — Release Gate ────────────────────
// Computes a release verdict from the task graph, findings, and verifications.

import { listFindings } from './finding-store';
import { listVerificationResults } from './verification-store';
import type { ReleaseGateResult, ReleaseVerdict, TaskGraph, Finding } from './types';

export interface ReleaseGateInput {
  runId: string;
  graph: TaskGraph;
  knownLimitations?: string[];
}

// ─── Verdict Logic ───────────────────────────────────────────

export async function evaluateReleaseGate(input: ReleaseGateInput): Promise<ReleaseGateResult> {
  const { runId, graph, knownLimitations = [] } = input;

  const findings = await listFindings({ runId });
  const verifications = await listVerificationResults(runId);

  const completed = graph.tasks
    .filter((t) => t.status === 'passed')
    .map((t) => t.title);
  const notCompleted = graph.tasks
    .filter((t) => t.status !== 'passed' && t.status !== 'skipped')
    .map((t) => t.title);

  const openFindings = findings.filter((f) => f.status === 'open' || f.status === 'in_repair');
  const openP0 = openFindings.filter((f) => f.severity === 'P0').map((f) => f.id);
  const openP1 = openFindings.filter((f) => f.severity === 'P1').map((f) => f.id);

  const failedVerifications = verifications.filter((v) => v.status === 'failed');
  const notRunVerifications = verifications.filter((v) => v.status === 'not_run');

  const verdict = computeVerdict({
    openP0,
    openP1,
    failedVerifications,
    notRunVerifications,
    notCompleted,
    knownLimitations,
  });

  const reasons: string[] = [];
  if (openP0.length > 0) reasons.push(`Open P0 findings: ${openP0.length}`);
  if (openP1.length > 0) reasons.push(`Open P1 findings: ${openP1.length}`);
  if (failedVerifications.length > 0) reasons.push(`Failed verifications: ${failedVerifications.length}`);
  if (notCompleted.length > 0) reasons.push(`Incomplete tasks: ${notCompleted.length}`);
  if (notRunVerifications.length > 0) reasons.push(`Verification checks not run: ${notRunVerifications.length}`);
  if (knownLimitations.length > 0) reasons.push(`Known limitations documented: ${knownLimitations.length}`);
  if (reasons.length === 0) reasons.push('All tasks passed and no open findings');

  return {
    verdict,
    reasons,
    completed,
    notCompleted,
    openP0,
    openP1,
    knownLimitations,
    evidence: [
      `Tasks: ${completed.length} completed, ${notCompleted.length} not completed`,
      `Findings: ${openFindings.length} open (${openP0.length} P0, ${openP1.length} P1)`,
      `Verifications: ${verifications.length} total, ${failedVerifications.length} failed, ${notRunVerifications.length} not run`,
    ].join(' | '),
  };
}

interface VerdictFactors {
  openP0: string[];
  openP1: string[];
  failedVerifications: { id: string; type: string }[];
  notRunVerifications: { id: string; type: string }[];
  notCompleted: string[];
  knownLimitations: string[];
}

function computeVerdict(factors: VerdictFactors): ReleaseVerdict {
  if (factors.openP0.length > 0 || factors.failedVerifications.some((v) => v.type === 'build')) {
    return 'STOP_UNSAFE';
  }

  if (factors.openP1.length > 0 || factors.notCompleted.length > 0 || factors.failedVerifications.length > 0) {
    return 'NOT_READY';
  }

  if (factors.notRunVerifications.length > 0 || factors.knownLimitations.length > 0) {
    return 'READY_FOR_INTERNAL_TESTING';
  }

  return 'READY_FOR_PRODUCTION';
}

/**
 * Synchronous evaluation for dry-run / unit tests without DB reads.
 */
export function evaluateReleaseGateSync(
  graph: TaskGraph,
  findings: Finding[] = [],
  knownLimitations: string[] = []
): ReleaseGateResult {
  const completed = graph.tasks.filter((t) => t.status === 'passed').map((t) => t.title);
  const notCompleted = graph.tasks.filter((t) => t.status !== 'passed' && t.status !== 'skipped').map((t) => t.title);

  const openFindings = findings.filter((f) => f.status === 'open' || f.status === 'in_repair');
  const openP0 = openFindings.filter((f) => f.severity === 'P0').map((f) => f.id);
  const openP1 = openFindings.filter((f) => f.severity === 'P1').map((f) => f.id);

  const verdict = computeVerdict({
    openP0,
    openP1,
    failedVerifications: [],
    notRunVerifications: [],
    notCompleted,
    knownLimitations,
  });

  const reasons: string[] = [];
  if (openP0.length > 0) reasons.push(`Open P0 findings: ${openP0.length}`);
  if (openP1.length > 0) reasons.push(`Open P1 findings: ${openP1.length}`);
  if (notCompleted.length > 0) reasons.push(`Incomplete tasks: ${notCompleted.length}`);
  if (knownLimitations.length > 0) reasons.push(`Known limitations documented: ${knownLimitations.length}`);
  if (reasons.length === 0) reasons.push('All tasks passed and no open findings');

  return {
    verdict,
    reasons,
    completed,
    notCompleted,
    openP0,
    openP1,
    knownLimitations,
    evidence: `Tasks: ${completed.length}/${graph.tasks.length} passed | Open findings: ${openFindings.length}`,
  };
}
