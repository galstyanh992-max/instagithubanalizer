/**
 * Browser Operator Provider Registry
 *
 * Manages browser provider adapters. Each provider has its own
 * browser instance, profile, and configuration.
 */

import type {
  IBrowserProviderAdapter,
  BrowserProviderConfig,
} from './BrowserOperatorTypes';
import defaultProvidersConfig from './config/providers.config.json';
import { loggers } from '@/lib/logger';

// ── Registry ───────────────────────────────────────────────────
class BrowserOperatorProviderRegistry {
  private providers: Map<string, IBrowserProviderAdapter> = new Map();
  private configs: Map<string, BrowserProviderConfig> = new Map();
  private initialized: boolean = false;

  /** Register a provider adapter */
  register(adapter: IBrowserProviderAdapter): void {
    this.providers.set(adapter.id, adapter);
  }

  /** Get a provider by ID */
  get(providerId: string): IBrowserProviderAdapter | undefined {
    return this.providers.get(providerId);
  }

  /** Get provider or throw */
  getOrThrow(providerId: string): IBrowserProviderAdapter {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Browser provider "${providerId}" not registered. Available: ${this.listIds().join(', ')}`);
    }
    return provider;
  }

  /** List all provider IDs */
  listIds(): string[] {
    return Array.from(this.providers.keys());
  }

  /** List all providers with status */
  listAll(): Array<{ id: string; name: string; description: string; active: boolean; currentUrl?: string; sessionCount: number }> {
    return Array.from(this.providers.entries()).map(([id, p]) => {
      const config = this.configs.get(id);
      return {
        id: p.id,
        name: p.name,
        description: config?.description ?? '',
        ...p.getStatus(),
      };
    });
  }

  /** Register a provider config */
  registerConfig(config: BrowserProviderConfig): void {
    this.configs.set(config.id, config);
  }

  /** Get provider config */
  getConfig(providerId: string): BrowserProviderConfig | undefined {
    return this.configs.get(providerId);
  }

  /** Load default configs from JSON */
  loadDefaultConfigs(): void {
    for (const config of defaultProvidersConfig.providers as BrowserProviderConfig[]) {
      this.registerConfig(config);
    }
  }

  /** Initialize all registered providers with their configs */
  async initializeAll(): Promise<void> {
    if (this.initialized) return;

    for (const [id, adapter] of this.providers.entries()) {
      const config = this.configs.get(id);
      if (config) {
        try {
          await adapter.initialize(config);
        } catch (err) {
          loggers.browser.error({ err: err }, `[BrowserOperator] Failed to initialize provider "${id}":`);
        }
      }
    }

    this.initialized = true;
  }

  /** Shutdown all providers */
  async shutdownAll(): Promise<void> {
    for (const [, adapter] of this.providers.entries()) {
      try {
        await adapter.shutdown();
      } catch {
        // Swallow shutdown errors
      }
    }
    this.initialized = false;
  }

  /** Check if a URL is allowed for a provider */
  isUrlAllowed(providerId: string, url: string): boolean {
    const config = this.configs.get(providerId);
    if (!config) return true; // No config = allow all

    try {
      const hostname = new URL(url).hostname;

      // Check blocked domains first
      if (config.blockedDomains.length > 0) {
        for (const blocked of config.blockedDomains) {
          if (hostname === blocked || hostname.endsWith(`.${blocked}`)) {
            return false;
          }
        }
      }

      // Check allowed domains (if specified)
      if (config.allowedDomains.length > 0) {
        return config.allowedDomains.some(
          (d) => hostname === d || hostname.endsWith(`.${d}`),
        );
      }

      return true;
    } catch {
      return false; // Invalid URL
    }
  }
}

// ── Singleton (using globalThis for HMR consistency) ─────────────
const REGISTRY_KEY = '__browser_operator_registry__';

export function getBrowserProviderRegistry(): BrowserOperatorProviderRegistry {
  if (!(globalThis as any)[REGISTRY_KEY]) {
    (globalThis as any)[REGISTRY_KEY] = new BrowserOperatorProviderRegistry();
    (globalThis as any)[REGISTRY_KEY].loadDefaultConfigs();
  }
  return (globalThis as any)[REGISTRY_KEY];
}

export { BrowserOperatorProviderRegistry };
