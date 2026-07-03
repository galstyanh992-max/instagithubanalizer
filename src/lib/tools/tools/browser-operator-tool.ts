/**
 * Browser Operator Tool
 *
 * Stage 3 tool that allows agents to submit browser automation tasks.
 * Permission: write (can interact with external websites)
 *
 * This tool creates a task in the Browser Operator queue and returns
 * the task ID. The task executes asynchronously.
 */

import type { ITool, ToolExecutionContext, ToolExecutionResult } from '../types';
import type { ToolPermission } from '../types';
import type { BrowserTaskMode, BrowserTaskPriority } from '@/lib/browser-operator/BrowserOperatorTypes';

// Lazy import — avoids pulling playwright into the module graph at build time
async function getBrowserOperatorService() {
  const mod = await import('@/lib/browser-operator');
  return mod.getBrowserOperatorService();
}

const BROWSER_OPERATOR_TOOL: ITool = {
  id: 'browser_operator',
  name: 'Browser Operator',
  description:
    'Submit browser automation tasks. Can navigate to URLs, extract page content, ' +
    'perform simple interactions (click, type, scroll), and take screenshots. ' +
    'Tasks run asynchronously — returns a task ID for tracking. ' +
    'If a login/captcha/2FA is detected, the task pauses with status "needs_human" ' +
    'requiring manual intervention in the headful browser.',
  requiredPermission: 'write' as ToolPermission,

  inputSchema: {
    type: 'object',
    properties: {
      provider: {
        type: 'string',
        description: 'Browser provider to use ("custom" for headful, "playwright" for headless)',
        default: 'custom',
      },
      prompt: {
        type: 'string',
        description:
          'What to do in the browser. Examples: "Navigate to example.com and extract the main heading", ' +
          '"click button.submit", "type input.email \"user@example.com\"", "scroll"',
      },
      url: {
        type: 'string',
        description: 'Starting URL (optional for some tasks)',
      },
      mode: {
        type: 'string',
        enum: ['navigate', 'extract', 'interact', 'automate'],
        description:
          'Task mode: navigate (just visit page), extract (get content), ' +
          'interact (click/type/scroll), automate (multi-step)',
        default: 'extract',
      },
      priority: {
        type: 'string',
        enum: ['low', 'normal', 'high', 'critical'],
        default: 'normal',
      },
      timeout: {
        type: 'number',
        description: 'Max wait time in ms for page loads (default 30000)',
        default: 30000,
      },
    },
    required: ['prompt', 'mode'],
  },

  functionDefinition: {
    name: 'browser_operator',
    description:
      'Submit a browser automation task. Returns task ID and status. ' +
      'If the task encounters a login page, CAPTCHA, or 2FA, it will pause ' +
      'with status "needs_human" and must be resumed manually.',
    parameters: {
      type: 'object',
      properties: {
        provider: { type: 'string', default: 'custom' },
        prompt: { type: 'string', description: 'Natural language description of what to do in the browser' },
        url: { type: 'string', description: 'Starting URL' },
        mode: { type: 'string', enum: ['navigate', 'extract', 'interact', 'automate'] },
        priority: { type: 'string', enum: ['low', 'normal', 'high', 'critical'], default: 'normal' },
        timeout: { type: 'number', default: 30000 },
      },
      required: ['prompt', 'mode'],
    },
  },

  async execute(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const args = context.args;

    try {
      const service = await getBrowserOperatorService();
      const task = await service.submitTask({
        provider: String(args.provider ?? 'custom'),
        prompt: String(args.prompt),
        url: args.url ? String(args.url) : undefined,
        mode: String(args.mode) as BrowserTaskMode,
        agentId: context.agentId,
        taskId: context.toolCallId,
        priority: args.priority ? String(args.priority) as BrowserTaskPriority : 'normal',
        timeout: args.timeout ? Number(args.timeout) : undefined,
      });

      return {
        success: true,
        toolCallId: context.toolCallId,
        functionName: 'browser_operator',
        content: JSON.stringify({
          taskId: task.id,
          status: task.output.status,
          message: `Browser task submitted. Use task ID "${task.id}" to check status via GET /api/browser-operator/tasks/${task.id}`,
          mode: task.input.mode,
          provider: task.input.provider,
        }),
        durationMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: 'browser_operator',
        content: `Browser operator error: ${message}`,
        error: message,
        durationMs: Date.now() - startTime,
      };
    }
  },
};

export default BROWSER_OPERATOR_TOOL;
