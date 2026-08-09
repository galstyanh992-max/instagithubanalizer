// ─── JARVIS Agent Network — Execution Engine ─────────────────
// Schedules and runs tasks in a TaskGraph, records executions,
// updates state, and creates checkpoints. Uses deterministic scheduling.

import { db } from '@/lib/db';
import { jarvisAgentRegistry } from './agent-registry';
import {
  buildTaskGraph,
  recomputeReady,
  updateTaskStatus,
  canTransitionRun,
  transitionRun,
} from './state';
import type {
  AgentDefinition,
  AgentRequest,
  AgentResult,
  Checkpoint,
  OrchestrationRun,
  OrchestrationRunStatus,
  TaskGraph,
  TaskNode,
  TaskNodeStatus,
  RunContext,
} from './types';
import {
  DryRunAgentExecutor,
  ProductionAgentExecutor,
  type JarvisAgentExecutor,
} from './agent-executors';
import { resumeGraphFromCheckpoint } from './checkpoint-service';
import { discoverCapabilities } from './capability-discovery';
import { ExecutionFeedbackStore, inferTaskCapabilities, reduceToolContext } from './capability-intelligence';

const capabilityFeedback = new ExecutionFeedbackStore();

// ─── Options ─────────────────────────────────────────────────

export interface ExecutionEngineOptions {
  runId: string;
  workspaceId?: string;
  projectId?: string;
  ownerUserId?: string;
  goal: string;
  constraints: string[];
  mode?: 'fast' | 'balanced' | 'thorough';
  maxRetries?: number;
  timeoutMs?: number;
  onEvent?: (event: ExecutionEvent) => void | Promise<void>;
  dryRun?: boolean;
  executor?: JarvisAgentExecutor;
  signal?: AbortSignal;
}

export type ExecutionEvent =
  | { type: 'run_status_changed'; status: OrchestrationRunStatus }
  | { type: 'task_ready'; taskId: string }
  | { type: 'task_started'; taskId: string }
  | { type: 'task_completed'; taskId: string; result: AgentResult }
  | { type: 'task_failed'; taskId: string; error: string }
  | { type: 'checkpoint_created'; checkpointId: string; phase: string }
  | { type: 'run_finished'; status: OrchestrationRunStatus };

export interface ExecutionSnapshot {
  run: { id: string; status: OrchestrationRunStatus; goal: string; constraints: string[] };
  graph: TaskGraph;
  executions: { id: string; agentId: string; role: string; status: string; durationMs: number | null }[];
  checkpoints: Checkpoint[];
}

// ─── Engine ──────────────────────────────────────────────────

export class ExecutionEngine {
  private options: ExecutionEngineOptions;
  private graph: TaskGraph | null = null;
  private run: OrchestrationRun | null = null;
  private readonly executor: JarvisAgentExecutor;

  constructor(options: ExecutionEngineOptions) {
    this.options = options;
    this.executor = options.executor ?? (options.dryRun ? new DryRunAgentExecutor() : new ProductionAgentExecutor());
  }

  private emit(event: ExecutionEvent) {
    const handler = this.options.onEvent;
    if (handler) {
      void handler(event);
    }
  }

  /**
   * Initialize a new run in the persistence layer.
   */
  async createRun(graph: TaskGraph): Promise<OrchestrationRun> {
    const { runId, workspaceId, projectId, ownerUserId, goal, constraints, mode = 'balanced' } = this.options;

    const dbRun = await db.orchestrationRun.create({
      data: {
        id: runId,
        workspaceId,
        projectId,
        ownerUserId,
        goal,
        constraints: JSON.stringify(constraints),
        status: 'CREATED',
        mode,
        context: JSON.stringify({ goal, constraints }),
      },
    });

    const run: OrchestrationRun = {
      id: dbRun.id,
      workspaceId: dbRun.workspaceId ?? undefined,
      projectId: dbRun.projectId ?? undefined,
      ownerUserId: dbRun.ownerUserId ?? undefined,
      goal: dbRun.goal,
      constraints: JSON.parse(dbRun.constraints) as string[],
      status: dbRun.status as OrchestrationRunStatus,
      mode: dbRun.mode,
      maxAgents: dbRun.maxAgents,
      maxTasks: dbRun.maxTasks,
      maxRetries: dbRun.maxRetries,
      timeoutMs: dbRun.timeoutMs,
      context: JSON.parse(dbRun.context) as RunContext,
      createdAt: dbRun.createdAt,
      updatedAt: dbRun.updatedAt,
    };

    await db.agentTask.createMany({
      data: graph.tasks.map((t) => ({
        id: t.id,
        runId: t.runId,
        title: t.title,
        description: t.description,
        agentId: t.agentId,
        role: t.role,
        toolKeys: JSON.stringify(t.toolKeys),
        dependsOn: JSON.stringify(t.dependsOn),
        status: t.status,
        priority: t.priority,
        riskLevel: t.riskLevel,
        retryCount: t.retryCount,
      })),
    });

    this.run = run;
    return run;
  }

