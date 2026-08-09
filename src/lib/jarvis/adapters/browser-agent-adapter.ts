// ─── JARVIS Agent Network — Browser Agent Adapter ────────────
// Wraps the JARVIS browser-agent contract for the orchestrator layer.
// Provides status mapping and converts BrowserScenario into a task request.

import { runBrowserAgent } from '../browser-agent';
import type { BrowserAgentInput, BrowserAgentOutput } from '../browser-agent';
import type { BrowserScenario } from '../types';

export interface BrowserAdapterInput {
  runId: string;
  taskId?: string;
  agentId?: string;
  scenario: BrowserScenario;
  provider?: string;
  timeout?: number;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

export type BrowserAdapterOutput = BrowserAgentOutput;

// ─── Adapter ─────────────────────────────────────────────────

export async function runBrowserAgentAdapter(input: BrowserAdapterInput): Promise<BrowserAdapterOutput> {
  return runBrowserAgent({
    runId: input.runId,
    taskId: input.taskId,
    agentId: input.agentId,
    scenario: input.scenario,
    provider: input.provider,
    timeout: input.timeout,
    priority: input.priority,
  });
}

/**
 * Returns whether a browser task has reached a terminal state.
 */
export function isBrowserTerminal(output: BrowserAdapterOutput): boolean {
  return output.status === 'completed' || output.status === 'failed' || output.status === 'needs_human';
}

/**
 * Convert a browser agent output into a simple pass/fail verdict.
 */
export function browserOutputToStatus(output: BrowserAdapterOutput): 'passed' | 'failed' | 'blocked' {
  if (output.status === 'completed') return 'passed';
  if (output.status === 'needs_human') return 'blocked';
  return 'failed';
}

export type { BrowserScenario };
