import { TaskPayload } from './types';

export class WorkerPromptBuilder {
  public buildPrompt(task: TaskPayload, context: Record<string, any> = {}): string {
    const basePrompt = `
You are an AI Worker inside the JARVIS Agent OS framework.
TASK ID: ${task.taskId}
RUN ID: ${task.runId}

INSTRUCTIONS:
${task.instructions}

AVAILABLE FILES:
${task.files.join('\n')}

RULES:
1. Do not use destructive git commands.
2. Produce a unified patch file as your final output.
3. Obey isolated workspace constraints.
    `;
    
    return basePrompt.trim();
  }
}
