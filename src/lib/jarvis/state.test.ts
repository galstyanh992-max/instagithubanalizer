import { describe, it, expect } from 'vitest';
import {
  canTransitionRun,
  transitionRun,
  transitionTask,
  buildTaskGraph,
  recomputeReady,
  updateTaskStatus,
  detectCycle,
} from './state';
import type { TaskNode, TaskGraph } from './types';

function makeTask(id: string, deps: string[] = []): TaskNode {
  return {
    id,
    runId: 'run-1',
    title: id,
    description: id,
    agentId: 'agent-1',
    role: 'frontend_engineer',
    toolKeys: [],
    dependsOn: deps,
    dependents: [],
    status: 'not_started',
    priority: 'medium',
    riskLevel: 'low',
    artifactsIn: [],
    artifactsOut: [],
    findings: [],
    retryCount: 0,
  };
}

describe('state machines', () => {
  it('allows valid run transitions', () => {
    expect(canTransitionRun('CREATED', 'ANALYZING')).toBe(true);
    expect(canTransitionRun('RUNNING', 'COMPLETED')).toBe(true);
    expect(canTransitionRun('COMPLETED', 'RUNNING')).toBe(false);
  });

  it('throws on invalid task transition', () => {
    expect(() => transitionTask('not_started', 'passed')).toThrow();
  });
});

describe('task graph', () => {
  it('computes ready tasks from dependencies', () => {
    const graph = buildTaskGraph([makeTask('a'), makeTask('b', ['a'])]);
    expect(graph.ready).toContain('a');
    expect(graph.ready).not.toContain('b');
  });

  it('updates dependents and ready list after pass', () => {
    let graph = buildTaskGraph([makeTask('a'), makeTask('b', ['a'])]);
    graph = updateTaskStatus(graph, 'a', 'in_progress');
    graph = updateTaskStatus(graph, 'a', 'verify');
    graph = updateTaskStatus(graph, 'a', 'passed');
    expect(graph.ready).toContain('b');
    expect(graph.passed).toContain('a');
  });

  it('detects cycles', () => {
    const graph = buildTaskGraph([makeTask('a', ['b']), makeTask('b', ['a'])]);
    expect(detectCycle(graph)).toContain('a');
  });

  it('recomputeReady returns a full graph', () => {
    const graph = buildTaskGraph([makeTask('a')]);
    const updated = recomputeReady(graph);
    expect(updated.ready).toContain('a');
    expect(updated.passed).toEqual([]);
  });
});
