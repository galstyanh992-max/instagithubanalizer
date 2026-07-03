export interface TaskSpecification {
  intent: string;
  constraints: string[];
  outputFormat: string;
  guardrails: string[];
  qualityCriteria: string[];
}

export interface StructuredPrompt {
  system?: string;
  developer?: string;
  user: string;
  metadata?: any;
}

export type ProviderType = 'claude' | 'claude_code' | 'openai' | 'gemini';

export class PromptGeneratorService {
  private static instance: PromptGeneratorService;

  private constructor() {}

  static getInstance(): PromptGeneratorService {
    if (!PromptGeneratorService.instance) {
      PromptGeneratorService.instance = new PromptGeneratorService();
    }
    return PromptGeneratorService.instance;
  }

  generateVariants(task: TaskSpecification): Record<ProviderType, StructuredPrompt> {
    return {
      claude: this.generateClaude(task),
      claude_code: this.generateClaudeCode(task),
      openai: this.generateOpenAI(task),
      gemini: this.generateGemini(task)
    };
  }

  private generateClaude(task: TaskSpecification): StructuredPrompt {
    // Claude thrives on XML tags, clear role boundaries, and explicit guardrails.
    const system = `You are an expert AI assistant.
Your primary objective is: ${task.intent}

<constraints>
${task.constraints.map(c => `- ${c}`).join('\n')}
</constraints>

<guardrails>
${task.guardrails.map(g => `- ${g}`).join('\n')}
</guardrails>

<quality_criteria>
${task.qualityCriteria.map(q => `- ${q}`).join('\n')}
</quality_criteria>`;

    const user = `Please fulfill the objective. Format your output strictly as follows:
<output_format>
${task.outputFormat}
</output_format>`;

    return { system, user };
  }

  private generateClaudeCode(task: TaskSpecification): StructuredPrompt {
    // Claude Code thrives on repo-awareness, implementation-first directives, and minimizing explanations.
    const system = `You are an expert Staff-Level Coding Agent pair-programming in a local repository.
Objective: ${task.intent}

CRITICAL RULES:
${task.constraints.map(c => `- ${c}`).join('\n')}
${task.guardrails.map(g => `- ${g}`).join('\n')}

Minimize preamble. Provide direct, highly-optimized code changes. Quality MUST meet:
${task.qualityCriteria.map(q => `- ${q}`).join('\n')}`;

    const user = `Implement the objective now. Output structure must match exactly:
${task.outputFormat}`;

    return { system, user };
  }

  private generateOpenAI(task: TaskSpecification): StructuredPrompt {
    // OpenAI thrives on crisp developer/system instructions separated clearly from the user payload.
    const developer = `You are a helpful, professional AI.
TASK: ${task.intent}
CONSTRAINTS:
${task.constraints.map(c => `- ${c}`).join('\n')}
GUARDRAILS:
${task.guardrails.map(g => `- ${g}`).join('\n')}
QUALITY STANDARDS:
${task.qualityCriteria.map(q => `- ${q}`).join('\n')}`;

    const user = `Execute the task. Ensure output exactly conforms to this format:
${task.outputFormat}`;

    return { developer, user };
  }

  private generateGemini(task: TaskSpecification): StructuredPrompt {
    // Gemini thrives on structured planning, research-first framing, and clear steps.
    const system = `You are an advanced analytical model.
Goal: ${task.intent}

Before acting, consider the following constraints and guardrails:
- Constraints: ${task.constraints.join('; ')}
- Guardrails: ${task.guardrails.join('; ')}

Ensure your solution hits these quality marks: ${task.qualityCriteria.join('; ')}`;

    const user = `Step 1: Outline your plan.
Step 2: Execute the plan to produce the final output.

Final output format specification:
${task.outputFormat}`;

    return { system, user };
  }
}

export const promptGeneratorService = PromptGeneratorService.getInstance();
