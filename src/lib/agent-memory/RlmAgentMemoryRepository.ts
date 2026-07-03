// Server-side RLM-inspired memory repository for Agent OS.
// It ports trajectory capture and compact summaries from alexzhang13/rlm
// into the existing Prisma-backed memory system without executing Python/REPL code.

import { createHash } from 'crypto';
import { sharedMemoryService } from './SharedMemoryService';
import type { MemoryImportance, MemoryType, MemoryVisibility } from '../types/domain';

const MAX_TEXT = 4_000;
const MAX_PREVIEW = 600;
const MAX_STEPS = 12;

export interface RlmTrajectoryStep {
  agentId?: string;
  agentName?: string;
  task?: string;
  status?: string;
  result?: string | null;
  error?: string | null;
  durationMs?: number;
}

export interface RlmTrajectoryInput {
  workspaceId: string;
  projectId?: string;
  agentId?: string;
  rootPrompt: string;
  finalResponse: string;
  steps?: RlmTrajectoryStep[];
  model?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  durationMs?: number;
  correlationId?: string;
}

export interface RlmCompactionInput {
  workspaceId: string;
  projectId?: string;
  agentId?: string;
  rootPrompt: string;
  summary: string;
  remainingWork?: string;
  iterationCount?: number;
  model?: string;
}

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

function compactText(text: string | null | undefined, limit = MAX_PREVIEW): string {
  return (text ?? '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function uniqueTags(tags: Array<string | undefined>): string[] {
  return Array.from(new Set(tags.filter(Boolean).map((tag) => tag!.toLowerCase()))).slice(0, 10);
}

function inferImportance(steps: RlmTrajectoryStep[] | undefined): MemoryImportance {
  if (!steps?.length) return 'medium';
  if (steps.some((step) => step.status === 'needs_human')) return 'critical';
  if (steps.some((step) => step.status === 'failed' || step.error)) return 'high';
  return 'medium';
}

function summarizeSteps(steps: RlmTrajectoryStep[] | undefined): string {
  if (!steps?.length) return 'No delegated agent steps were recorded.';

  return steps.slice(0, MAX_STEPS).map((step, index) => {
    const owner = step.agentName || step.agentId || `step-${index + 1}`;
    const status = step.status ?? 'unknown';
    const task = compactText(step.task, 180);
    const result = step.error
      ? `error=${compactText(step.error, 220)}`
      : `result=${compactText(step.result, 220)}`;
    return `${index + 1}. ${owner} [${status}] ${task}${task ? ' - ' : ''}${result}`;
  }).join('\n');
}

class RlmAgentMemoryRepository {
  private static instance: RlmAgentMemoryRepository | null = null;

  private constructor() {}

  static getInstance(): RlmAgentMemoryRepository {
    if (!RlmAgentMemoryRepository.instance) {
      RlmAgentMemoryRepository.instance = new RlmAgentMemoryRepository();
    }
    return RlmAgentMemoryRepository.instance;
  }

  async rememberTrajectory(input: RlmTrajectoryInput) {
    const promptHash = hashText(input.rootPrompt);
    const content = [
      `Root prompt: ${compactText(input.rootPrompt, 900)}`,
      `Final response: ${compactText(input.finalResponse, 1_200)}`,
      `Trajectory:\n${summarizeSteps(input.steps)}`,
    ].join('\n\n').slice(0, MAX_TEXT);

    return sharedMemoryService.remember({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      agentId: input.agentId,
      type: 'conversation_summary' as MemoryType,
      title: `RLM trajectory: ${compactText(input.rootPrompt, 120) || promptHash}`,
      content,
      tags: uniqueTags(['rlm', 'trajectory', 'agent-memory', input.agentId, input.model]),
      importance: inferImportance(input.steps),
      confidence: 0.86,
      visibility: 'workspace' as MemoryVisibility,
      metadata: {
        source: 'rlm-agent-memory-repository',
        kind: 'trajectory',
        promptHash,
        correlationId: input.correlationId,
        model: input.model,
        usage: input.usage,
        durationMs: input.durationMs,
        stepCount: input.steps?.length ?? 0,
        agents: Array.from(new Set((input.steps ?? []).map((step) => step.agentId).filter(Boolean))),
        steps: (input.steps ?? []).slice(0, MAX_STEPS).map((step) => ({
          agentId: step.agentId,
          status: step.status,
          durationMs: step.durationMs,
          task: compactText(step.task, 300),
          result: compactText(step.result, 300),
          error: compactText(step.error, 300),
        })),
      },
    });
  }

  async rememberCompactionSummary(input: RlmCompactionInput) {
    const promptHash = hashText(input.rootPrompt);
    const content = [
      `Compacted task: ${compactText(input.rootPrompt, 900)}`,
      `Progress summary: ${compactText(input.summary, 1_800)}`,
      input.remainingWork ? `Remaining work: ${compactText(input.remainingWork, 700)}` : '',
    ].filter(Boolean).join('\n\n').slice(0, MAX_TEXT);

    return sharedMemoryService.remember({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      agentId: input.agentId,
      type: 'context' as MemoryType,
      title: `RLM compaction: ${compactText(input.rootPrompt, 120) || promptHash}`,
      content,
      tags: uniqueTags(['rlm', 'compaction', 'agent-memory', input.agentId, input.model]),
      importance: 'medium' as MemoryImportance,
      confidence: 0.82,
      visibility: 'workspace' as MemoryVisibility,
      metadata: {
        source: 'rlm-agent-memory-repository',
        kind: 'compaction_summary',
        promptHash,
        model: input.model,
        iterationCount: input.iterationCount,
      },
    });
  }

  async recallForAgent(query: string, options: {
    workspaceId: string;
    projectId?: string;
    agentId?: string;
    limit?: number;
  }) {
    return sharedMemoryService.recall(query, {
      workspaceId: options.workspaceId,
      projectId: options.projectId,
      agentId: options.agentId,
      types: [
        'conversation_summary',
        'context',
        'decision',
        'architecture',
        'bug',
        'risk',
        'task_result',
        'fact',
      ] as MemoryType[],
      tags: ['rlm'],
      limit: options.limit ?? 8,
    });
  }
}

export const rlmAgentMemoryRepository = RlmAgentMemoryRepository.getInstance();