  /**
   * Start execution of a prepared graph.
   */
  async start(graph: TaskGraph): Promise<ExecutionSnapshot> {
    this.graph = buildTaskGraph(graph.tasks);

    if (!this.options.dryRun) {
      if (!this.run) {
        await this.createRun(this.graph);
      }
    }

    await this.transitionRun('ANALYZING');
    await this.transitionRun('PLANNING');
    await this.transitionRun('RUNNING');

    await this.createCheckpoint('before-run');
    return this.runLoop();
  }

  /**
   * Resume a persisted non-terminal run. Passed/skipped tasks remain terminal;
   * interrupted, failed, or blocked work is returned to the scheduler.
   */
  async resume(run: OrchestrationRun, graph: TaskGraph, checkpoint: Checkpoint): Promise<ExecutionSnapshot> {
    if (!['RUNNING', 'REPAIRING', 'BLOCKED'].includes(run.status)) {
      throw new Error(`Run ${run.id} cannot be resumed from ${run.status}`);
    }
    this.run = run;
    this.graph = resumeGraphFromCheckpoint(buildTaskGraph(graph.tasks), checkpoint);
    if (run.status === 'BLOCKED') await this.transitionRun('REPAIRING');
    if (this.run.status === 'REPAIRING') await this.transitionRun('RUNNING');
    await this.createCheckpoint('resume-start');
    return this.runLoop();
  }

  private async runLoop(): Promise<ExecutionSnapshot> {
    const maxIterations = 100;
    for (let i = 0; i < maxIterations; i++) {
      if (!this.graph) break;

      const ready = this.graph.ready.filter((id) => {
        const t = this.graph!.tasks.find((x) => x.id === id)!;
        return t.status === 'not_started' || t.status === 'ready';
      });

      if (ready.length === 0) {
        if (this.graph.tasks.every((t) => t.status === 'passed' || t.status === 'skipped')) {
          await this.transitionRun('VERIFYING');
          await this.createCheckpoint('after-run');
          await this.transitionRun('COMPLETED');
          break;
        }
        if (this.graph.tasks.some((t) => t.status === 'failed' || t.status === 'blocked')) {
          await this.transitionRun('REPAIRING');
          await this.createCheckpoint('on-failure');
          await this.transitionRun('BLOCKED');
          break;
        }
        // No ready tasks but not done — possible deadlock
        await this.transitionRun('BLOCKED');
        break;
      }

      for (const taskId of ready) {
        await this.executeTask(taskId);
      }

      // Recompute after each batch
      if (this.graph) {
        this.graph = recomputeReady(this.graph);
      }
    }

    const status = (this.run?.status as OrchestrationRunStatus) ?? 'FAILED';
    this.emit({ type: 'run_finished', status });

    return this.snapshot();
  }

