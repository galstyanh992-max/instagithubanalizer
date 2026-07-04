// AI Jarwisyan — env validation (server-side only)

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().default("file:./db/custom.db"),
  GITHUB_TOKEN: z.string().default(""),
  
  // Provider Router configuration
  AI_PROVIDER: z.string().default("openrouter"),
  DEFAULT_AI_PROVIDER: z.string().default("openrouter"),
  HEAVY_AI_PROVIDER: z.string().default("ollama-cloud"),
  
  // Ollama Cloud Pro (Default fast)
  OLLAMA_CLOUD_API_KEY: z.string().default(""),
  OLLAMA_CLOUD_BASE_URL: z.string().default("https://api.ollama.com/v1"),
  OLLAMA_CLOUD_MODEL: z.string().default("llama3.1-70b"),
  
  // GLM 5.2 (Heavy reasoning)
  GLM_API_KEY: z.string().default(""),
  GLM_BASE_URL: z.string().default("https://open.bigmodel.cn/api/paas/v4"),
  GLM_MODEL: z.string().default("glm-5.2"),

  // OpenRouter (Fallback)
  OPENROUTER_API_KEY: z.string().default(""),
  OPENROUTER_BASE_URL: z.string().default("https://openrouter.ai/api/v1"),
  OPENROUTER_MODEL: z.string().default("anthropic/claude-3-5-sonnet-20240620"),
  
  // Gemini (Fallback)
  GEMINI_API_KEY: z.string().default(""),
  GEMINI_MODEL: z.string().default("gemini-1.5-pro"),
  
  // OpenAI (Fallback)
  OPENAI_API_KEY: z.string().default(""),
  OPENAI_MODEL: z.string().default("gpt-4o"),

  // Groq (Fallback)
  GROQ_API_KEY: z.string().default(""),
  GROQ_MODEL: z.string().default("llama-3.1-70b-versatile"),

  // Cerebras (Fallback)
  CEREBRAS_API_KEY: z.string().default(""),
  CEREBRAS_MODEL: z.string().default("llama3.1-70b"),

  // Mock configuration
  AI_ENABLE_MOCK_FALLBACK: z.string().default("true"),


  OCR_PROVIDER: z.string().default("local"),
  OCR_API_KEY: z.string().default(""),
  TTS_PROVIDER: z.string().default("browser"),
  TTS_API_KEY: z.string().default(""),
  STT_PROVIDER: z.string().default("browser"),
  STT_API_KEY: z.string().default(""),
  NEXT_PUBLIC_ENABLE_3D: z.string().default("true"),
  NEXT_PUBLIC_ENABLE_VOICE: z.string().default("true"),

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
    Boolean(env.GEMINI_API_KEY) ||
    Boolean(env.OPENAI_API_KEY) ||
    Boolean(env.GROQ_API_KEY) ||
    Boolean(env.CEREBRAS_API_KEY)
  );
export const isOcrConfigured = () => env.OCR_PROVIDER === "local" || Boolean(env.OCR_API_KEY);
export const isVoiceConfigured = () =>
  env.TTS_PROVIDER === "browser" && env.STT_PROVIDER === "browser";
