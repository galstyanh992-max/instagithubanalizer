import { env, isAiConfigured } from "@/lib/env";
import { providerRegistry, initProviders, getDefaultProvider, resolveProviderId } from "@/lib/ai-provider/server";
import type { AIProvider, CompletionRequest } from "@/lib/ai-provider/types";
import { getProviderEntryById } from "@/lib/ai-provider/providers";
import { codexSubscriptionProvider } from "@/lib/ai-provider/codex-subscription";
import { db } from "@/lib/db";
import { ollamaAdapter } from "@/lib/jarvis/platform/ollama-adapter";
import { decideOllamaLocalRoute, isHeavyAiIntent } from "@/lib/ai-provider/ollama-local/quality-policy";
import { buildOpenCodeGoConfig } from "@/lib/ai-provider/opencode-go/adapter";

export type AiIntent =
  | "chat/general"
  | "analysis"
  | "repo_analysis"
  | "integration_plan"
  | "patch_plan"
  | "security_audit"
  | "fast_ui_command"
  | "fallback"
  | "connect_project"
  | "local_compatibility"
  | "find_alternatives"
  | "voice_command"
  | "media_image"
  | "media_video"
  | "media_music"
  | "media_transcription"
  | "model_select";

export type ProviderRole = "primary-fast" | "heavy-reasoning" | "fallback" | "mock";
const PROVIDER_TIMEOUT_MS = 90_000;

