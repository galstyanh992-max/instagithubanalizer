import 'server-only';

import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { providerRegistry } from './provider-registry';
import { createConfiguredProviders } from './providers';
import { MockProvider } from './mock-provider';
import { resolveDefaultProviderId } from './default-provider';

let initialized = false;

/**
 * Initialize all AI providers at application startup.
 * Server-only by construction; do not import this from client components.
 *
 * Registers every provider that has an API key configured.
 * If none are configured, registers a mock fallback when allowed.
 */
export async function initProviders(): Promise<void> {
  if (initialized) return;

  const configured = createConfiguredProviders();

  if (configured.length === 0) {
    if (env.AI_ENABLE_MOCK_FALLBACK === 'true') {
      providerRegistry.register(new MockProvider());
      logger.warn('[AI Provider] No real AI providers configured. Mock provider registered as fallback.');
    } else {
      logger.warn('[AI Provider] No AI providers configured. Set at least one provider API key in .env');
    }
  } else {
    for (const provider of configured) {
      providerRegistry.register(provider);
      logger.info(`[AI Provider] Registered provider: ${provider.id}`);
    }
  }

  const registeredIds = providerRegistry.listIds();
  if (registeredIds.length > 0) {
    const defaultId = resolveDefaultProviderId();
    logger.info(`[AI Provider] Default provider resolved to: ${defaultId}`);
  }

  initialized = true;
}

export { providerRegistry };
export { resolveDefaultProviderId, getDefaultProvider, resolveProviderId } from './default-provider';
export { listConfiguredProviderIds, getProviderEntryById } from './providers';
