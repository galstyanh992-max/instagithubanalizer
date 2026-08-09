// ─── JARVIS AGENT NETWORK — State Machines ──────────────────
// Guards and transition helpers for OrchestrationRun and TaskNode.

import type { OrchestrationRunStatus, TaskNodeStatus, TaskNode, TaskGraph } from './types';

// ─── OrchestrationRun State Machine ─────────────────────────

export const ORCHESTRATION_RUN_TRANSITIONS: Record<OrchestrationRunStatus, OrchestrationRunStatus[]> = {
  CREATED: ['ANALYZING', 'CANCELLED'],
  ANALYZING: ['PLANNING', 'BLOCKED', 'CANCELLED'],
  PLANNING: ['RUNNING', 'BLOCKED', 'CANCELLED'],
  RUNNING: ['VERIFYING', 'REPAIRING', 'BLOCKED', 'FAILED', 'COMPLETED', 'CANCELLED'],
  VERIFYING: ['REPAIRING', 'COMPLETED', 'FAILED', 'BLOCKED', 'CANCELLED'],
  REPAIRING: ['RUNNING', 'BLOCKED', 'FAILED', 'CANCELLED'],
  BLOCKED: ['REPAIRING', 'FAILED', 'CANCELLED'],
  FAILED: [],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionRun(
  from: OrchestrationRunStatus,
  to: OrchestrationRunStatus
): boolean {
  return ORCHESTRATION_RUN_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionRun(
  current: OrchestrationRunStatus,
  next: OrchestrationRunStatus
): OrchestrationRunStatus {
  if (!canTransitionRun(current, next)) {
    throw new Error(`Invalid run transition: ${current} → ${next}`);
  }
  return next;
}

export function isRunTerminal(status: OrchestrationRunStatus): boolean {
  return status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED';
}

// ─── TaskNode State Machine ─────────────────────────────────

export const TASK_NODE_TRANSITIONS: Record<TaskNodeStatus, TaskNodeStatus[]> = {
  not_started: ['ready', 'in_progress'],
  ready: ['in_progress', 'skipped'],
  in_progress: ['verify', 'passed', 'failed', 'blocked'],
  verify: ['passed', 'failed', 'blocked'],
  passed: [],
  failed: ['ready'], // retry path via repair loop
  blocked: ['ready'],  // unblocked via repair loop
  skipped: [],
};

export function canTransitionTask(from: TaskNodeStatus, to: TaskNodeStatus): boolean {
  return TASK_NODE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionTask(current: TaskNodeStatus, next: TaskNodeStatus): TaskNodeStatus {
  if (!canTransitionTask(current, next)) {
    throw new Error(`Invalid task transition: ${current} → ${next}`);
  }
  return next;
}

export function isTaskTerminal(status: TaskNodeStatus): boolean {
  return status === 'passed' || status === 'failed' || status === 'blocked' || status === 'skipped';
}

// ─── Task Graph Scheduler ───────────────────────────────────

/**
 * Recompute ready tasks from a task graph.
 * A task is ready when:
 *   - status is not_started or failed/blocked (after repair)
 *   - all dependencies are passed or skipped
 */
export function recomputeReady(graph: TaskGraph): TaskGraph {
  const passedOrSkipped = new Set(
    graph.tasks
      .filter((t) => t.status === 'passed' || t.status === 'skipped')
      .map((t) => t.id)
  );

  const ready = graph.tasks
    .filter(
      (t) =>
        (t.status === 'not_started' || t.status === 'ready' || t.status === 'failed' || t.status === 'blocked') &&
        t.dependsOn.every((depId) => passedOrSkipped.has(depId))
    )
    .map((t) => t.id);

  return {
    ...graph,
    ready,
    blocked: graph.tasks.filter((t) => t.status === 'blocked').map((t) => t.id),
    passed: graph.tasks.filter((t) => t.status === 'passed').map((t) => t.id),
    failed: graph.tasks.filter((t) => t.status === 'failed').map((t) => t.id),
  };
}

/**
 * Update a task's status in the graph and recompute dependents.
 */
export function updateTaskStatus(
  graph: TaskGraph,
  taskId: string,
  status: TaskNodeStatus
): TaskGraph {
  const tasks = graph.tasks.map((t) =>
    t.id === taskId ? { ...t, status: transitionTask(t.status, status) } : t
  );

  const updated: TaskGraph = recomputeReady({ ...graph, tasks });
  return updated;
}

/**
 * Build an adjacency list and dependents list for tasks.
 */
export function buildTaskGraph(tasks: TaskNode[]): TaskGraph {
  const graph: TaskGraph = {
    runId: tasks[0]?.runId ?? '',
    tasks,
    ready: [],
    blocked: [],
    passed: [],
    failed: [],
  };

  // Populate dependents
  const dependents: Record<string, string[]> = {};
  for (const task of tasks) {
    for (const depId of task.dependsOn) {
      if (!dependents[depId]) dependents[depId] = [];
      dependents[depId].push(task.id);
    }
  }
  graph.tasks = tasks.map((t) => ({ ...t, dependents: dependents[t.id] ?? [] }));

  const populated: TaskGraph = recomputeReady(graph);
  return populated;
}

/**
 * Determine whether all tasks in a graph are terminal.
 */
export function isGraphComplete(graph: TaskGraph): boolean {
  return graph.tasks.every((t) => isTaskTerminal(t.status));
}

/**
 * Determine whether any task is failed or blocked.
 */
export function hasGraphFailures(graph: TaskGraph): boolean {
  return graph.tasks.some((t) => t.status === 'failed' || t.status === 'blocked');
}

/**
 * Detect circular dependencies in a task graph.
 */
export function detectCycle(graph: TaskGraph): string[] | null {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  function visit(taskId: string): string[] | null {
    if (visiting.has(taskId)) {
      const cycleStart = stack.indexOf(taskId);
      return stack.slice(cycleStart).concat(taskId);
    }
    if (visited.has(taskId)) return null;

    visiting.add(taskId);
    stack.push(taskId);
    const task = graph.tasks.find((t) => t.id === taskId);
    if (task) {
      for (const dep of task.dependsOn) {
        const cycle = visit(dep);
        if (cycle) return cycle;
      }
    }
    stack.pop();
    visiting.delete(taskId);
    visited.add(taskId);
    return null;
  }

  for (const task of graph.tasks) {
    const cycle = visit(task.id);
    if (cycle) return cycle;
  }
  return null;
}
