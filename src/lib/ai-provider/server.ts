import 'server-only';

import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { providerRegistry } from './provider-registry';
import { createConfiguredProviders } from './providers';
import { resolveDefaultProviderId } from './default-provider';
import { codexSubscriptionProvider } from './codex-subscription';
import { CodexChatAdapter } from './codex-subscription/adapter';
import { OllamaLocalProvider } from './ollama-local/adapter';
import { OpenCodeGoProvider, buildOpenCodeGoConfig, isOpenCodeGoConfigured } from './opencode-go/adapter';

let initialized = false;

function isCodexChatEnabled(): boolean {
  const value = env.JARVIS_CODEX_CHAT_ENABLED;
  return value !== 'false' && value !== '0' && value !== 'no';
}

async function registerCodexChatBridge(): Promise<void> {
  if (!isCodexChatEnabled()) {
    logger.info('[AI Provider] Codex chat bridge disabled by JARVIS_CODEX_CHAT_ENABLED.');
    return;
  }
  try {
    const adapter = new CodexChatAdapter();
    const available = await adapter.isAvailable();
    if (!available) {
      const status = await codexSubscriptionProvider.getAvailability();
      logger.info(`[AI Provider] Codex skipped: ${status.status} (${status.message})`);
      return;
    }
    providerRegistry.register(adapter);
    logger.info('[AI Provider] Registered Codex (ChatGPT subscription) provider for chat routing.');
  } catch (error) {
    // Codex registration must never block the rest of the provider stack.
    logger.warn({ err: error }, '[AI Provider] Codex chat bridge registration failed.');
  }
}

async function registerOllamaLocal(): Promise<void> {
  try {
    const provider = new OllamaLocalProvider();
    if (await provider.isAvailable()) {
      providerRegistry.register(provider);
      logger.info('[AI Provider] Registered local Ollama provider.');
    }
  } catch (error) {
    logger.warn({ err: error }, '[AI Provider] Local Ollama registration failed.');
  }
}

// OpenCode Go — additional cloud provider inside the existing Provider
// Router (not a second router). Credentials (OPENCODE_GO_API_KEY) stay
// server/HOME-PC-only per the runtime boundary; this function only ever
// runs where env vars are readable (never in browser code). A missing or
// invalid key must not block the rest of the provider stack from starting.
async function registerOpenCodeGo(): Promise<void> {
  try {
    const config = buildOpenCodeGoConfig();
    if (!isOpenCodeGoConfigured(config)) {
      logger.info('[AI Provider] OpenCode Go skipped: OPENCODE_GO_API_KEY not set.');
      return;
    }
    const provider = new OpenCodeGoProvider(config);
    if (await provider.isAvailable()) {
      providerRegistry.register(provider);
      logger.info('[AI Provider] Registered OpenCode Go provider.');
    } else {
      logger.warn('[AI Provider] OpenCode Go configured but not reachable (models endpoint check failed).');
    }
  } catch (error) {
    logger.warn({ err: error }, '[AI Provider] OpenCode Go registration failed.');
  }
}

/**
 * Initialize all AI providers at application startup.
 * Server-only by construction; do not import this from client components.
 *
 * Registers every configured provider. A missing provider is reported to the
 * caller instead of producing generated placeholder content.
 */
export async function initProviders(): Promise<void> {
  if (initialized) return;

  const configured = createConfiguredProviders();

  if (configured.length === 0) {
    logger.warn('[AI Provider] No AI providers configured. Set at least one provider API key in .env');
  } else {
    for (const provider of configured) {
      providerRegistry.register(provider);
      logger.info(`[AI Provider] Registered provider: ${provider.id}`);
    }
  }

  // Codex (ChatGPT subscription) is registered as a separate bridge provider.
  // It runs the official local Codex CLI/app-server, independent of API keys.
  await registerCodexChatBridge();
  await registerOllamaLocal();
  await registerOpenCodeGo();

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
