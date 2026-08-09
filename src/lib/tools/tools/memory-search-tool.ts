// ─── Agent OS — Stage 3: Memory Search Tool ───────────────────
// Exposes the agent-memory system to the tool runtime. Lets the Orchestrator
// recall prior decisions, architecture notes, bug solutions, and user
// preferences that were stored in Memory Hub. Critical for "finding
// information" without re-reading the whole codebase each turn.

import type { ITool, ToolExecutionContext, ToolExecutionResult, ToolInputSchema } from '../types';
import { memorySystem } from '@/lib/agent-memory';

const MEMORY_SEARCH_SCHEMA: ToolInputSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description: 'Natural-language query. Matched against memory title/content/tags.',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of memories to return (default: 8, max: 30).',
    },
  },
  required: ['query'],
};

const MAX_LIMIT = 30;

export const memorySearchTool: ITool = {
  id: 'memory.search',
  name: 'Memory Search',
  description:
    'Search the project memory hub (Memory Hub) for previously stored decisions, architecture notes, bug solutions, user preferences, and context. Use this BEFORE reading files or searching the web — the answer may already be known.',
  version: '1.0.0',
  requiredPermission: 'read',
  inputSchema: MEMORY_SEARCH_SCHEMA,
  functionDefinition: {
    name: 'memory_search',
    description:
      'Search the Memory Hub for prior decisions, architecture notes, bug solutions, and user preferences.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What to recall.' },
        limit: { type: 'number', description: 'Max results (default 8, max 30).' },
      },
      required: ['query'],
    },
  },

  async execute(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startedAt = Date.now();
    const { query, limit } = context.args as { query: string; limit?: number };
    const cleanQuery = (query ?? '').trim();

    if (!cleanQuery) {
      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: context.functionName,
        content: 'Query is required.',
        error: 'Query is required.',
        durationMs: Date.now() - startedAt,
      };
    }
    const requestedLimit = Math.min(Math.max(1, Number(limit) || 8), MAX_LIMIT);

    try {
      const memories = await memorySystem.search(cleanQuery, undefined, undefined, requestedLimit);
      if (memories.length === 0) {
        return {
          success: true,
          toolCallId: context.toolCallId,
          functionName: context.functionName,
          content: `No memories found for "${cleanQuery}".`,
          metadata: { query: cleanQuery, count: 0 },
          durationMs: Date.now() - startedAt,
        };
      }
      const formatted = memories
        .map((item, index) => {
          const header = `${index + 1}. [${item.type}${item.importance ? ` · ${item.importance}` : ''}] ${item.title || '(untitled)'}`;
          const body = item.content ? item.content.slice(0, 600) : '';
          const tags = item.tags ? `   tags: ${item.tags}` : '';
          return [header, body, tags].filter(Boolean).join('\n');
        })
        .join('\n\n');
      return {
        success: true,
        toolCallId: context.toolCallId,
        functionName: context.functionName,
        content: formatted,
        metadata: { query: cleanQuery, count: memories.length },
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: context.functionName,
        content: `Memory search failed: ${message}`,
        error: `Memory search failed: ${message}`,
        metadata: { query: cleanQuery },
        durationMs: Date.now() - startedAt,
      };
    }
  },
};
