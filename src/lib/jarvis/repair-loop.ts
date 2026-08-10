// ─── JARVIS Agent Network — Repair Loop ────────────────────
// Takes one open Finding, assigns a fix task, runs it, and verifies.
// Integrates with the Finding store, Execution engine, and Verification engine.

import { updateFindingStatus, createFinding } from './finding-store';
import { createArtifact } from './artifact-store';
import { jarvisAgentRegistry } from './agent-registry';
import type { AgentDefinition, AgentRequest, AgentResult, Finding, TaskNode } from './types';

export interface RepairInput {
  runId: string;
  finding: Finding;
  fixAgent?: AgentDefinition;
  dryRun?: boolean;
}

export interface RepairOutput {
  finding: Finding;
  result: AgentResult;
  fixed: boolean;
  verificationId?: string;
  fixArtifactId?: string;
}

// ─── Repair Loop ─────────────────────────────────────────────

export async function runRepair(input: RepairInput): Promise<RepairOutput> {
  const { runId, finding, dryRun = false } = input;

  const agent = input.fixAgent ?? jarvisAgentRegistry.getByRole('frontend_engineer')!;

  const request: AgentRequest = {
    runId,
    taskId: `repair-${finding.id}`,
    agentId: agent.id,
    role: agent.role,
    mission: `Fix finding ${finding.id}: ${finding.rootCause ?? finding.evidence.slice(0, 80)}`,
    confirmedContext: { findingId: finding.id, severity: finding.severity, evidence: finding.evidence },
    inputArtifacts: finding.fixArtifactId ? [{ id: finding.fixArtifactId, type: 'code_report', title: 'Proposed fix' }] : [],
    availableTools: [],
    allowedScope: agent.allowedTools,
    forbiddenActions: agent.forbiddenActions,
    expectedOutput: { fixed: true, summary: '' },
    acceptanceCriteria: ['Root cause addressed', 'Verification passes'],
    verificationMethod: 'test',
    exitCriteria: ['No remaining open findings'],
    timeoutMs: 300000,
    maxRetries: 2,
  };

  // Simulate agent fix execution
  const result = await executeFix(request, finding, dryRun);

  // Record fix artifact if the agent produced one
  let fixArtifactId: string | undefined;
  if (result.artifacts.length > 0 && !dryRun) {
    const artifact = await createArtifact({
      runId,
      agentId: agent.id,
      type: 'code_report',
      title: `Fix for ${finding.id}`,
      content: result.summary,
      metadata: { findingId: finding.id, severity: finding.severity },
      fileRefs: result.changedFiles,
    });
    fixArtifactId = artifact.id;
  }

  // Run verification. runVerification's non-dryRun checks shell out (npm run
  // build/lint/test) — local-runtime only. Dynamic import keeps it out of
  // the Vercel web-control-plane bundle; this call path is only exercised
  // for real (non-dryRun) on the local daemon.
  const { runVerification } = await import('@/local-runtime/services/verification-engine');
  const verification = await runVerification({
    runId,
    type: finding.severity === 'P0' ? 'test' : 'self_check',
    dryRun,
  });

  const fixed = verification.status === 'passed';

  if (!dryRun) {
    await updateFindingStatus(
      finding.id,
      fixed ? 'verified' : 'in_repair',
      {
        fixSummary: result.summary,
        fixArtifactId,
        verificationId: verification.id,
      }
    );
  }

  // Return an updated Finding object (optimistic)
  const updatedFinding: Finding = {
    ...finding,
    status: fixed ? 'verified' : 'in_repair',
    fixSummary: result.summary,
    fixArtifactId,
    verificationId: verification.id,
    updatedAt: new Date(),
  };

  return {
    finding: updatedFinding,
    result,
    fixed,
    verificationId: verification.id,
    fixArtifactId,
  };
}

/**
 * Create a new finding from a failed task result.
 */
export async function findingFromFailure(
  runId: string,
  taskId: string,
  result: AgentResult,
  agentId?: string
): Promise<Finding> {
  const severity: Finding['severity'] = result.status === 'blocked' ? 'P1' : 'P2';
  const evidence = [result.summary, ...result.blockers, ...result.unknowns].join('\n');

  return createFinding({
    runId,
    severity,
    evidence,
    rootCause: result.blockers[0] ?? result.unknowns[0] ?? result.summary,
  });
}

// ─── Internal Fix Executor ─────────────────────────────────

async function executeFix(request: AgentRequest, finding: Finding, dryRun: boolean): Promise<AgentResult> {
  const start = Date.now();

  if (dryRun) {
    return {
      status: 'passed',
      summary: `Dry-run fix for ${finding.id}`,
      completedTasks: [request.mission],
      artifacts: [],
      proposedChanges: [],
      changedFiles: [],
      commandsRun: [],
      verificationEvidence: [],
      confirmedFindings: [],
      assumptions: [],
      unknowns: [],
      blockers: [],
      recommendedNextAction: 'Run verification in non-dry-run mode',
      durationMs: Date.now() - start,
    };
  }

  // In production this would dispatch to the real agent runtime.
  // For now we return a deterministic success so the loop closes.
  await new Promise((resolve) => setTimeout(resolve, 50));

  return {
    status: 'passed',
    summary: `Fixed finding ${finding.id}: ${finding.rootCause ?? 'issue addressed'}`,
    completedTasks: [request.mission],
    artifacts: [],
    proposedChanges: [],
    changedFiles: [],
    commandsRun: [],
    verificationEvidence: [],
    confirmedFindings: [finding.id],
    assumptions: [],
    unknowns: [],
    blockers: [],
    recommendedNextAction: 'Verify the fix',
    durationMs: Date.now() - start,
  };
}
