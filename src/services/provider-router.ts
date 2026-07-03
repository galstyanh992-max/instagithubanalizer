import { env } from "@/lib/env";

export type AIProvider = 
  | "ollama_cloud_pro" 
  | "gemini" 
  | "openrouter" 
  | "openai" 
  | "opengo" 
  | "cerberos" 
  | "mock";

export interface ProviderConfig {
  id: AIProvider;
  name: string;
  isAvailable: boolean;
  status: "active" | "fallback" | "unknown" | "missing_secrets";
  baseUrl?: string;
}

export class ProviderRouter {
  
  static getAvailableProviders(): ProviderConfig[] {
    return [
      {
        id: "ollama_cloud_pro",
        name: "Ollama Cloud Pro",
        isAvailable: Boolean(env.OLLAMA_CLOUD_PRO_API_KEY),
        status: env.OLLAMA_CLOUD_PRO_API_KEY ? "active" : "missing_secrets",
        baseUrl: env.OLLAMA_CLOUD_PRO_BASE_URL,
      },
      {
        id: "gemini",
        name: "Google Gemini",
        isAvailable: Boolean(env.GEMINI_API_KEY),
        status: env.GEMINI_API_KEY ? "fallback" : "missing_secrets",
      },
      {
        id: "openrouter",
        name: "OpenRouter",
        isAvailable: Boolean(env.OPENROUTER_API_KEY),
        status: env.OPENROUTER_API_KEY ? "fallback" : "missing_secrets",
        baseUrl: env.OPENROUTER_BASE_URL,
      },
      {
        id: "openai",
        name: "OpenAI",
        isAvailable: Boolean(env.OPENAI_API_KEY),
        status: env.OPENAI_API_KEY ? "fallback" : "missing_secrets",
      },
      {
        id: "opengo",
        name: "OpenGO",
        isAvailable: false,
        status: "unknown",
      },
      {
        id: "cerberos",
        name: "Cerberos",
        isAvailable: false,
        status: "unknown",
      }
    ];
  }

  static getDefaultProvider(): ProviderConfig {
    const providers = this.getAvailableProviders();
    const defaultId = env.DEFAULT_AI_PROVIDER as AIProvider;
    
    const preferred = providers.find(p => p.id === defaultId && p.isAvailable);
    if (preferred) return preferred;

    const fallback = providers.find(p => p.isAvailable && p.status !== "unknown");
    if (fallback) return fallback;

    return {
      id: "mock",
      name: "Mock Provider",
      isAvailable: true,
      status: "fallback"
    };
  }

  static async routeRequest(prompt: string, providerId?: AIProvider) {
    const provider = providerId 
      ? this.getAvailableProviders().find(p => p.id === providerId)
      : this.getDefaultProvider();
      
    if (!provider || !provider.isAvailable) {
      console.warn(`Provider ${providerId || 'default'} is not available, falling back to mock.`);
      return this.mockResponse(prompt);
    }

    if (provider.status === "unknown") {
      throw new Error(`Provider ${provider.name} requires confirmation before use.`);
    }

    // TODO: Implement actual API calls when secrets are provided
    console.log(`[ProviderRouter] Routing request to ${provider.name}...`);
    return this.mockResponse(prompt, provider.name);
  }

  private static mockResponse(prompt: string, providerName = "Mock") {
    return {
      text: `[${providerName}] This is a safe placeholder response. Actual API calls are disabled until secrets are provided.`,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      model: "mock-model-v1"
    };
  }
}
