// Agent OS — Provider configurations and factory
// Central place for wiring every supported AI provider from environment variables.

import 'server-only';

import { env } from '@/lib/env';
import { buildOpenAICompatibleConfig, type OpenAICompatibleConfig } from './openai-compatible/config';
import { OpenAICompatibleProvider } from './openai-compatible/adapter';
import type { AIProvider } from './types';

export interface ProviderConfigEntry {
  id: string;
  name: string;
  config: OpenAICompatibleConfig;
  isConfigured: () => boolean;
  create: () => AIProvider;
}

const openRouterEntry: ProviderConfigEntry = {
  id: 'openrouter',
  name: 'OpenRouter',
  config: buildOpenAICompatibleConfig({
    id: 'openrouter',
    name: 'OpenRouter',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    baseUrlEnv: 'OPENROUTER_BASE_URL',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModelEnv: 'OPENROUTER_MODEL',
    fallbackModel: 'anthropic/claude-3-5-sonnet-20240620',
    siteUrlEnv: 'OPENROUTER_SITE_URL',
    siteNameEnv: 'OPENROUTER_SITE_NAME',
    timeoutMsEnv: 'OPENROUTER_TIMEOUT_MS',
    maxRetriesEnv: 'OPENROUTER_MAX_RETRIES',
  }),
  isConfigured: () => Boolean(env.OPENROUTER_API_KEY),
  create: () => new OpenAICompatibleProvider(openRouterEntry.config),
};

const openaiEntry: ProviderConfigEntry = {
  id: 'openai',
  name: 'OpenAI',
  config: buildOpenAICompatibleConfig({
    id: 'openai',
    name: 'OpenAI',
    apiKeyEnv: 'OPENAI_API_KEY',
    baseUrlEnv: 'OPENAI_BASE_URL',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModelEnv: 'OPENAI_MODEL',
    fallbackModel: 'gpt-4o',
  }),
  isConfigured: () => Boolean(env.OPENAI_API_KEY),
  create: () => new OpenAICompatibleProvider(openaiEntry.config),
};

const geminiEntry: ProviderConfigEntry = {
  id: 'gemini',
  name: 'Gemini',
  config: buildOpenAICompatibleConfig({
    id: 'gemini',
    name: 'Gemini',
    apiKeyEnv: 'GEMINI_API_KEY',
    baseUrlEnv: 'GEMINI_BASE_URL',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModelEnv: 'GEMINI_MODEL',
    fallbackModel: 'gemini-1.5-pro',
  }),
  isConfigured: () => Boolean(env.GEMINI_API_KEY),
  create: () => new OpenAICompatibleProvider(geminiEntry.config),
};

const groqEntry: ProviderConfigEntry = {
  id: 'groq',
  name: 'Groq',
  config: buildOpenAICompatibleConfig({
    id: 'groq',
    name: 'Groq',
    apiKeyEnv: 'GROQ_API_KEY',
    baseUrlEnv: 'GROQ_BASE_URL',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    defaultModelEnv: 'GROQ_MODEL',
    fallbackModel: 'llama-3.1-70b-versatile',
  }),
  isConfigured: () => Boolean(env.GROQ_API_KEY),
  create: () => new OpenAICompatibleProvider(groqEntry.config),
};

const cerebrasEntry: ProviderConfigEntry = {
  id: 'cerebras',
  name: 'Cerebras',
  config: buildOpenAICompatibleConfig({
    id: 'cerebras',
    name: 'Cerebras',
    apiKeyEnv: 'CEREBRAS_API_KEY',
    baseUrlEnv: 'CEREBRAS_BASE_URL',
    defaultBaseUrl: 'https://api.cerebras.ai/v1',
    defaultModelEnv: 'CEREBRAS_MODEL',
    fallbackModel: 'llama3.1-70b',
  }),
  isConfigured: () => Boolean(env.CEREBRAS_API_KEY),
  create: () => new OpenAICompatibleProvider(cerebrasEntry.config),
};

const glmEntry: ProviderConfigEntry = {
  id: 'glm',
  name: 'GLM',
  config: buildOpenAICompatibleConfig({
    id: 'glm',
    name: 'GLM',
    apiKeyEnv: 'GLM_API_KEY',
    baseUrlEnv: 'GLM_BASE_URL',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModelEnv: 'GLM_MODEL',
    fallbackModel: 'glm-5.2',
  }),
  isConfigured: () => Boolean(env.GLM_API_KEY),
  create: () => new OpenAICompatibleProvider(glmEntry.config),
};

