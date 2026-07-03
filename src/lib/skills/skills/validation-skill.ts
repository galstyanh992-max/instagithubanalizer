// ─── Agent OS — Stage 3: Validation Skill ──────────────────────
// A skill that adds validation and quality-checking to an agent.
// Injects validation tools and adds quality-assurance instructions.
// Post-processes results to check for common issues.

import type { ISkill, SkillContext } from '../types';
import type { AgentResult } from '../../agent-core/types';
import type { ToolDefinition } from '../../ai-provider/types';
import { logger } from '@/lib/logger';

// ─── Validation Tool Definitions ─────────────────────────────

const VALIDATE_OUTPUT_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'validate_output',
    description:
      'Validate output against criteria. Checks completeness, accuracy indicators, and format compliance.',
    parameters: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The content to validate',
        },
        criteria: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of validation criteria (e.g. ["has_code_examples", "mentions_risks", "under_500_words"])',
        },
        format: {
          type: 'string',
          enum: ['text', 'markdown', 'json', 'code'],
          description: 'Expected output format',
        },
      },
      required: ['content', 'criteria'],
    },
  },
};

const CHECK_FACTS_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'check_facts',
    description:
      'Flag claims that may need fact-checking. Identifies assertions that should be verified.',
    parameters: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The content to fact-check',
        },
        strictness: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'How strict to be about flagging claims (default: medium)',
        },
      },
      required: ['content'],
    },
  },
};

// ─── Validation System Prompt Appendix ───────────────────────

const VALIDATION_PROMPT_APPENDIX = `

[Validation Skill Active]
When producing output, follow these quality guidelines:
1. Use "validate_output" to check your work against criteria before finalizing
2. Use "check_facts" to flag claims that need verification
3. Always indicate uncertainty — distinguish facts from opinions
4. If you're not confident about something, say so explicitly
5. Add confidence indicators: [High confidence], [Medium confidence], [Low confidence]
6. List any assumptions you're making

Quality checklist for every response:
- Are claims backed by evidence or marked as opinions?
- Are edge cases addressed?
- Is the scope of applicability clear?
`;

// ─── Validation Skill Implementation ─────────────────────────

export const validationSkill: ISkill = {
  id: 'validation',
  name: 'Validation',
  description:
    'Adds output validation and fact-checking capabilities. Injects validation tools and quality instructions.',
  version: '1.0.0',

  async beforeRun(context: SkillContext): Promise<SkillContext> {
    // Inject validation tools
    context.injectedToolDefinitions.push(VALIDATE_OUTPUT_TOOL, CHECK_FACTS_TOOL);

    // Append validation instructions
    context.systemPromptAppendix += VALIDATION_PROMPT_APPENDIX;

    context.data.validationActive = true;

    return context;
  },

  async afterRun(context: SkillContext, result: AgentResult): Promise<AgentResult> {
    // If validation is active, check the result for quality indicators
    if (context.data.validationActive && result.content) {
      const content = result.content;
      const hasConfidenceMarker =
        content.includes('[High confidence]') ||
        content.includes('[Medium confidence]') ||
        content.includes('[Low confidence]');

      const hasUncertainty = content.toLowerCase().includes('uncertain') ||
        content.toLowerCase().includes('i\'m not sure') ||
        content.toLowerCase().includes('may not be accurate');

      context.data.validationResult = {
        hasConfidenceMarkers: hasConfidenceMarker,
        hasUncertaintyStatement: hasUncertainty,
        validated: hasConfidenceMarker || hasUncertainty,
      };
    }

    return result;
  },

  async onError(_context: SkillContext, error: Error): Promise<Error | null> {
    if (error.message.includes('validate_output') || error.message.includes('check_facts')) {
      logger.warn(`[ValidationSkill] Validation tool error: ${error.message}`);
    }
    return null;
  },
};
