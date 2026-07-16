import { aiProviderRouter, type AiIntent } from "@/services/ai-provider-router.service";
import { generateMedia, transcribeAudio, type MediaResult } from "@/services/media-router.service";
import { fileToBuffer } from "@/services/storage.service";

export type TaskType =
  | "auto"
  | "chat"
  | "image"
  | "video"
  | "music"
  | "transcription"
  | "analysis"
  | "repo_analysis"
  | "unknown";

export interface JarvisTask {
  type: TaskType;
  intent: AiIntent;
  prompt: string;
  model?: string;
  provider?: string;
  file?: File;
}

/**
 * Jarvis orchestrator: parse a natural language request and route it to the right AI model/intent.
 */
export function parseTask(input: string, preferredType?: TaskType): JarvisTask {
  const lower = input.toLowerCase();

  // Explicit UI mode takes precedence.
  if (preferredType === "analysis") {
    return { type: "analysis", intent: "analysis", prompt: input };
  }
  if (preferredType && preferredType !== "auto") {
    const mediaIntentMap: Record<string, AiIntent> = {
      image: "media_image",
      video: "media_video",
      music: "media_music",
      transcription: "media_transcription",
    };
    return {
      type: preferredType,
      intent: mediaIntentMap[preferredType] ?? "chat/general",
      prompt: input,
    };
  }

  // Image generation
  if (
    /(сгенерируй|создай|сделай|нарисуй|generate|create|draw|make).*?(изображение|картинку|image|picture|pic)/.test(lower)
  ) {
    return {
      type: "image",
      intent: "media_image",
      prompt: input,
    };
  }

  // Video generation
  if (
    /(сгенерируй|создай|сделай|generate|create|make).*?(видео|видос|video|clip|movie)/.test(lower)
  ) {
    return {
      type: "video",
      intent: "media_video",
      prompt: input,
    };
  }

  // Music / audio generation
  if (
    /(сгенерируй|создай|сделай|generate|create|make|compose).*?(музыку|мелодию|трек|music|song|melody|track)/.test(lower)
  ) {
    return {
      type: "music",
      intent: "media_music",
      prompt: input,
    };
  }

  // Transcription
  if (
    /(расшифруй|транскрибируй|transcribe|transcription|whisper|audio to text)/.test(lower)
  ) {
    return {
      type: "transcription",
      intent: "media_transcription",
      prompt: input,
    };
  }

  // Analysis tasks -> GLM 5.2 on Ollama Cloud
  if (
    /(проанализируй|анализ|analyze|analysis|оцени|изучи|исследуй|рассмотри|compare|сравни)/.test(lower)
  ) {
    return {
      type: "analysis",
      intent: "analysis",
      prompt: input,
    };
  }

  // Repository analysis
  if (
    /(аудит|audit).*?(репозитор|repo|github)/.test(lower)
  ) {
    return {
      type: "repo_analysis",
      intent: "repo_analysis",
      prompt: input,
    };
  }

  // Default: chat
  return {
    type: "chat",
    intent: "chat/general",
    prompt: input,
  };
}

/**
 * Select the best chat model based on keywords in the prompt.
 */
export function selectChatModel(prompt: string): { provider: string; model: string } {
  const lower = prompt.toLowerCase();

  // Analysis / long context / complex reasoning -> GLM 5.2 (Ollama Cloud)
  if (/анализ|analyze|analysis|детально|подробно|рассужд|reasoning|think|complex|deep|аудит|audit/.test(lower)) {
    return { provider: "ollama-cloud", model: process.env.OLLAMA_CLOUD_GLM_MODEL ?? "glm-5.2" };
  }

  // Code -> Kimi K2.7
  if (/код|code|programming|debug|refactor|алгоритм|python|typescript|javascript/.test(lower)) {
    return { provider: "ollama-cloud", model: process.env.OLLAMA_CLOUD_KIMI_MODEL ?? "kimi-k2.7-code" };
  }

  // General knowledge / fast / default orchestrator -> Gemma 4
  return { provider: "ollama-cloud", model: process.env.OLLAMA_CLOUD_GEMMA_MODEL ?? "gemma4:31b" };
}

/**
 * Execute a Jarvis task. Returns a plain object for the caller to display.
 */
export async function executeTask(task: JarvisTask): Promise<{ ok: boolean; result: unknown; url?: string; mimeType?: string; key?: string; bucket?: string; task?: JarvisTask & { model?: string; provider?: string }; error?: string }> {
  if (task.type === "chat") {
    const { model } = selectChatModel(task.prompt);
    try {
      const reply = await aiProviderRouter.chat(task.intent, "You are Jarwisyan, a helpful AI operator.", task.prompt, model);
      return { ok: true, result: reply, task: { ...task, model, provider: "ollama-cloud" } };
    } catch (e) {
      return { ok: false, result: "", error: e instanceof Error ? e.message : String(e) };
    }
  }

  if (task.type === "repo_analysis") {
    const model = process.env.OLLAMA_CLOUD_GLM_MODEL ?? "glm-5.2";
    try {
      const reply = await aiProviderRouter.chat("repo_analysis", "You are Jarwisyan repository analyst.", task.prompt, model);
      return { ok: true, result: reply, task: { ...task, model, provider: "ollama-cloud" } };
    } catch (e) {
      return { ok: false, result: "", error: e instanceof Error ? e.message : String(e) };
    }
  }

  if (task.type === "analysis") {
    const model = process.env.OLLAMA_CLOUD_GLM_MODEL ?? "glm-5.2";
    try {
      const reply = await aiProviderRouter.chat("analysis", "You are Jarwisyan senior analyst. Provide structured, detailed analysis.", task.prompt, model);
      return { ok: true, result: reply, task: { ...task, model, provider: "ollama-cloud" } };
    } catch (e) {
      return { ok: false, result: "", error: e instanceof Error ? e.message : String(e) };
    }
  }

  // Media tasks: generate directly through the media router
  if (["image", "video", "music"].includes(task.type)) {
    try {
      const result: MediaResult = await generateMedia({ prompt: task.prompt, type: task.type as "image" | "video" | "music" });
      return { ok: true, result: result.url, url: result.url, mimeType: result.mimeType, key: result.key, bucket: result.bucket, task: { ...task, provider: "openrouter" } };
    } catch (e) {
      return { ok: false, result: "", error: e instanceof Error ? e.message : String(e) };
    }
  }

  if (task.type === "transcription") {
    if (!task.file) {
      return { ok: false, result: "", error: "Upload an audio file for transcription" };
    }
    try {
      const buffer = await fileToBuffer(task.file);
      const result: MediaResult = await transcribeAudio(buffer, task.file.type || "audio/mpeg", task.file.name);
      return { ok: true, result: result.url, url: result.url, mimeType: result.mimeType, key: result.key, bucket: result.bucket, task: { ...task, provider: "openrouter" } };
    } catch (e) {
      return { ok: false, result: "", error: e instanceof Error ? e.message : String(e) };
    }
  }

  return { ok: false, result: "", error: "Unknown task type" };
}