async function withProviderTimeout<T>(promise: Promise<T>, providerName: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Провайдер ${providerName} не ответил за 90 секунд`)),
          PROVIDER_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export interface ProviderStatus {
  name: string;
  configured: boolean;
  role: ProviderRole;
}

type FunctionRouteKey =
  | "chat" | "analysis" | "code" | "research" | "browser" | "memory" | "legal"
  | "image" | "video" | "music" | "transcription" | "ocr" | "tts" | "stt";

const functionForIntent = (intent: string): FunctionRouteKey => {
  if (intent === "media_image") return "image";
  if (intent === "media_video") return "video";
  if (intent === "media_music") return "music";
  if (intent === "media_transcription") return "transcription";
  if (["analysis", "repo_analysis", "integration_plan", "patch_plan", "security_audit"].includes(intent)) return "analysis";
  if (["fast_ui_command", "connect_project"].includes(intent)) return "code";
  if (intent === "voice_command") return "stt";
  return "chat";
};

async function selectedProviderFor(intent: string): Promise<string | undefined> {
  try {
    const settings = await db.setting.findUnique({
      where: { id: "singleton" },
      select: { providerRoutes: true },
    });
    const routes = JSON.parse(settings?.providerRoutes || "{}") as Partial<Record<FunctionRouteKey, string>>;
    const selected = routes[functionForIntent(intent)];
    return selected && selected !== "auto" ? selected : undefined;
  } catch {
    // Routing still works from environment settings if persistence is unavailable.
    return undefined;
  }
}

export class AiProviderRouter {
  /**
   * Explicit repository workflow for the local Codex subscription provider.
   * This path is intentionally separate from API-key chat fallback routing.
   */
  public async runCodexRepositoryWorkflow(input: {
    cwd: string;
    prompt: string;
    threadId?: string;
    model?: string;
    reasoningEffort?: string;
  }): Promise<{ providerName: "codex-chatgpt-subscription"; threadId: string; turnId: string; status: string }> {
    const thread = input.threadId
      ? await codexSubscriptionProvider.resumeThread(input.threadId, {
          cwd: input.cwd,
          model: input.model,
          reasoningEffort: input.reasoningEffort,
        })
      : await codexSubscriptionProvider.startThread({
          cwd: input.cwd,
          model: input.model,
          reasoningEffort: input.reasoningEffort,
          sandbox: "workspace-write",
        });
    const turn = await codexSubscriptionProvider.startTurn(thread.threadId, input.prompt, {
      model: input.model,
      reasoningEffort: input.reasoningEffort,
    });
    return {
      providerName: "codex-chatgpt-subscription",
      threadId: thread.threadId,
      turnId: turn.turnId,
      status: turn.status,
    };
  }

  /** Ensure providers are initialized before routing. */
  private async ensureProviders(): Promise<void> {
    await initProviders();
  }

  public getStatus(): { ok: boolean; primaryProvider: string; heavyProvider: string; providers: ProviderStatus[]; mockMode: boolean } {
    const registeredIds = providerRegistry.listIds();
    const codexId = "codex-chatgpt-subscription";
    const allEntries = [
      { id: "ollama-cloud", role: "primary-fast" as ProviderRole },
      { id: env.HEAVY_AI_PROVIDER || "glm", role: "heavy-reasoning" as ProviderRole },
      { id: codexId, role: "heavy-reasoning" as ProviderRole },
      { id: "ollama-local", role: "primary-fast" as ProviderRole },
      { id: "openrouter", role: "fallback" as ProviderRole },
      { id: "opencode-go", role: "fallback" as ProviderRole },
      { id: "gemini", role: "fallback" as ProviderRole },
      { id: "openai", role: "fallback" as ProviderRole },
      { id: "groq", role: "fallback" as ProviderRole },
      { id: "cerebras", role: "fallback" as ProviderRole },
    ];

    const providers: ProviderStatus[] = allEntries.map((entry) => ({
      name: entry.id,
      configured: registeredIds.includes(entry.id),
      role: entry.role,
    }));

    const anyConfigured = providers.some((p) => p.configured);
    const mockMode = !anyConfigured;

    return {
      ok: true,
      primaryProvider: env.AI_PROVIDER,
      heavyProvider: env.HEAVY_AI_PROVIDER,
      providers,
      mockMode,
    };
  }

  public async getProviderForIntent(intent: AiIntent | string): Promise<{ providerName: string; model?: string; isMock: boolean }> {
    const registeredIds = providerRegistry.listIds();
    const selected = await selectedProviderFor(intent);
    if (selected && registeredIds.includes(selected)) {
      if (selected === "ollama-local") {
        const decision = decideOllamaLocalRoute(intent as string, await ollamaAdapter.models().catch(() => []));
        if (!decision.allowed) {
          // Continue with the quality-aware automatic route.
        } else {
          return { providerName: selected, model: decision.model, isMock: false };
        }
      } else {
        return { providerName: selected, isMock: false };
      }
    }

    // Media intents prefer OpenRouter if available, otherwise any configured provider.
    if (["media_image", "media_video", "media_music"].includes(intent as string)) {
      if (registeredIds.includes("openrouter")) {
        const model =
          intent === "media_image" ? env.OPENROUTER_IMAGE_MODEL :
          intent === "media_video" ? env.OPENROUTER_VIDEO_MODEL :
          env.OPENROUTER_MUSIC_MODEL;
        return { providerName: "openrouter", model, isMock: false };
      }
      const first = registeredIds[0];
      if (first) return { providerName: first, isMock: false };
      return { providerName: "mock", isMock: true };
    }

    if (intent === "media_transcription") {
      if (registeredIds.includes("openrouter")) {
        return { providerName: "openrouter", model: env.OPENROUTER_TRANSCRIPTION_MODEL, isMock: false };
      }
      const first = registeredIds[0];
      if (first) return { providerName: first, isMock: false };
      return { providerName: "mock", isMock: true };
    }

    // Determine target based on intent routing rules
    const isHeavy = isHeavyAiIntent(intent as string);

    const codexId = "codex-chatgpt-subscription";
    const codexAsHeavy = env.JARVIS_CODEX_AS_HEAVY === "true" || env.JARVIS_CODEX_AS_HEAVY === "1" || env.JARVIS_CODEX_AS_HEAVY === "yes";

    // Codex (ChatGPT subscription) is effectively free per request and strong
    // at reasoning, so when it is registered and the operator opted in, route
    // heavy intents to it first.
    if (isHeavy && codexAsHeavy && registeredIds.includes(codexId)) {
      return { providerName: codexId, isMock: false };
    }

    const heavyId = env.HEAVY_AI_PROVIDER;
    const primaryId = env.AI_PROVIDER;

    if (isHeavy) {
      if (heavyId && registeredIds.includes(heavyId)) return { providerName: heavyId, isMock: false };
      if (primaryId && registeredIds.includes(primaryId)) return { providerName: primaryId, isMock: false };
      const first = registeredIds[0];
      if (first) return { providerName: first, isMock: false };
    } else {
      if (primaryId && registeredIds.includes(primaryId)) return { providerName: primaryId, isMock: false };
      if (heavyId && registeredIds.includes(heavyId)) return { providerName: heavyId, isMock: false };
      if (registeredIds.includes("ollama-local")) {
        const decision = decideOllamaLocalRoute(intent as string, await ollamaAdapter.models().catch(() => []));
        if (decision.allowed) return { providerName: "ollama-local", model: decision.model, isMock: false };
      }
      const first = registeredIds[0];
      if (first && first !== "ollama-local") return { providerName: first, isMock: false };
    }

    return { providerName: "mock", isMock: true };
  }

  public async chat(intent: AiIntent | string, systemPrompt: string, userPrompt: string, preferredModel?: string): Promise<string> {
    await this.ensureProviders();

    const route = await this.getProviderForIntent(intent);

    if (route.isMock || (route.providerName !== "ollama-local" && env.AI_ENABLE_MOCK_FALLBACK === "true" && !isAiConfigured())) {
      throw new Error("MockMode"); // Will be caught by service to generate mock reply
    }

    // Build fallback chain: selected provider first, then all other registered providers.
    const chain = this.buildProviderChain(route.providerName, isHeavyAiIntent(intent as string));

    let lastError: unknown = undefined;
    for (const providerName of chain.slice(0, 3)) {
      try {
        const model = providerName === route.providerName ? preferredModel : undefined;
        const result = await this.chatWithProvider(providerName, systemPrompt, userPrompt, model);
        if (result && result.trim().length > 0) {
          return result;
        }
        console.warn(`[ai-provider-router] ${providerName} returned empty response`);
      } catch (error) {
        console.warn(`[ai-provider-router] ${providerName} failed:`, error);
        lastError = error;
      }
    }

    console.warn(`[ai-provider-router] all providers failed:`, lastError);
    const detail = lastError instanceof Error ? lastError.message : "неизвестная ошибка";
    throw new Error(`Все подключённые AI-провайдеры завершились с ошибкой: ${detail}`);
  }

  private buildProviderChain(primary: string, heavy = false): string[] {
    const registered = providerRegistry.listIds().filter((provider) => !(heavy && provider === "ollama-local"));
    const unique: string[] = [];
    if (registered.includes(primary)) unique.push(primary);
    for (const p of registered) {
      if (!unique.includes(p)) unique.push(p);
    }
    return unique;
  }

  private async chatWithProvider(providerName: string, systemPrompt: string, userPrompt: string, preferredModel?: string): Promise<string> {
    const provider = providerRegistry.getOrThrow(providerName);
    const entry = getProviderEntryById(providerName);
    const model = preferredModel
      ?? (providerName === "ollama-local"
        ? (await ollamaAdapter.models()).find((item) => /phi4-mini/i.test(item.name))?.name
        // OpenCode Go is registered outside PROVIDER_ENTRIES (per-model protocol
        // dispatch, not a single OpenAICompatibleConfig — see
        // src/lib/ai-provider/opencode-go/adapter.ts), so getProviderEntryById()
        // never has an entry for it. Resolve its default model explicitly instead
        // of silently falling through to "".
        : providerName === "opencode-go"
          ? buildOpenCodeGoConfig().defaultModel
          : entry?.config.defaultModel)
      ?? "";

    const request: CompletionRequest = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      maxTokens: 4096,
    };

    const response = await withProviderTimeout(provider.complete(request), providerName);
    return response.content ?? "";
  }
}

export const aiProviderRouter = new AiProviderRouter();
