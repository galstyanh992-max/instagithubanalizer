import type { AgentRole, ModelConfig } from '@/lib/agent-core/types';

export const OPENROUTER_PROVIDER_ID = 'openrouter';

export const OPENROUTER_MODELS = {
  reasoning: 'anthropic/claude-sonnet-4.6',
  fast: 'google/gemini-3.5-flash',
  coding: 'anthropic/claude-sonnet-4.6',
  codingFallback: 'google/gemini-3.5-flash',
} as const;

const MODEL_ALIASES: Record<string, string> = {
  '~anthropic/claude-sonnet-latest': OPENROUTER_MODELS.coding,
  'anthropic/claude-sonnet-latest': OPENROUTER_MODELS.coding,
  'anthropic/claude-3.5-sonnet': OPENROUTER_MODELS.coding,
  'anthropic/claude-3-5-sonnet': OPENROUTER_MODELS.coding,
  'google/gemini-2.0-flash-001': OPENROUTER_MODELS.fast,
  'google/gemini-2.0-flash-exp': OPENROUTER_MODELS.fast,
  'openai/gpt-4o': OPENROUTER_MODELS.reasoning,
  'meta-llama/llama-3.1-70b-instruct': OPENROUTER_MODELS.fast,
};

const REASONING_ROLES = new Set<string>([
  'orchestrator',
  'architect',
  'analyst',
  'researcher',
  'market_researcher',
  'marketing_analyst',
  'trend_analyst',
  'security_engineer',
  'brand_guardian',
  'reviewer',
  'supervisor',
  'legal',
  'lawyer',
  'prosecutor',
  'judge',
]);

const CODING_ROLES = new Set<string>([
  'frontend_engineer',
  'backend_engineer',
  'data_engineer',
  'devops_engineer',
  'qa_engineer',
  'engineer',
  'developer',
  'fix_agent',
  'coder',
]);

const FAST_UTILITY_ROLES = new Set<string>([
  'designer',
  'visual_designer',
  'video_editor',
  'publisher',
  'community_manager',
  'messenger_support',
  'sales_agent',
  'copywriter',
  'content_strategist',
  'marketing_lead',
  'growth_manager',
  'custom',
]);

export function resolveOpenRouterModelAlias(model: string): string {
  return MODEL_ALIASES[model] ?? model;
}

function assignment(providerId: string, model: string, maxTokens?: number) {
  return {
    provider: providerId,
    model: resolveOpenRouterModelAlias(model),
    ...(maxTokens ? { maxTokens } : {}),
  };
}

export function getModelConfigForRole(
  role: string,
  providerId: string,
  models: { reasoning: string; fast: string; coding: string; codingFallback: string },
  maxTokens = 2048,
): ModelConfig {
  const normalized = role.toLowerCase().replace(/[-\s]/g, '_');

  if (REASONING_ROLES.has(normalized)) {
    return {
      preferred: assignment(providerId, models.reasoning, maxTokens),
      fallback: assignment(providerId, models.fast, maxTokens),
    };
  }

  if (CODING_ROLES.has(normalized)) {
    return {
      preferred: assignment(providerId, models.coding, maxTokens),
      fallback: assignment(providerId, models.codingFallback, maxTokens),
    };
  }

  if (FAST_UTILITY_ROLES.has(normalized)) {
    return {
      preferred: assignment(providerId, models.fast, maxTokens),
      fallback: assignment(providerId, models.reasoning, maxTokens),
    };
  }

  return {
    preferred: assignment(providerId, models.fast, maxTokens),
    fallback: assignment(providerId, models.reasoning, maxTokens),
  };
}

export function getOpenRouterModelConfigForRole(role: string, maxTokens = 2048): ModelConfig {
  return getModelConfigForRole(role, OPENROUTER_PROVIDER_ID, OPENROUTER_MODELS, maxTokens);
}

export function normalizeOpenRouterModelConfig(role: AgentRole | string, model: ModelConfig): ModelConfig {
  const maxTokens = model.preferred.maxTokens ?? model.fallback?.maxTokens ?? 2048;
  const mapped = getOpenRouterModelConfigForRole(role, maxTokens);

  return {
    preferred: {
      ...mapped.preferred,
      maxCostPerTask: model.preferred.maxCostPerTask,
    },
    fallback: mapped.fallback
      ? {
          ...mapped.fallback,
          maxCostPerTask: model.fallback?.maxCostPerTask,
        }
      : undefined,
  };
}

export function getOpenRouterStartupModelIds(): string[] {
  return [
    OPENROUTER_MODELS.reasoning,
    OPENROUTER_MODELS.fast,
    OPENROUTER_MODELS.coding,
    OPENROUTER_MODELS.codingFallback,
  ];
}

export function getDeclaredOpenRouterModelIds(): string[] {
  return Array.from(new Set([
    ...getOpenRouterStartupModelIds(),
  ]));
}
