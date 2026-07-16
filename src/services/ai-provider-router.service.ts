import { env, isAiConfigured } from "@/lib/env";
import { providerRegistry, initProviders, getDefaultProvider, resolveProviderId } from "@/lib/ai-provider/server";
import type { AIProvider, CompletionRequest } from "@/lib/ai-provider/types";
import { getProviderEntryById } from "@/lib/ai-provider/providers";

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

export interface ProviderStatus {
  name: string;
  configured: boolean;
  role: ProviderRole;
}

export class AiProviderRouter {
  /** Ensure providers are initialized before routing. */
  private async ensureProviders(): Promise<void> {
    await initProviders();
  }

  public getStatus(): { ok: boolean; primaryProvider: string; heavyProvider: string; providers: ProviderStatus[]; mockMode: boolean } {
    const registeredIds = providerRegistry.listIds();
    const allEntries = [
      { id: "ollama-cloud", role: "primary-fast" as ProviderRole },
      { id: env.HEAVY_AI_PROVIDER || "glm", role: "heavy-reasoning" as ProviderRole },
      { id: "openrouter", role: "fallback" as ProviderRole },
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

  public getProviderForIntent(intent: AiIntent | string): { providerName: string; model?: string; isMock: boolean } {
    const registeredIds = providerRegistry.listIds();

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
    const isHeavy = ["analysis", "repo_analysis", "integration_plan", "patch_plan", "security_audit"].includes(intent as string);

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
      const first = registeredIds[0];
      if (first) return { providerName: first, isMock: false };
    }

    return { providerName: "mock", isMock: true };
  }

  public async chat(intent: AiIntent | string, systemPrompt: string, userPrompt: string, preferredModel?: string): Promise<string> {
    await this.ensureProviders();

    const route = this.getProviderForIntent(intent);

    if (route.isMock || (env.AI_ENABLE_MOCK_FALLBACK === "true" && !isAiConfigured())) {
      throw new Error("MockMode"); // Will be caught by service to generate mock reply
    }

    // Build fallback chain: selected provider first, then all other registered providers.
    const chain = this.buildProviderChain(route.providerName);

    let lastError: unknown = undefined;
    for (const providerName of chain) {
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

    console.warn(`[ai-provider-router] all providers failed, fallback to mock:`, lastError);
    throw new Error("MockMode");
  }

  private buildProviderChain(primary: string): string[] {
    const registered = providerRegistry.listIds();
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
    const model = preferredModel ?? entry?.config.defaultModel ?? "";

    const request: CompletionRequest = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      maxTokens: 4096,
    };

    const response = await provider.complete(request);
    return response.content ?? "";
  }
}

export const aiProviderRouter = new AiProviderRouter();
