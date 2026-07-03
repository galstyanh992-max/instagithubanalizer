import type { ITool, ToolExecutionContext, ToolExecutionResult } from '../types';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const gitStatusTool: ITool = {
  id: 'git.status',
  name: 'Git Status',
  description: 'Check the git status of the project.',
  version: '1.0.0',
  requiredPermission: 'read',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  functionDefinition: {
    name: 'git.status',
    description: 'Check git status',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  async execute(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const start = Date.now();
    try {
      const { stdout, stderr } = await execAsync('git status', { 
        cwd: process.cwd(),
        timeout: 10000,
        maxBuffer: 1024 * 1024 * 2
      });
      return {
        success: true,
        toolCallId: context.toolCallId,
        functionName: 'git.status',
        content: stdout || stderr,
        durationMs: Date.now() - start,
      };
    } catch (e: any) {
      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: 'git.status',
        content: e.message,
        error: e.message,
        durationMs: Date.now() - start,
      };
    }
  },
};

export const projectBuildTool: ITool = {
  id: 'project.build',
  name: 'Project Build',
  description: 'Run the project build command (npm run build).',
  version: '1.0.0',
  requiredPermission: 'write',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  functionDefinition: {
    name: 'project.build',
    description: 'Run project build',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  async execute(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const start = Date.now();
    try {
      const { stdout, stderr } = await execAsync('npm run build', { 
        cwd: process.cwd(),
        timeout: 60000,
        maxBuffer: 1024 * 1024 * 10
      });
      return {
        success: true,
        toolCallId: context.toolCallId,
        functionName: 'project.build',
        content: stdout || stderr,
        durationMs: Date.now() - start,
      };
    } catch (e: any) {
      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: 'project.build',
        content: e.message,
        error: e.message,
        durationMs: Date.now() - start,
      };
    }
  },
};

export const projectTypecheckTool: ITool = {
  id: 'project.typecheck',
  name: 'Project Typecheck',
  description: 'Run typescript typechecking (tsc --noEmit).',
  version: '1.0.0',
  requiredPermission: 'read',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  functionDefinition: {
    name: 'project.typecheck',
    description: 'Run project typecheck',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  async execute(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const start = Date.now();
    try {
      const { stdout, stderr } = await execAsync('npx tsc --noEmit', { 
        cwd: process.cwd(),
        timeout: 30000,
        maxBuffer: 1024 * 1024 * 5
      });
      return {
        success: true,
        toolCallId: context.toolCallId,
        functionName: 'project.typecheck',
        content: stdout || 'No type errors found.',
        durationMs: Date.now() - start,
      };
    } catch (e: any) {
      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: 'project.typecheck',
        content: e.message,
        error: e.message,
        durationMs: Date.now() - start,
      };
    }
  },
};

export const projectLintTool: ITool = {
  id: 'project.lint',
  name: 'Project Lint',
  description: 'Run the project linter (npm run lint).',
  version: '1.0.0',
  requiredPermission: 'read',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  functionDefinition: {
    name: 'project.lint',
    description: 'Run project lint',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  async execute(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const start = Date.now();
    try {
      const { stdout, stderr } = await execAsync('npm run lint', { 
        cwd: process.cwd(),
        timeout: 30000,
        maxBuffer: 1024 * 1024 * 5
      });
      return {
        success: true,
        toolCallId: context.toolCallId,
        functionName: 'project.lint',
        content: stdout || stderr,
        durationMs: Date.now() - start,
      };
    } catch (e: any) {
      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: 'project.lint',
        content: e.message,
        error: e.message,
        durationMs: Date.now() - start,
      };
    }
  },
};