const ollamaCloudEntry: ProviderConfigEntry = {
  id: 'ollama-cloud',
  name: 'Ollama Cloud',
  config: buildOpenAICompatibleConfig({
    id: 'ollama-cloud',
    name: 'Ollama Cloud',
    apiKeyEnv: 'OLLAMA_CLOUD_API_KEY',
    baseUrlEnv: 'OLLAMA_CLOUD_BASE_URL',
    defaultBaseUrl: 'https://api.ollama.com/v1',
    defaultModelEnv: 'OLLAMA_CLOUD_MODEL',
    fallbackModel: 'llama3.1-70b',
  }),
  isConfigured: () => Boolean(env.OLLAMA_CLOUD_API_KEY),
  create: () => new OpenAICompatibleProvider(ollamaCloudEntry.config),
};

// GPT-5.5 Thinking — Orchestrator / CEO brain
const openaiThinkingEntry: ProviderConfigEntry = {
  id: 'openai-thinking',
  name: 'OpenAI Thinking (GPT-5.5)',
  config: buildOpenAICompatibleConfig({
    id: 'openai-thinking',
    name: 'OpenAI Thinking (GPT-5.5)',
    apiKeyEnv: 'OPENAI_THINKING_API_KEY',
    baseUrlEnv: 'OPENAI_THINKING_BASE_URL',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModelEnv: 'OPENAI_THINKING_MODEL',
    fallbackModel: 'gpt-5.5-thinking',
  }),
  isConfigured: () => Boolean(env.OPENAI_THINKING_API_KEY),
  create: () => new OpenAICompatibleProvider(openaiThinkingEntry.config),
};

// Kimi K2.7 Code — Second developer / MCP / Tool Use
const kimiEntry: ProviderConfigEntry = {
  id: 'kimi',
  name: 'Kimi K2.7 Code',
  config: buildOpenAICompatibleConfig({
    id: 'kimi',
    name: 'Kimi K2.7 Code',
    apiKeyEnv: 'KIMI_API_KEY',
    baseUrlEnv: 'KIMI_BASE_URL',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    defaultModelEnv: 'KIMI_MODEL',
    fallbackModel: 'kimi-k2.7-code',
  }),
  isConfigured: () => Boolean(env.KIMI_API_KEY),
  create: () => new OpenAICompatibleProvider(kimiEntry.config),
};

// Legal Armenia — isolated legal/RAG/PDF model
const legalAiEntry: ProviderConfigEntry = {
  id: 'legal-ai',
  name: 'Legal Armenia AI',
  config: buildOpenAICompatibleConfig({
    id: 'legal-ai',
    name: 'Legal Armenia AI',
    apiKeyEnv: 'LEGAL_AI_API_KEY',
    baseUrlEnv: 'LEGAL_AI_BASE_URL',
    defaultBaseUrl: 'https://api.legal-armenia.ai/v1',
    defaultModelEnv: 'LEGAL_AI_MODEL',
    fallbackModel: 'legal-armenia-pro',
  }),
  isConfigured: () => Boolean(env.LEGAL_AI_API_KEY),
  create: () => new OpenAICompatibleProvider(legalAiEntry.config),
};

/**
 * All provider entries in priority order.
 * The first configured provider becomes the default when env.AI_PROVIDER is not set
 * or points to an unconfigured provider.
 */
export const PROVIDER_ENTRIES: ProviderConfigEntry[] = [
  ollamaCloudEntry,
  openaiThinkingEntry,
  kimiEntry,
  legalAiEntry,
  glmEntry,
  openRouterEntry,
  openaiEntry,
  geminiEntry,
  groqEntry,
  cerebrasEntry,
];

export function getProviderEntryById(id: string): ProviderConfigEntry | undefined {
  return PROVIDER_ENTRIES.find((entry) => entry.id === id);
}

export function listConfiguredProviderIds(): string[] {
  return PROVIDER_ENTRIES.filter((entry) => entry.isConfigured()).map((entry) => entry.id);
}

export function createConfiguredProviders(): AIProvider[] {
  return PROVIDER_ENTRIES.filter((entry) => entry.isConfigured()).map((entry) => entry.create());
}
