// ─── Agent OS — Stage 3: Planning Skill ────────────────────────
// A skill that enhances an agent's ability to plan and structure tasks.
// Injects planning-specific instructions into the system prompt and
// provides a "create_plan" tool that the model can call.
//
// What it does:
// - beforeRun: Appends planning instructions to system prompt, injects create_plan tool
// - afterRun:  Validates that if the agent was asked to plan, it produced structured output
// - onError:   Logs planning-specific errors

import type { ISkill, SkillContext } from '../types';
import type { AgentResult } from '../../agent-core/types';
import type { ToolDefinition } from '../../ai-provider/types';
import { logger } from '@/lib/logger';

// ─── Planning Tool Definition ────────────────────────────────

const CREATE_PLAN_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'create_plan',
    description:
      'Create a structured plan with steps. Use this when you need to break down a task into ordered steps.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the plan',
        },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string', description: 'What this step accomplishes' },
              assignee: { type: 'string', description: 'Who should do this step (role or agent name)' },
              priority: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Step priority' },
            },
            required: ['description'],
          },
          description: 'Ordered list of steps in the plan',
        },
        rationale: {
          type: 'string',
          description: 'Why this plan approach was chosen',
        },
      },
      required: ['title', 'steps'],
    },
  },
};

const PRIORITIZE_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'prioritize_tasks',
    description:
      'Prioritize a list of tasks by importance and urgency. Returns an ordered list.',
    parameters: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of task descriptions to prioritize',
        },
        criteria: {
          type: 'string',
          description: 'Prioritization criteria (e.g. "urgency", "impact", "dependencies")',
        },
      },
      required: ['tasks'],
    },
  },
};

// ─── Planning System Prompt Appendix ─────────────────────────

const PLANNING_PROMPT_APPENDIX = `

[Planning Skill Active]
When approaching complex tasks:
1. First, break down the task into clear steps using the create_plan tool
2. Assign priorities and owners to each step
3. Consider dependencies between steps
4. Provide rationale for your planning approach
5. If there are multiple tasks, use prioritize_tasks to order them

Always think step-by-step and make your reasoning explicit.
`;

// ─── Planning Skill Implementation ───────────────────────────

export const planningSkill: ISkill = {
  id: 'planning',
  name: 'Planning',
  description:
    'Enhances an agent with structured planning capabilities. Injects planning tools and instructions.',
  version: '1.0.0',

  async beforeRun(context: SkillContext): Promise<SkillContext> {
    // Inject planning tools
    context.injectedToolDefinitions.push(CREATE_PLAN_TOOL, PRIORITIZE_TOOL);

    // Append planning instructions to system prompt
    context.systemPromptAppendix += PLANNING_PROMPT_APPENDIX;

    // Mark in context data that planning is active
    context.data.planningActive = true;

    return context;
  },

  async afterRun(context: SkillContext, result: AgentResult): Promise<AgentResult> {
    // If planning was active and the result mentions plan-related keywords,
    // tag the result for downstream consumers
    if (context.data.planningActive && result.content) {
      const planKeywords = ['step 1', 'step 2', 'plan:', 'approach:', 'phases'];
      const hasPlanStructure = planKeywords.some((kw) =>
        result.content!.toLowerCase().includes(kw)
      );

      if (hasPlanStructure) {
        // Attach metadata about planning
        result = {
          ...result,
          // We store planning metadata in the result for consumers
        };
        context.data.planDetected = true;
      }
    }

    return result;
  },

  async onError(_context: SkillContext, error: Error): Promise<Error | null> {
    // Check if error is planning-related
    if (error.message.includes('create_plan') || error.message.includes('prioritize')) {
      logger.warn(`[PlanningSkill] Planning tool error: ${error.message}`);
      // Return null to propagate the error — don't swallow it
    }
    return null;
  },
};
