// ─── Agent OS — Stage 3: Summarization Skill ───────────────────
// A skill that adds summarization capabilities to an agent.
// Injects a "summarize" tool and adds summarization instructions.
// Post-processes results to detect and enhance summaries.

import type { ISkill, SkillContext } from '../types';
import type { AgentResult } from '../../agent-core/types';
import type { ToolDefinition } from '../../ai-provider/types';
import { logger } from '@/lib/logger';

// ─── Summarization Tool Definition ───────────────────────────

const SUMMARIZE_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'summarize',
    description:
      'Summarize a block of text. Provide the text and desired summary style/length.',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text to summarize',
        },
        style: {
          type: 'string',
          enum: ['brief', 'detailed', 'bullet_points', 'executive'],
          description: 'Summary style',
        },
        max_length: {
          type: 'number',
          description: 'Maximum length of the summary in words',
        },
      },
      required: ['text'],
    },
  },
};

const EXTRACT_KEY_POINTS_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'extract_key_points',
    description:
      'Extract key points and actionable items from text.',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text to extract key points from',
        },
        max_points: {
          type: 'number',
          description: 'Maximum number of key points to extract (default: 5)',
        },
      },
      required: ['text'],
    },
  },
};

// ─── Summarization System Prompt Appendix ────────────────────

const SUMMARIZATION_PROMPT_APPENDIX = `

[Summarization Skill Active]
When summarizing or condensing information:
1. Use the "summarize" tool to produce structured summaries
2. Use the "extract_key_points" tool to pull out actionable items
3. Preserve key facts, decisions, and action items
4. Indicate confidence level for each point if uncertain
5. When summarizing conversations, capture who said what and what was decided
`;

// ─── Summarization Skill Implementation ──────────────────────

export const summarizationSkill: ISkill = {
  id: 'summarization',
  name: 'Summarization',
  description:
    'Adds summarization capabilities. Injects summarize and extract_key_points tools with instructions.',
  version: '1.0.0',

  async beforeRun(context: SkillContext): Promise<SkillContext> {
    // Inject summarization tools
    context.injectedToolDefinitions.push(SUMMARIZE_TOOL, EXTRACT_KEY_POINTS_TOOL);

    // Append summarization instructions
    context.systemPromptAppendix += SUMMARIZATION_PROMPT_APPENDIX;

    context.data.summarizationActive = true;

    return context;
  },

  async afterRun(context: SkillContext, result: AgentResult): Promise<AgentResult> {
    // If summarization was active, check if the result looks like a summary
    if (context.data.summarizationActive && result.content) {
      const content = result.content;
      const summaryIndicators = ['summary:', 'key points:', 'in summary', 'tldr', 'takeaway'];
      const isSummary = summaryIndicators.some((ind) =>
        content.toLowerCase().includes(ind)
      );

      if (isSummary) {
        context.data.summaryDetected = true;
      }
    }

    return result;
  },

  async onError(_context: SkillContext, error: Error): Promise<Error | null> {
    if (error.message.includes('summarize') || error.message.includes('extract_key_points')) {
      logger.warn(`[SummarizationSkill] Summarization tool error: ${error.message}`);
    }
    return null;
  },
};
