import { getBrowserOperatorService } from '@/lib/browser-operator'
import type { BrowserScenario } from './types';

export interface BrowserAgentInput {
  runId: string;
  taskId?: string;
  agentId?: string;
  scenario: BrowserScenario;
  provider?: string;
  timeout?: number;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

export interface BrowserAgentOutput {
  taskId: string;
  status: 'completed' | 'failed' | 'needs_human' | 'queued' | 'running' | 'cancelled';
  result?: string;
  error?: string;
  screenshots: string[];
  logs: { timestamp: string; level: 'info' | 'warn' | 'error' | 'debug'; message: string }[];
  finalUrl?: string;
  needsHumanReason?: string;
}

// ─── Browser Agent ───────────────────────────────────────────

export async function runBrowserAgent(input: BrowserAgentInput): Promise<BrowserAgentOutput> {
  const service = getBrowserOperatorService();
  await service.initialize();

  const provider = input.provider ?? 'custom';
  const prompt = buildBrowserPrompt(input.scenario);

  const task = await service.submitTask({
    provider,
    prompt,
    url: input.scenario.actions.find((a) => a.type === 'navigate')?.url,
    mode: 'automate',
    agentId: input.agentId,
    taskId: input.taskId,
    priority: input.priority ?? 'normal',
    timeout: input.timeout,
    options: { scenario: input.scenario },
  });

  // Best-effort synchronous return — the BrowserOperator service runs async.
  // For JARVIS network integration we return the queued task immediately.
  return {
    taskId: task.id,
    status: task.output?.status === 'completed' ? 'completed' : task.output?.status ?? 'queued',
    result: task.output?.result,
    error: task.output?.error,
    screenshots: task.output?.screenshots ?? [],
    logs: task.output?.logs ?? [],
    finalUrl: task.output?.finalUrl,
    needsHumanReason: task.output?.needsHumanReason,
  };
}

function buildBrowserPrompt(scenario: BrowserScenario): string {
  const actionLines = scenario.actions.map((action, idx) => {
    switch (action.type) {
      case 'navigate':
        return `${idx + 1}. Navigate to ${action.url}`;
      case 'click':
        return `${idx + 1}. Click element "${action.selector}"`;
      case 'type':
        return `${idx + 1}. Type "${action.text}" into "${action.selector}"`;
      case 'submit':
        return `${idx + 1}. Submit form "${action.selector}"`;
      default:
        return `${idx + 1}. Unknown action`;
    }
  });

  return `Scenario: ${scenario.name}\nPath: ${scenario.path}\nExpected outcome: ${scenario.expected}\n\nActions:\n${actionLines.join('\n')}`;
}