  /**
   * Execute a single task node.
   */
  private async executeTask(taskId: string): Promise<void> {
    if (!this.graph) return;

    const task = this.graph.tasks.find((t) => t.id === taskId);
    if (!task) return;

    this.graph = updateTaskStatus(this.graph, taskId, 'in_progress');
    this.emit({ type: 'task_started', taskId });

    const agent = jarvisAgentRegistry.getById(task.agentId);
    const request = await this.buildAgentRequest(task, agent);

    if (!this.options.dryRun) {
      await db.agentTask.update({
        where: { id: taskId },
        data: { status: 'in_progress', request: JSON.stringify(request), startedAt: new Date() },
      });
    }

    try {
      if (!agent) {
        throw new Error(`Agent ${task.agentId} is not registered`);
      }
      const result = await this.executor.execute({
        agent,
        request,
        task,
        signal: this.options.signal,
      });

      task.result = result;
      const nextStatus: TaskNodeStatus = result.status === 'passed' ? 'passed' : result.status === 'blocked' ? 'blocked' : 'failed';
      if (!this.options.dryRun) {
        const feedbackTarget = request.availableTools[0]?.key ?? agent.id;
        await capabilityFeedback.record({
          capabilityId: feedbackTarget,
          taskClass: inferTaskCapabilities(`${task.title} ${task.description}`).taskClass,
          success: nextStatus === 'passed',
          durationMs: result.durationMs,
          failureClass: nextStatus === 'passed' ? undefined : nextStatus === 'blocked' ? 'policy' : 'runtime',
          metadata: { agentId: agent.id, verification: request.verificationMethod, status: nextStatus },
        }).catch(() => undefined);
      }
      this.graph = updateTaskStatus(this.graph, taskId, nextStatus);

      if (!this.options.dryRun) {
        if (nextStatus === 'passed') {
          const artifact = await db.artifact.create({
            data: {
              runId: task.runId,
              agentId: request.agentId,
              type: 'code_report',
              title: `${task.title} — agent result`,
              content: result.summary,
              metadata: JSON.stringify({ executor: this.executor.kind }),
              fileRefs: '[]',
            },
          });
          result.artifacts.push({ id: artifact.id, type: 'code_report', title: artifact.title });
        } else {
          await db.finding.create({
            data: {
              runId: task.runId,
              severity: 'P1',
              status: 'open',
              evidence: result.summary,
              rootCause: result.blockers.join('; ') || 'Agent execution failed',
            },
          });
        }
        await db.agentExecution.create({
          data: {
            runId: task.runId,
            agentId: request.agentId,
            role: request.role,
            request: JSON.stringify(request),
            result: JSON.stringify(result),
            status: nextStatus === 'passed' ? 'success' : nextStatus,
            durationMs: result.durationMs,
          },
        });
        await db.agentTask.update({
          where: { id: taskId },
          data: { status: nextStatus, result: JSON.stringify(result), finishedAt: new Date() },
        });
      }

      await this.createCheckpoint(`after-task-${taskId}`);
      if (nextStatus === 'passed') {
        this.emit({ type: 'task_completed', taskId, result });
      } else {
        this.emit({ type: 'task_failed', taskId, error: result.summary });
      }
    } catch (err) {
      this.graph = updateTaskStatus(this.graph, taskId, 'failed');
      const error = err instanceof Error ? err.message : String(err);
      if (!this.options.dryRun) {
        await db.finding.create({
          data: {
            runId: task.runId,
            severity: 'P1',
            status: 'open',
            evidence: error,
            rootCause: 'Agent executor threw before producing a valid result',
          },
        });
        await db.agentTask.update({
          where: { id: taskId },
          data: { status: 'failed', result: JSON.stringify({ status: 'failed', summary: error }), finishedAt: new Date() },
        });
      }
      this.emit({ type: 'task_failed', taskId, error });
    }

    this.graph = recomputeReady(this.graph);
  }

  /**
   * Build an AgentRequest for the given task.
   */
  private async buildAgentRequest(task: TaskNode, agent?: AgentDefinition): Promise<AgentRequest> {
    const discovered = await discoverCapabilities(this.options.workspaceId);
    const permitted = new Set([...(agent?.allowedTools ?? []), ...task.toolKeys]);
    const candidates = discovered.capabilities.filter((tool) => permitted.has(tool.key));
    const availableTools = reduceToolContext(candidates, [...task.toolKeys, task.title, task.description]);
    return {
      runId: task.runId,
      taskId: task.id,
      agentId: agent?.id ?? task.agentId,
      role: agent?.role ?? task.role,
      mission: task.title,
      confirmedContext: { goal: this.options.goal, constraints: this.options.constraints },
      inputArtifacts: task.artifactsIn,
      availableTools,
      allowedScope: availableTools.map((tool) => tool.key),
      forbiddenActions: agent?.forbiddenActions ?? [],
      expectedOutput: { summary: task.description },
      acceptanceCriteria: agent?.exitCriteria ?? ['Task objective met'],
      verificationMethod: 'self_check',
      exitCriteria: agent?.exitCriteria ?? [],
      timeoutMs: this.options.timeoutMs ?? 300000,
      maxRetries: this.options.maxRetries ?? 3,
    };
  }

