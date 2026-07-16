// Agent OS — Default provider resolution
// Determines which provider should be used when the caller does not specify one.
// This file can be imported from non-server-only code, but it reads server-side env.

import { env } from '@/lib/env';
import { providerRegistry } from './provider-registry';
import { listConfiguredProviderIds } from './providers';

export const DEFAULT_PROVIDER_PREFERENCE = 'ollama-cloud';

/**
 * Resolve the default provider ID.
 * Priority: env.AI_PROVIDER > env.DEFAULT_AI_PROVIDER > first configured provider > mock.
 */
export function resolveDefaultProviderId(): string {
  const preferred = env.AI_PROVIDER || env.DEFAULT_AI_PROVIDER || DEFAULT_PROVIDER_PREFERENCE;

  if (providerRegistry.has(preferred)) return preferred;

  const configuredIds = listConfiguredProviderIds();
  if (configuredIds.length > 0) return configuredIds[0];

  if (providerRegistry.has('mock')) return 'mock';

  throw new Error('No AI providers are available. Configure at least one provider or enable mock fallback.');
}

/**
 * Resolve a provider ID by explicit preference or fall back to the default.
 */
export function resolveProviderId(preferredId?: string): string {
  if (preferredId && providerRegistry.has(preferredId)) return preferredId;
  return resolveDefaultProviderId();
}

/**
 * Get the default provider instance from the registry.
 */
export function getDefaultProvider() {
  return providerRegistry.getOrThrow(resolveDefaultProviderId());
}
