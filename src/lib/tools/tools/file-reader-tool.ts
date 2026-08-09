// ─── Agent OS — Stage 3: File Reader Tool ──────────────────────
// A file reading tool that can read file contents from the filesystem.
// Demonstrates a tool with 'read' permission and safety constraints.
// Agents with 'read' or higher permission can use it.

import type { ITool, ToolExecutionContext, ToolExecutionResult, ToolInputSchema } from '../types';

// ─── Input Schema ────────────────────────────────────────────

const FILE_READER_SCHEMA: ToolInputSchema = {
  type: 'object',
  properties: {
    path: {
      type: 'string',
      description: 'Path to the file to read (relative to project root or absolute)',
    },
    encoding: {
      type: 'string',
      enum: ['utf-8', 'ascii', 'base64'],
      description: 'File encoding (default: utf-8)',
    },
    max_lines: {
      type: 'number',
      description: 'Maximum number of lines to read (default: 100, max: 500)',
    },
    start_line: {
      type: 'number',
      description: 'Line number to start reading from (default: 1)',
    },
  },
  required: ['path'],
};

// ─── File Reader Tool Implementation ─────────────────────────

export const fileReaderTool: ITool = {
  id: 'file_reader',
  name: 'File Reader',
  description:
    'Read file contents from the filesystem. Supports line range and encoding options. Read-only — cannot modify files.',
  version: '1.0.0',
  requiredPermission: 'read',
  inputSchema: FILE_READER_SCHEMA,

  functionDefinition: {
    name: 'file_reader',
    description:
      'Read the contents of a file. Returns the file content as text. Use start_line and max_lines to read specific sections.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to read',
        },
        encoding: {
          type: 'string',
          enum: ['utf-8', 'ascii', 'base64'],
          description: 'File encoding (default: utf-8)',
        },
        max_lines: {
          type: 'number',
          description: 'Maximum lines to read (default: 100, max: 500)',
        },
        start_line: {
          type: 'number',
          description: 'Line to start from (default: 1)',
        },
      },
      required: ['path'],
    },
  },

  async execute(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const { path, max_lines, start_line } = context.args as {
      path: string;
      encoding?: string;
      max_lines?: number;
      start_line?: number;
    };

    const startTime = Date.now();

    // Security: block access to sensitive paths
    const blockedPatterns = [
      '/etc/passwd',
      '/etc/shadow',
      '.env',
      '.env.local',
      '.env.production',
      'id_rsa',
      'id_ed25519',
      '.pem',
      '.key',
    ];

    const normalizedPath = path.replace(/\\/g, '/');
    for (const pattern of blockedPatterns) {
      if (normalizedPath.includes(pattern)) {
        return {
          success: false,
          toolCallId: context.toolCallId,
          functionName: context.functionName,
          content: `Access denied: path contains restricted pattern "${pattern}"`,
          error: 'Access denied: sensitive file',
          durationMs: Date.now() - startTime,
        };
      }
    }

    try {
      // Use Node.js fs to read the file
      const fs = await import('fs/promises');
      const pathModule = await import('path');

      // Resolve relative paths from project root
      const projectRoot = pathModule.resolve(/*turbopackIgnore: true*/ process.cwd());
      const resolvedPath = pathModule.isAbsolute(normalizedPath)
        ? normalizedPath
        : pathModule.resolve(projectRoot, normalizedPath);

      // Ensure the resolved path doesn't escape the project
      const canonicalRoot = await fs.realpath(projectRoot);
      const canonicalPath = await fs.realpath(resolvedPath);
      const relativePath = pathModule.relative(canonicalRoot, canonicalPath);
      if (relativePath.startsWith('..') || pathModule.isAbsolute(relativePath)) {
        return {
          success: false,
          toolCallId: context.toolCallId,
          functionName: context.functionName,
          content: `Access denied: path escapes project root`,
          error: 'Path traversal detected',
          durationMs: Date.now() - startTime,
        };
      }

      // Read file
      const content = await fs.readFile(canonicalPath, 'utf-8');
      const lines = content.split('\n');

      // Apply line range
      const startLine = Math.max(1, start_line || 1);
      const maxLines = Math.min(max_lines || 100, 500);
      const selectedLines = lines.slice(startLine - 1, startLine - 1 + maxLines);

      // Format with line numbers
      const numberedContent = selectedLines
        .map((line, i) => `${String(startLine + i).padStart(4)} | ${line}`)
        .join('\n');

      const truncated = lines.length > startLine - 1 + maxLines;
      const footer = truncated
        ? `\n\n... (${lines.length - startLine + 1 - maxLines} more lines)`
        : '';

      const header = `File: ${normalizedPath} (${lines.length} lines total)\n`;

      return {
        success: true,
        toolCallId: context.toolCallId,
        functionName: context.functionName,
        content: header + numberedContent + footer,
        durationMs: Date.now() - startTime,
        metadata: {
          totalLines: lines.length,
          linesRead: selectedLines.length,
          startLine,
          truncated,
        },
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;

      if (error instanceof Error && 'code' in error) {
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError.code === 'ENOENT') {
          return {
            success: false,
            toolCallId: context.toolCallId,
            functionName: context.functionName,
            content: `File not found: ${normalizedPath}`,
            error: 'File not found',
            durationMs,
          };
        }
        if (nodeError.code === 'EACCES') {
          return {
            success: false,
            toolCallId: context.toolCallId,
            functionName: context.functionName,
            content: `Permission denied: ${normalizedPath}`,
            error: 'Permission denied',
            durationMs,
          };
        }
        if (nodeError.code === 'EISDIR') {
          return {
            success: false,
            toolCallId: context.toolCallId,
            functionName: context.functionName,
            content: `Path is a directory, not a file: ${normalizedPath}`,
            error: 'Is a directory',
            durationMs,
          };
        }
      }

      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: context.functionName,
        content: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs,
      };
    }
  },
};
