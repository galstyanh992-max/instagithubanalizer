import { env, isAiConfigured } from "@/lib/env";

export type AiIntent = 
  | "chat/general" 
  | "repo_analysis" 
  | "integration_plan" 
  | "patch_plan" 
  | "security_audit" 
  | "fast_ui_command"
  | "fallback"
  | "connect_project"
  | "local_compatibility"
  | "find_alternatives"
  | "voice_command";

export type ProviderRole = "primary-fast" | "heavy-reasoning" | "fallback" | "mock";

export interface ProviderStatus {
  name: string;
  configured: boolean;
  role: ProviderRole;
}

export class AiProviderRouter {
  public getStatus(): { ok: boolean; primaryProvider: string; heavyProvider: string; providers: ProviderStatus[]; mockMode: boolean } {
    const providers: ProviderStatus[] = [];

    // primary fast
    const hasOpenRouter = Boolean(env.OPENROUTER_API_KEY);
    providers.push({ name: "openrouter", configured: hasOpenRouter, role: "primary-fast" });

    // heavy reasoning
    const hasOllama = Boolean(env.OLLAMA_CLOUD_API_KEY);
    providers.push({ name: "ollama-cloud", configured: hasOllama, role: "heavy-reasoning" });

    // fallbacks
    providers.push({ name: "glm", configured: Boolean(env.GLM_API_KEY), role: "fallback" });
    providers.push({ name: "gemini", configured: Boolean(env.GEMINI_API_KEY), role: "fallback" });
    providers.push({ name: "openai", configured: Boolean(env.OPENAI_API_KEY), role: "fallback" });
    providers.push({ name: "groq", configured: Boolean(env.GROQ_API_KEY), role: "fallback" });
    providers.push({ name: "cerebras", configured: Boolean(env.CEREBRAS_API_KEY), role: "fallback" });

    const mockMode = !hasOllama && !hasGlm && !providers.some(p => p.role === "fallback" && p.configured);

    return {
      ok: true,
      primaryProvider: env.AI_PROVIDER,
      heavyProvider: env.HEAVY_AI_PROVIDER,
      providers,
      mockMode
    };
  }

  public getProviderForIntent(intent: AiIntent | string): { providerName: string; isMock: boolean } {
    const status = this.getStatus();
    
    // Determine target based on intent routing rules
    let targetRole: ProviderRole = "primary-fast";
    if (["repo_analysis", "integration_plan", "patch_plan", "security_audit"].includes(intent as string)) {
      targetRole = "heavy-reasoning";
    }

    // Attempt to route
    const hasHeavy = status.providers.find(p => p.name === env.HEAVY_AI_PROVIDER && p.configured);
    const hasPrimary = status.providers.find(p => p.name === env.AI_PROVIDER && p.configured);
    const firstFallback = status.providers.find(p => p.role === "fallback" && p.configured);

    if (targetRole === "heavy-reasoning") {
      if (hasHeavy) return { providerName: hasHeavy.name, isMock: false };
      if (hasPrimary) return { providerName: hasPrimary.name, isMock: false };
      if (firstFallback) return { providerName: firstFallback.name, isMock: false };
    } else {
      if (hasPrimary) return { providerName: hasPrimary.name, isMock: false };
      if (hasHeavy) return { providerName: hasHeavy.name, isMock: false };
      if (firstFallback) return { providerName: firstFallback.name, isMock: false };
    }

    return { providerName: "mock", isMock: true };
  }

  public async chat(intent: AiIntent | string, systemPrompt: string, userPrompt: string): Promise<string> {
    const route = this.getProviderForIntent(intent);
    
    if (route.isMock || env.AI_ENABLE_MOCK_FALLBACK === "true" && !isAiConfigured()) {
      throw new Error("MockMode"); // Will be caught by service to generate mock reply
    }

    try {
      if (route.providerName === "glm") {
        const ZAISDK = (await import("z-ai-web-dev-sdk")).default;
        const zai = await ZAISDK.create();
        const completion = await zai.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 4096,
        });
        return completion.choices[0]?.message?.content ?? "";
      }

      if (route.providerName === "ollama-cloud") {
        return this.fetchOpenAICompatible(env.OLLAMA_CLOUD_BASE_URL, env.OLLAMA_CLOUD_API_KEY, env.OLLAMA_CLOUD_MODEL, systemPrompt, userPrompt);
      }

      if (route.providerName === "openrouter") {
        return this.fetchOpenAICompatible(env.OPENROUTER_BASE_URL, env.OPENROUTER_API_KEY, env.OPENROUTER_MODEL, systemPrompt, userPrompt);
      }

      if (route.providerName === "groq") {
        return this.fetchOpenAICompatible("https://api.groq.com/openai/v1", env.GROQ_API_KEY, env.GROQ_MODEL, systemPrompt, userPrompt);
      }
      
      if (route.providerName === "cerebras") {
        return this.fetchOpenAICompatible("https://api.cerebras.ai/v1", env.CEREBRAS_API_KEY, env.CEREBRAS_MODEL, systemPrompt, userPrompt);
      }
      
      if (route.providerName === "openai") {
        return this.fetchOpenAICompatible("https://api.openai.com/v1", env.OPENAI_API_KEY, env.OPENAI_MODEL, systemPrompt, userPrompt);
      }

      // If somehow reached here without matching provider implementation
      throw new Error(`Provider ${route.providerName} not implemented in chat router`);
    } catch (error) {
      console.warn(`[ai-provider-router] ${route.providerName} failed, fallback to mock:`, error);
      throw new Error("MockMode");
    }
  }

  private async fetchOpenAICompatible(baseUrl: string, apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
    const url = baseUrl.endsWith("/chat/completions") ? baseUrl : `${baseUrl.replace(/\/$/, '')}/chat/completions`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://jarwisyan.local",
        "X-Title": "AI Jarwisyan"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content ?? "";
  }
}

export const aiProviderRouter = new AiProviderRouter();
