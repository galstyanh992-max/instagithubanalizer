import { describe, expect, it } from 'vitest';
import { buildTaskGraph } from './state';
import { resumeGraphFromCheckpoint } from './checkpoint-service';
import type { Checkpoint, TaskNode, TaskNodeStatus } from './types';

function task(id: string, status: TaskNodeStatus, dependsOn: string[] = []): TaskNode {
  return {
    id,
    runId: 'run-1',
    title: id,
    description: id,
    agentId: 'orchestrator',
    role: 'orchestrator',
    toolKeys: [],
    dependsOn,
    dependents: [],
    status,
    priority: 'medium',
    riskLevel: 'low',
    artifactsIn: [],
    artifactsOut: [],
    findings: [],
    retryCount: 0,
  };
}

describe('resumeGraphFromCheckpoint', () => {
  it('preserves passed tasks and retries only interrupted or failed work', () => {
    const graph = buildTaskGraph([
      task('done', 'passed'),
      task('interrupted', 'in_progress', ['done']),
      task('failed', 'failed', ['interrupted']),
    ]);
    const checkpoint = {
      id: 'checkpoint-1',
      runId: 'run-1',
      phase: 'after-task-done',
      taskStatuses: { done: 'passed', interrupted: 'in_progress', failed: 'failed' },
      context: {
        runId: 'run-1',
        goal: 'resume safely',
        constraints: [],
        assumptions: [],
        confirmedFacts: [],
        currentPlan: graph,
        artifacts: [],
        agentReports: [],
        decisions: [],
        blockers: [],
      },
      createdAt: new Date(),
    } satisfies Checkpoint;

    const resumed = resumeGraphFromCheckpoint(graph, checkpoint);
    expect(resumed.tasks.find((entry) => entry.id === 'done')?.status).toBe('passed');
    expect(resumed.tasks.find((entry) => entry.id === 'interrupted')?.status).toBe('ready');
    expect(resumed.tasks.find((entry) => entry.id === 'failed')?.status).toBe('ready');
    expect(resumed.ready).toEqual(['interrupted']);
  });
});
