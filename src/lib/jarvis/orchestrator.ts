// ─── JARVIS Agent Network — Orchestrator Facade ────────────
// High-level API: plan → execute → repair → verify → release gate.

import { buildPlan } from './planner';
import { ExecutionEngine } from './execution-engine';
import { runRepair } from './repair-loop';
import { evaluateReleaseGateSync } from './release-gate';
import { createArtifact } from './artifact-store';
import { saveCheckpoint } from './checkpoint-service';
import { recordDecision } from './decision-log';
import { createFinding } from './finding-store';
import { listFindings } from './finding-store';
import type {
  AgentResult,
  Artifact,
  Finding,
  OrchestrationRunStatus,
  ReleaseGateResult,
  RunContext,
  TaskGraph,
} from './types';

export interface OrchestrateInput {
  runId: string;
  goal: string;
  constraints?: string[];
  workspaceId?: string;
  projectId?: string;
  userId?: string;
  mode?: 'fast' | 'balanced' | 'thorough';
  dryRun?: boolean;
}

export interface OrchestrateOutput {
  runId: string;
  status: OrchestrationRunStatus;
  graph: TaskGraph;
  artifacts: Artifact[];
  findings: Finding[];
  releaseGate: ReleaseGateResult;
}

// ─── Orchestrator ────────────────────────────────────────────

export async function orchestrate(input: OrchestrateInput): Promise<OrchestrateOutput> {
  const { runId, goal, constraints = [], mode = 'balanced', dryRun = false } = input;

  // 1. Plan
  const { graph: initialGraph, planArtifact } = await buildPlan({ runId, goal, constraints });

  // 2. Persist plan artifact
  if (!dryRun) {
    await createArtifact(planArtifact);
  }

  // 3. Execute
  const engine = new ExecutionEngine({
    runId,
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    ownerUserId: input.userId,
    goal,
    constraints,
    mode,
    dryRun,
    onEvent: (event) => {
      if (event.type === 'task_failed') {
        void recordDecision({
          runId,
          phase: 'execution',
          decision: `Task ${event.taskId} failed`,
          rationale: event.error,
        });
      }
    },
  });

  const snapshot = await engine.start(initialGraph);

  // 4. Repair loop for failed tasks / findings
  const openFindings = dryRun ? [] : await listFindings({ runId });
  const failedTasks = snapshot.graph.tasks.filter((t) => t.status === 'failed' || t.status === 'blocked');

  if (!dryRun && failedTasks.length > 0) {
    for (const task of failedTasks) {
      const finding = await createFinding({
        runId,
        severity: task.riskLevel === 'critical' ? 'P0' : task.riskLevel === 'high' ? 'P1' : 'P2',
        evidence: `Task failed or blocked: ${task.title}`,
        rootCause: task.result?.summary ?? task.description,
      });
      openFindings.push(finding);
    }
  }

  const repairResults: Array<Awaited<ReturnType<typeof runRepair>>> = [];
  for (const finding of openFindings) {
    const repair = await runRepair({ runId, finding, dryRun });
    repairResults.push(repair);
  }

  // 5. Post-repair checkpoint
  const context: RunContext = {
    runId,
    goal,
    constraints,
    assumptions: [],
    confirmedFacts: [],
    currentPlan: snapshot.graph,
    artifacts: [],
    agentReports: snapshot.executions.map((e) => ({
      status: 'passed',
      summary: `Execution ${e.id} by ${e.role}`,
      completedTasks: [],
      artifacts: [],
      proposedChanges: [],
      changedFiles: [],
      commandsRun: [],
      verificationEvidence: [],
      confirmedFindings: [],
      assumptions: [],
      unknowns: [],
      blockers: [],
      recommendedNextAction: '',
      durationMs: e.durationMs ?? 0,
    })),
    decisions: [],
    blockers: [],
  };

  if (!dryRun) {
    await saveCheckpoint({ runId, phase: 'post-repair', graph: snapshot.graph, context });
  }

  // 6. Release gate
  const finalFindings = dryRun ? [] : await listFindings({ runId });
  const releaseGate = evaluateReleaseGateSync(snapshot.graph, finalFindings);

  // 7. Final report artifact
  const reportArtifact: Artifact = {
    id: `report-${runId}`,
    runId,
    type: 'release_report',
    title: 'JARVIS Network Run Report',
    content: JSON.stringify(
      {
        runId,
        status: snapshot.run.status,
        releaseGate,
        completedTasks: snapshot.graph.passed.length,
        totalTasks: snapshot.graph.tasks.length,
      },
      null,
      2
    ),
    metadata: { mode, dryRun },
    fileRefs: [],
    createdAt: new Date(),
  };

  if (!dryRun) {
    await createArtifact(reportArtifact);
  }

  return {
    runId,
    status: snapshot.run.status,
    graph: snapshot.graph,
    artifacts: [planArtifact, reportArtifact],
    findings: dryRun ? [] : await listFindings({ runId }),
    releaseGate,
  };
}

// ─── Helpers ─────────────────────────────────────────────────

export function createRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
