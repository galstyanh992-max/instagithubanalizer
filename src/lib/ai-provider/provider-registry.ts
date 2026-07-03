// ─── Agent OS — Provider Registry ─────────────────────────────
// Singleton registry that holds all available AI providers.
// Agents resolve their provider through this registry at runtime.

import type { AIProvider } from './types';
import { logger } from '@/lib/logger';

class ProviderRegistry {
  private static instance: ProviderRegistry | null = null;
  private providers: Map<string, AIProvider> = new Map();

  private constructor() {}

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  /** Register a provider */
  register(provider: AIProvider): void {
    if (this.providers.has(provider.id)) {
      logger.warn(`[ProviderRegistry] Overwriting existing provider: ${provider.id}`);
    }
    this.providers.set(provider.id, provider);
  }

  /** Get a provider by ID */
  get(providerId: string): AIProvider | undefined {
    return this.providers.get(providerId);
  }

  /** Get a provider or throw */
  getOrThrow(providerId: string): AIProvider {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}. Registered: [${this.listIds().join(', ')}]`);
    }
    return provider;
  }

  /** List all registered provider IDs */
  listIds(): string[] {
    return Array.from(this.providers.keys());
  }

  /** List all registered providers */
  listAll(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  /** Check if a provider is registered */
  has(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  /** Unregister a provider */
  unregister(providerId: string): boolean {
    return this.providers.delete(providerId);
  }
}

export const providerRegistry = ProviderRegistry.getInstance();
