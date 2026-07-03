import 'server-only';

import { logger } from '@/lib/logger';
import { providerRegistry } from './provider-registry';
import { OpenRouterProvider } from './openrouter/adapter';
import { isOpenRouterConfigured } from './openrouter/config';
import { getOpenRouterStartupModelIds } from './model-registry';

let initialized = false;

/**
 * Initialize all AI providers at application startup.
 * Server-only by construction; do not import this from client components.
 */
export async function initProviders(): Promise<void> {
  if (initialized) return;

  if (isOpenRouterConfigured()) {
    const openRouter = new OpenRouterProvider();
    providerRegistry.register(openRouter);
    await validateStartupModels(openRouter);
    logger.info('[AI Provider] OpenRouter registered');
  } else {
    logger.warn('[AI Provider] OpenRouter not configured - set OPENROUTER_API_KEY in .env');
  }

  initialized = true;
}

async function validateStartupModels(provider: OpenRouterProvider): Promise<void> {
  if (process.env.OPENROUTER_VALIDATE_MODELS === 'false') return;
  const models = await provider.listModels();
  const availableIds = new Set(models.map((model) => model.id));
  const missing = getOpenRouterStartupModelIds().filter((modelId) => !availableIds.has(modelId));

  if (missing.length > 0) {
    throw new Error(`OpenRouter startup model validation failed. Missing models: ${missing.join(', ')}`);
  }
}

export { providerRegistry };
export { isOpenRouterConfigured };
