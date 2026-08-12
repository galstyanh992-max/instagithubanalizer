// AI Jarwisyan — env validation (server-side only)

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().default("file:./db/custom.db"),
  GITHUB_TOKEN: z.string().default(""),
  
  // Provider Router configuration
  AI_PROVIDER: z.string().default("ollama-cloud"),
  DEFAULT_AI_PROVIDER: z.string().default("ollama-cloud"),
  HEAVY_AI_PROVIDER: z.string().default("ollama-cloud"),
  
  // Ollama Cloud Pro (Default fast)
  OLLAMA_CLOUD_API_KEY: z.string().default(""),
  OLLAMA_CLOUD_BASE_URL: z.string().default("https://api.ollama.com/v1"),
  OLLAMA_CLOUD_MODEL: z.string().default("llama3.1-70b"),
  
  // Ollama Cloud model options
  OLLAMA_CLOUD_GLM_MODEL: z.string().default("glm-5.2"),
  OLLAMA_CLOUD_KIMI_MODEL: z.string().default("kimi-k2.7-code"),
  OLLAMA_CLOUD_GEMMA_MODEL: z.string().default("gemma4:31b"),

  // GLM 5.2 (Heavy reasoning alternative)
  GLM_API_KEY: z.string().default(""),
  GLM_BASE_URL: z.string().default("https://open.bigmodel.cn/api/paas/v4"),
  GLM_MODEL: z.string().default("glm-5.2"),

  // OpenRouter (cost-aware cloud tier + media models)
  OPENROUTER_API_KEY: z.string().default(""),
  OPENROUTER_BASE_URL: z.string().default("https://openrouter.ai/api/v1"),
  // Benchmark-verified live on OpenRouter as of 2026-08-12 (406 models in
  // catalog, tools-capable, ~1M context, cheapest prompt+completion pricing
  // among the master-prompt candidate set). See reports/JARVIS_PROVIDER_MODEL_BENCHMARK.md.
  OPENROUTER_MODEL: z.string().default("deepseek/deepseek-v4-flash"),
  OPENROUTER_SITE_URL: z.string().default(""),
  OPENROUTER_SITE_NAME: z.string().default("JARVIS"),
  OPENROUTER_TIMEOUT_MS: z.string().default(""),
  OPENROUTER_MAX_RETRIES: z.string().default(""),

  // OpenRouter media models
  OPENROUTER_IMAGE_MODEL: z.string().default("google/gemini-3.1-flash-lite-image"),
  OPENROUTER_MUSIC_MODEL: z.string().default("google/lyria-3-pro-preview"),
  OPENROUTER_VIDEO_MODEL: z.string().default("bytedance/seedance-1-5-pro"),
  OPENROUTER_TRANSCRIPTION_MODEL: z.string().default("openai/whisper-large-v3"),
  OPENROUTER_AUDIO_FORMAT: z.string().default("wav"),
  OPENROUTER_AUDIO_VOICE: z.string().default("alloy"),

  // OpenCode Go — server/local-only credentials (HOME-PC daemon runtime).
  // Never expose under NEXT_PUBLIC_*, never send through task payloads,
  // Realtime events, artifacts, browser responses, logs, or reports.
  // Models use three different upstream protocols (see
  // src/lib/ai-provider/opencode-go/protocol-map.ts) — most are OpenAI Chat
  // Completions compatible, gpt-5.6-luna uses the Responses API, and the
  // Qwen/MiniMax family uses the Anthropic Messages API.
  OPENCODE_GO_API_KEY: z.string().default(""),
  OPENCODE_GO_BASE_URL: z.string().default("https://opencode.ai/zen/go/v1"),
  OPENCODE_GO_MODELS_URL: z.string().default("https://opencode.ai/zen/go/v1/models"),
  OPENCODE_GO_CHAT_URL: z.string().default("https://opencode.ai/zen/go/v1/chat/completions"),
  OPENCODE_GO_MESSAGES_URL: z.string().default("https://opencode.ai/zen/go/v1/messages"),
  OPENCODE_GO_RESPONSES_URL: z.string().default("https://opencode.ai/zen/go/v1/responses"),
  // Auth-verified live 2026-08-12 (glm-5.2/kimi-k2.7-code/mimo-v2.5/deepseek-v4-pro
  // all returned HTTP 200). deepseek-v4-flash on OpenCode Go specifically
  // returns 403 RegionError ("hosted in China, requires explicit opt-in") —
  // that model is routed through OpenRouter instead, not disabled globally.
  OPENCODE_GO_MODEL: z.string().default("deepseek-v4-pro"),
  OPENCODE_GO_TIMEOUT_MS: z.string().default(""),
  OPENCODE_GO_MAX_RETRIES: z.string().default(""),

  // OpenAI (Fallback + GPT-5.5 Thinking orchestrator)
  OPENAI_API_KEY: z.string().default(""),
  OPENAI_BASE_URL: z.string().default("https://api.openai.com/v1"),
  OPENAI_MODEL: z.string().default("gpt-4o"),
  // GPT-5.5 Thinking — Orchestrator / CEO brain
  OPENAI_THINKING_API_KEY: z.string().default(""),
  OPENAI_THINKING_BASE_URL: z.string().default("https://api.openai.com/v1"),
  OPENAI_THINKING_MODEL: z.string().default("gpt-5.5-thinking"),

  // Kimi K2.7 Code — Second developer / MCP / Tool Use
  KIMI_API_KEY: z.string().default(""),
  KIMI_BASE_URL: z.string().default("https://api.moonshot.cn/v1"),
  KIMI_MODEL: z.string().default("kimi-k2.7-code"),

  // Legal Armenia — isolated legal/RAG/PDF model
  LEGAL_AI_API_KEY: z.string().default(""),
  LEGAL_AI_BASE_URL: z.string().default("https://api.legal-armenia.ai/v1"),
  LEGAL_AI_MODEL: z.string().default("legal-armenia-pro"),

  // Model hierarchy role overrides (env-configurable)
  JARVIS_ROLE_ORCHESTRATOR_PROVIDER: z.string().default("openai-thinking"),
  JARVIS_ROLE_ORCHESTRATOR_MODEL: z.string().default(""),
  JARVIS_ROLE_SENIOR_DEV_PROVIDER: z.string().default("glm"),
  JARVIS_ROLE_SENIOR_DEV_MODEL: z.string().default(""),
  JARVIS_ROLE_SECOND_DEV_PROVIDER: z.string().default("kimi"),
  JARVIS_ROLE_SECOND_DEV_MODEL: z.string().default(""),
  JARVIS_ROLE_DESIGNER_PROVIDER: z.string().default("glm"),
  JARVIS_ROLE_DESIGNER_MODEL: z.string().default(""),
  JARVIS_ROLE_DESIGN_CRITIC_PROVIDER: z.string().default("openai-thinking"),
  JARVIS_ROLE_DESIGN_CRITIC_MODEL: z.string().default(""),
  JARVIS_ROLE_RESEARCH_PROVIDER: z.string().default("openai-thinking"),
  JARVIS_ROLE_RESEARCH_MODEL: z.string().default(""),
  JARVIS_ROLE_BROWSER_PROVIDER: z.string().default("kimi"),
  JARVIS_ROLE_BROWSER_MODEL: z.string().default(""),
  JARVIS_ROLE_MEMORY_PROVIDER: z.string().default("ollama-cloud"),
  JARVIS_ROLE_MEMORY_MODEL: z.string().default(""),
  JARVIS_ROLE_LEGAL_PROVIDER: z.string().default("legal-ai"),
  JARVIS_ROLE_LEGAL_MODEL: z.string().default(""),

  // Gemini (Fallback)
  GEMINI_API_KEY: z.string().default(""),
  GEMINI_MODEL: z.string().default("gemini-1.5-pro"),

  // Groq (Fallback)
  GROQ_API_KEY: z.string().default(""),
  GROQ_MODEL: z.string().default("llama-3.1-70b-versatile"),

  // Cerebras (Fallback)
  CEREBRAS_API_KEY: z.string().default(""),
  CEREBRAS_MODEL: z.string().default("llama3.1-70b"),

  // Mock configuration
  AI_ENABLE_MOCK_FALLBACK: z.string().default("false"),

  // Codex (ChatGPT subscription) chat bridge — exposes Codex models as a
  // regular provider in providerRegistry so the chat can route to them.
  // Master switch + read-only working directory (must be on D: per path-policy).
  JARVIS_CODEX_CHAT_ENABLED: z.string().default("true"),
  JARVIS_CODEX_CHAT_CWD: z.string().default("D:\\АГЕНТ\\ДЖАРВИС"),
  // Prefer Codex as the heavy-reasoning provider when it is registered.
  JARVIS_CODEX_AS_HEAVY: z.string().default("true"),

  // Which local-only resources this process instance is allowed to touch:
  // "web-control-plane" (Vercel, no local access), "local-worker" (the
  // daemon), "local-full-dev" (local `npm run dev`, today's default).
  // See scripts/check-runtime-boundary.mjs and docs/jarvis/remote-architecture.md.
  JARVIS_RUNTIME_ROLE: z.enum(["web-control-plane", "local-worker", "local-full-dev"]).default("local-full-dev"),


  OCR_PROVIDER: z.string().default("local"),
  OCR_API_KEY: z.string().default(""),
  TTS_PROVIDER: z.string().default("browser"),
  TTS_API_KEY: z.string().default(""),
  STT_PROVIDER: z.string().default("browser"),
  STT_API_KEY: z.string().default(""),
  NEXT_PUBLIC_ENABLE_3D: z.string().default("true"),
  NEXT_PUBLIC_ENABLE_VOICE: z.string().default("true"),

  // Supabase Storage (service role required for server-side bucket ops)
  NEXT_PUBLIC_SUPABASE_URL: z.string().default(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(""),
  SUPABASE_STORAGE_BUCKET: z.string().default("jarwisyan-files"),

  // PC profile defaults
  PC_PROFILE_NAME: z.string().default("Main Windows Workstation"),
  PC_OS: z.string().default("Windows 11 Pro 23H2"),
  PC_SYSTEM_TYPE: z.string().default("64-bit OS, x64-based processor"),
  PC_CPU: z.string().default("Intel Xeon E5-2699 v3 @ 2.30GHz"),
  PC_RAM_GB: z.string().default("64"),
  PC_GPU: z.string().default("AMD Radeon RX 580 2048SP"),
  PC_VRAM_GB: z.string().default("8"),
  PC_STORAGE_TOTAL_GB: z.string().default("704"),
  PC_STORAGE_FREE_GB: z.string().default("335"),
  PC_CUDA_AVAILABLE: z.string().default("false"),
  PC_ROCM_AVAILABLE: z.string().default(""),
  PC_DOCKER_AVAILABLE: z.string().default(""),
  PC_PYTHON_VERSION: z.string().default(""),
  PC_NODE_VERSION: z.string().default(""),
  PC_GIT_AVAILABLE: z.string().default(""),
  PC_PREFERRED_RUN_MODE: z.string().default("local_or_docker_when_possible"),
  PC_FALLBACK_RUN_MODE: z.string().default("ollama_cloud_if_local_not_possible"),

  // Cloud provider policy
  CLOUD_PROVIDER: z.string().default("ollama_cloud"),
  ALLOWED_CLOUD_PROVIDERS: z.string().default("ollama_cloud"),
  DISABLE_OTHER_CLOUD_PROVIDERS: z.string().default("true"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.warn("[env] Invalid env, using defaults:", parsed.error.flatten().fieldErrors);
    return envSchema.parse({});
  }
  return parsed.data;
}

export const env = loadEnv();

export const isGitHubConfigured = () => Boolean(env.GITHUB_TOKEN);
export const isAiConfigured = () =>
  env.AI_PROVIDER !== "mock" && (
    Boolean(env.OLLAMA_CLOUD_API_KEY) ||
    Boolean(env.GLM_API_KEY) ||
    Boolean(env.OPENROUTER_API_KEY) ||
    Boolean(env.OPENCODE_GO_API_KEY) ||
    Boolean(env.GEMINI_API_KEY) ||
    Boolean(env.OPENAI_API_KEY) ||
    Boolean(env.OPENAI_THINKING_API_KEY) ||
    Boolean(env.KIMI_API_KEY) ||
    Boolean(env.LEGAL_AI_API_KEY) ||
    Boolean(env.GROQ_API_KEY) ||
    Boolean(env.CEREBRAS_API_KEY)
  );
export const isOcrConfigured = () => env.OCR_PROVIDER === "local" || Boolean(env.OCR_API_KEY);
export const isVoiceConfigured = () =>
  env.TTS_PROVIDER === "browser" && env.STT_PROVIDER === "browser";
