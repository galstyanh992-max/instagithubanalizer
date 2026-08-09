// ─── JARVIS Agent Network — Skills ─────────────────────────
// Skill implementations that wrap the JARVIS network lifecycle.
// Registered into the existing SkillRegistry so agents can use them.

import type { AgentResult } from '@/lib/agent-core/types';
import { skillRegistry } from '@/lib/skills/registry';
import type { ISkill, SkillContext } from '@/lib/skills/types';

// ─── Shared Helpers ──────────────────────────────────────────

function appendSystemPrompt(context: SkillContext, text: string): SkillContext {
  return {
    ...context,
    systemPromptAppendix: `${context.systemPromptAppendix}\n\n${text}`.trim(),
  };
}

function appendContent(content: string | null, prefix: string): string {
  const base = content ?? '';
  return `${prefix}\n${base}`.trim();
}

// ─── JARVIS Orchestrator Skill ───────────────────────────────

class JarvisOrchestratorSkill implements ISkill {
  readonly id = 'jarvis_orchestrator';
  readonly name = 'JARVIS Network Orchestrator';
  readonly description = 'Plans multi-agent runs and tracks release gates.';
  readonly version = '1.0.0';

  async beforeRun(context: SkillContext): Promise<SkillContext> {
    return appendSystemPrompt(context,
      `You are coordinating a JARVIS Agent Network run.\n` +
      `Rules:\n` +
      `1. Decompose the goal into parallelizable tasks.\n` +
      `2. Assign each task to a specialist agent.\n` +
      `3. Define verification criteria before claiming completion.\n` +
      `4. If a task fails, create a finding and route to repair.\n` +
      `5. Never approve destructive actions without explicit user approval.`
    );
  }

  async afterRun(_context: SkillContext, result: AgentResult): Promise<AgentResult> {
    return {
      ...result,
      content: appendContent(result.content, '[JARVIS Orchestrator]'),
    };
  }

  async onError(_context: SkillContext, error: Error): Promise<Error | null> {
    return new Error(`[JARVIS Orchestrator] ${error.message}`);
  }
}

// ─── JARVIS Coder Skill ──────────────────────────────────────

class JarvisCoderSkill implements ISkill {
  readonly id = 'jarvis_coder';
  readonly name = 'JARVIS Code Specialist';
  readonly description = 'Enforces code quality, type safety, and verification after edits.';
  readonly version = '1.0.0';

  async beforeRun(context: SkillContext): Promise<SkillContext> {
    return appendSystemPrompt(context,
      `You are a JARVIS code specialist.\n` +
      `Rules:\n` +
      `1. Read the relevant files before editing.\n` +
      `2. Make minimal, focused changes.\n` +
      `3. After editing, run typecheck and relevant tests.\n` +
      `4. Report changed files and verification evidence.\n` +
      `5. Never expose secrets or hardcode credentials.`
    );
  }

  async afterRun(context: SkillContext, result: AgentResult): Promise<AgentResult> {
    const tools = context.injectedToolDefinitions.map((t) => t.function.name).join(', ');
    return {
      ...result,
      content: appendContent(result.content, `[JARVIS Coder${tools ? ` tools=${tools}` : ''}]`),
    };
  }

  async onError(_context: SkillContext, error: Error): Promise<Error | null> {
    return new Error(`[JARVIS Coder] ${error.message}`);
  }
}

// ─── JARVIS Safety Skill ─────────────────────────────────────

class JarvisSafetySkill implements ISkill {
  readonly id = 'jarvis_safety';
  readonly name = 'JARVIS Safety Guard';
  readonly description = 'Reviews agent actions for dangerous or disallowed operations.';
  readonly version = '1.0.0';

  async beforeRun(context: SkillContext): Promise<SkillContext> {
    return appendSystemPrompt(context,
      `You are a JARVIS safety guard.\n` +
      `Rules:\n` +
      `1. Reject commands that delete production data or expose secrets.\n` +
      `2. Require explicit approval for high-risk tools.\n` +
      `3. Prefer read-only exploration when uncertain.\n` +
      `4. Report any assumption that could affect security.`
    );
  }

  async afterRun(_context: SkillContext, result: AgentResult): Promise<AgentResult> {
    const risky = (result.toolCalls ?? []).some((tc) => {
      const name = typeof tc === 'object' && tc !== null && 'function' in tc
        ? (tc as { function?: { name?: string } }).function?.name ?? ''
        : String(tc);
      return /delete|drop|reset|force|rm|remove/i.test(name);
    });
    if (risky && result.status === 'success') {
      return {
        ...result,
        status: 'error',
        content: appendContent(result.content, '[JARVIS Safety Review Required]'),
        error: 'Potentially destructive tool call detected.',
      };
    }
    return result;
  }

  async onError(_context: SkillContext, error: Error): Promise<Error | null> {
    return new Error(`[JARVIS Safety] ${error.message}`);
  }
}

// ─── JARVIS Verifier Skill ───────────────────────────────────

class JarvisVerifierSkill implements ISkill {
  readonly id = 'jarvis_verifier';
  readonly name = 'JARVIS Verification Specialist';
  readonly description = 'Adds verification expectations to agent outputs.';
  readonly version = '1.0.0';

  async beforeRun(context: SkillContext): Promise<SkillContext> {
    return appendSystemPrompt(context,
      `You are a JARVIS verifier.\n` +
      `Rules:\n` +
      `1. Every claim must be backed by evidence.\n` +
      `2. After completing work, run the relevant checks (typecheck, lint, tests, build).\n` +
      `3. Report pass/fail status and snippets of evidence.\n` +
      `4. If a check cannot be run, explicitly say it is NOT_RUN and why.`
    );
  }

  async afterRun(_context: SkillContext, result: AgentResult): Promise<AgentResult> {
    return {
      ...result,
      content: appendContent(result.content, '[JARVIS Verified]'),
    };
  }

  async onError(_context: SkillContext, error: Error): Promise<Error | null> {
    return new Error(`[JARVIS Verifier] ${error.message}`);
  }
}

// ─── Registration ────────────────────────────────────────────

export const JARVIS_SKILLS: ISkill[] = [
  new JarvisOrchestratorSkill(),
  new JarvisCoderSkill(),
  new JarvisSafetySkill(),
  new JarvisVerifierSkill(),
];

export function registerJarvisSkills(): void {
  skillRegistry.registerAll(JARVIS_SKILLS, 'jarvis-network');
}
