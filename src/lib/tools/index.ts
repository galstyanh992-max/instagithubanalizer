// ─── Agent OS — Stage 3: Tools Barrel Export ────────────────────

// Types
export type {
  ITool,
  ToolPermission,
  ToolInputSchema,
  ToolExecutionContext,
  ToolExecutionResult,
  ToolRegistration,
  ToolRegistryStats,
} from './types';

export { ToolValidationError, ToolPermissionError } from './types';

// Registry
export { toolRegistry } from './registry';

// Executor
export { toolExecutor } from './executor';

// Built-in Tools
export { calculatorTool } from './tools/calculator-tool';
export { httpTool } from './tools/http-tool';
export { fileReaderTool } from './tools/file-reader-tool';
export { default as browserOperatorTool } from './tools/browser-operator-tool';
export { webSearchTool } from './tools/web-search-tool';
export { memorySearchTool } from './tools/memory-search-tool';

export { filesystemReadTool, filesystemWriteTool, filesystemListTool, filesystemSearchTool } from './tools/filesystem-tools';
export { gitStatusTool, projectBuildTool, projectTypecheckTool, projectLintTool } from './tools/project-tools';
export { terminalExecTool } from './tools/terminal-tool';

// Convenience: all built-in tools as an array
import { calculatorTool } from './tools/calculator-tool';
import { httpTool } from './tools/http-tool';
import { fileReaderTool } from './tools/file-reader-tool';
import browserOperatorTool from './tools/browser-operator-tool';
import { webSearchTool } from './tools/web-search-tool';
import { memorySearchTool } from './tools/memory-search-tool';

import { filesystemReadTool, filesystemWriteTool, filesystemListTool, filesystemSearchTool } from './tools/filesystem-tools';
import { gitStatusTool, projectBuildTool, projectTypecheckTool, projectLintTool } from './tools/project-tools';
import { terminalExecTool } from './tools/terminal-tool';

export const BUILTIN_TOOLS = [
  calculatorTool,
  httpTool,
  fileReaderTool,
  browserOperatorTool,
  webSearchTool,
  memorySearchTool,
  filesystemReadTool,
  filesystemWriteTool,
  filesystemListTool,
  filesystemSearchTool,
  gitStatusTool,
  projectBuildTool,
  projectTypecheckTool,
  projectLintTool,
  terminalExecTool,
];