  /**
   * Create a checkpoint and persist it.
   */
  private async createCheckpoint(phase: string): Promise<Checkpoint> {
    if (!this.graph) throw new Error('No graph to checkpoint');

    const checkpoint: Checkpoint = {
      id: `chk-${this.options.runId}-${phase}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      runId: this.options.runId,
      phase,
      taskStatuses: Object.fromEntries(this.graph.tasks.map((t) => [t.id, t.status])),
      context: {
        runId: this.options.runId,
        goal: this.options.goal,
        constraints: this.options.constraints,
        assumptions: [],
        confirmedFacts: [],
        currentPlan: this.graph,
        artifacts: [],
        agentReports: [],
        decisions: [],
        blockers: [],
      },
      createdAt: new Date(),
    };

    if (!this.options.dryRun) {
      await db.checkpoint.create({
        data: {
          id: checkpoint.id,
          runId: checkpoint.runId,
          phase: checkpoint.phase,
          taskStatuses: JSON.stringify(checkpoint.taskStatuses),
          context: JSON.stringify(checkpoint.context),
          verified: true,
          schemaVersion: 1,
        },
      });
    }

    this.emit({ type: 'checkpoint_created', checkpointId: checkpoint.id, phase });
    return checkpoint;
  }

  private async transitionRun(to: OrchestrationRunStatus): Promise<void> {
    if (!this.run) {
      this.run = {
        id: this.options.runId,
        goal: this.options.goal,
        constraints: this.options.constraints,
        status: to,
        mode: this.options.mode ?? 'balanced',
        maxAgents: 10,
        maxTasks: 50,
        maxRetries: this.options.maxRetries ?? 3,
        timeoutMs: this.options.timeoutMs ?? 300000,
        context: {
          runId: this.options.runId,
          goal: this.options.goal,
          constraints: this.options.constraints,
          assumptions: [],
          confirmedFacts: [],
          currentPlan: this.graph ?? { runId: this.options.runId, tasks: [], ready: [], blocked: [], passed: [], failed: [] },
          artifacts: [],
          agentReports: [],
          decisions: [],
          blockers: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return;
    }

    if (!canTransitionRun(this.run.status, to)) {
      return;
    }

    this.run.status = to;
    this.run.updatedAt = new Date();
    this.emit({ type: 'run_status_changed', status: to });

    if (!this.options.dryRun) {
      await db.orchestrationRun.update({
        where: { id: this.options.runId },
        data: { status: to, updatedAt: new Date() },
      });
    }
  }

  /**
   * Return a snapshot of the current execution state.
   */
  async snapshot(): Promise<ExecutionSnapshot> {
    if (!this.run || !this.graph) {
      throw new Error('Run not started');
    }

    const executions = this.options.dryRun
      ? []
      : await db.agentExecution.findMany({
          where: { runId: this.options.runId },
          select: { id: true, agentId: true, role: true, status: true, durationMs: true },
        });
    const dbCheckpoints = this.options.dryRun
      ? []
      : await db.checkpoint.findMany({ where: { runId: this.options.runId } });

    const checkpoints: Checkpoint[] = dbCheckpoints.map((c) => ({
      id: c.id,
      runId: c.runId,
      phase: c.phase,
      taskStatuses: JSON.parse(c.taskStatuses) as Record<string, TaskNodeStatus>,
      context: JSON.parse(c.context) as RunContext,
      createdAt: c.createdAt,
    }));

    return {
      run: { id: this.run.id, status: this.run.status, goal: this.run.goal, constraints: this.run.constraints },
      graph: this.graph,
      executions,
      checkpoints,
    };
  }
}
