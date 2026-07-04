import type { ITool, ToolExecutionContext, ToolExecutionResult } from '../types';
import { exec } from 'child_process';
import { promisify } from 'util';
import { analyzeTerminalCommand } from '@/lib/safety/terminal-guard';

const execAsync = promisify(exec);

export const terminalExecTool: ITool = {
  id: 'terminal.exec',
  name: 'Terminal Executor',
  description: 'Execute terminal commands in the workspace.',
  version: '1.0.0',
  requiredPermission: 'admin',
  inputSchema: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'Command to run' },
    },
    required: ['command'],
  },
  functionDefinition: {
    name: 'terminal.exec',
    description: 'Run a terminal command',
    parameters: {
      type: 'object',
      properties: { command: { type: 'string' } },
      required: ['command'],
    },
  },
  async execute(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const start = Date.now();
    const command = String(context.args.command);
    const guard = analyzeTerminalCommand(command);
    if (!guard.allowed) {
      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: 'terminal.exec',
        content: `BLOCKED: ${guard.reasons.join(' ')} (risk=${guard.riskLevel}, approval=${guard.requiresApproval})`,
        error: guard.requiresApproval ? 'requires_approval' : 'blocked',
        durationMs: Date.now() - start,
      };
    }
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: guard.cwd,
      });
      return {
        success: true,
        toolCallId: context.toolCallId,
        functionName: 'terminal.exec',
        content: `STDOUT:\n${stdout}\nSTDERR:\n${stderr}`,
        durationMs: Date.now() - start,
      };
    } catch (e: any) {
      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: 'terminal.exec',
        content: e.message,
        error: e.message,
        durationMs: Date.now() - start,
      };
    }
  },
};
