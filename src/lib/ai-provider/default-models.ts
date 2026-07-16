// Agent OS — Default model mapping per provider
// Maps an agent role category to a model ID for each supported provider.
// Heavy/reasoning/coding models fall back to the provider's default model env var
// so the system works even when a provider is not OpenRouter.

import 'server-only';

import { env } from '@/lib/env';

export interface DefaultModelMapping {
  reasoning: string;
  fast: string;
  coding: string;
  codingFallback: string;
}

export const PROVIDER_DEFAULT_MODELS: Record<string, DefaultModelMapping> = {
  'ollama-cloud': {
    reasoning: env.OLLAMA_CLOUD_MODEL,
    fast: env.OLLAMA_CLOUD_MODEL,
    coding: env.OLLAMA_CLOUD_KIMI_MODEL,
    codingFallback: env.OLLAMA_CLOUD_MODEL,
  },
  glm: {
    reasoning: env.GLM_MODEL,
    fast: env.GLM_MODEL,
    coding: env.GLM_MODEL,
    codingFallback: env.GLM_MODEL,
  },
  openrouter: {
    reasoning: env.OPENROUTER_MODEL,
    fast: env.OPENROUTER_MODEL,
    coding: env.OPENROUTER_MODEL,
    codingFallback: env.OPENROUTER_MODEL,
  },
  openai: {
    reasoning: env.OPENAI_MODEL,
    fast: env.OPENAI_MODEL,
    coding: env.OPENAI_MODEL,
    codingFallback: env.OPENAI_MODEL,
  },
  gemini: {
    reasoning: env.GEMINI_MODEL,
    fast: env.GEMINI_MODEL,
    coding: env.GEMINI_MODEL,
    codingFallback: env.GEMINI_MODEL,
  },
  groq: {
    reasoning: env.GROQ_MODEL,
    fast: env.GROQ_MODEL,
    coding: env.GROQ_MODEL,
    codingFallback: env.GROQ_MODEL,
  },
  cerebras: {
    reasoning: env.CEREBRAS_MODEL,
    fast: env.CEREBRAS_MODEL,
    coding: env.CEREBRAS_MODEL,
    codingFallback: env.CEREBRAS_MODEL,
  },
  mock: {
    reasoning: 'mock',
    fast: 'mock',
    coding: 'mock',
    codingFallback: 'mock',
  },
};

export function getDefaultModelsForProvider(providerId: string): DefaultModelMapping {
  return PROVIDER_DEFAULT_MODELS[providerId] ?? PROVIDER_DEFAULT_MODELS.mock;
}
