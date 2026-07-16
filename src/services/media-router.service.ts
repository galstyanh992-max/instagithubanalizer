import { env } from "@/lib/env";
import { providerRegistry } from "@/lib/ai-provider/provider-registry";
import { resolveDefaultProviderId } from "@/lib/ai-provider/default-provider";
import { getProviderEntryById } from "@/lib/ai-provider/providers";
import { initProviders } from "@/lib/ai-provider/server";
import type { OpenAICompatibleConfig } from "@/lib/ai-provider/openai-compatible/config";
import { uploadAsset } from "@/services/storage.service";

/**
 * Resolve the provider configuration to use for media generation.
 * Prefers OpenRouter when configured (it exposes image/video/music/transcription endpoints),
 * otherwise falls back to the configured default provider.
 */
function getMediaProviderConfig(): OpenAICompatibleConfig {
  const mediaProviderId = providerRegistry.has("openrouter") ? "openrouter" : resolveDefaultProviderId();
  const entry = getProviderEntryById(mediaProviderId);
  if (!entry) {
    throw new Error(`Media provider '${mediaProviderId}' is not configured. Set at least one AI provider API key.`);
  }
  return entry.config;
}

export type MediaType = "image" | "video" | "music" | "transcription";

export interface MediaRequest {
  prompt: string;
  type: MediaType;
  file?: File; // for transcription
  size?: string; // e.g. "1024x1024"
  duration?: number; // seconds for video/music
}

export interface MediaResult {
  type: MediaType;
  url: string;
  key: string;
  bucket: string;
  prompt: string;
  size?: number;
  mimeType: string;
}

/**
 * Select the best OpenRouter media model for the request type.
 */
export function selectMediaModel(type: MediaType): string {
  switch (type) {
    case "image":
      return env.OPENROUTER_IMAGE_MODEL;
    case "video":
      return env.OPENROUTER_VIDEO_MODEL;
    case "music":
      return env.OPENROUTER_MUSIC_MODEL;
    case "transcription":
      return env.OPENROUTER_TRANSCRIPTION_MODEL;
    default:
      throw new Error(`Unsupported media type: ${type}`);
  }
}

// ─── Headers helper ────────────────────────────────────────────
function headers(config: OpenAICompatibleConfig, extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": config.siteUrl ?? "https://jarwisyan.local",
    "X-Title": config.siteName ?? "AI Jarwisyan",
    ...extra,
  };
  return h;
}

// ─── Fetch with retry + timeout (handles ETIMEDOUT/ENETUNREACH) ───
async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  maxAttempts = 3,
  timeoutMs = 30_000
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { ...init, signal: controller.signal });
        clearTimeout(timeout);
        return res;
      } catch (e) {
        clearTimeout(timeout);
        throw e;
      }
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn(`[fetch] attempt ${attempt}/${maxAttempts} failed for ${url}: ${lastError.message}`);
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw lastError ?? new Error("fetch failed");
}

// ─── Image Generation: POST /api/v1/images ─────────────────────
async function generateImage(request: MediaRequest): Promise<MediaResult> {
  const config = getMediaProviderConfig();
  const res = await fetch(`${config.baseUrl}/images`, {
    method: "POST",
    headers: headers(config),
    body: JSON.stringify({
      model: selectMediaModel("image"),
      prompt: request.prompt,
      n: 1,
      ...(request.size ? { size: request.size } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown");
    throw new Error(`OpenRouter image error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const image = data.data?.[0];
  if (!image?.b64_json) {
    throw new Error("OpenRouter image response did not contain b64_json");
  }

  const mimeType: string = image.media_type ?? "image/png";
  const buffer = Buffer.from(image.b64_json, "base64");
  const ext = extensionForMime(mimeType, "image");

  const stored = await uploadAsset("files", buffer, `${Date.now()}.${ext}`, mimeType);
  return { type: "image", url: stored.publicUrl, key: stored.key, bucket: stored.bucket, prompt: request.prompt, size: buffer.length, mimeType };
}

// ─── Video Generation: POST /api/v1/videos (async + poll) ─────
async function generateVideo(request: MediaRequest): Promise<MediaResult> {
  const body: Record<string, unknown> = {
    model: selectMediaModel("video"),
    prompt: request.prompt,
  };
  if (request.duration) body.duration = request.duration;
  if (request.size) body.size = request.size;

  const config = getMediaProviderConfig();

  // Step 1: Submit job (with 30s timeout)
  const submitRes = await fetchWithRetry(`${config.baseUrl}/videos`, {
    method: "POST",
    headers: headers(config),
    body: JSON.stringify(body),
  }, 3, 30_000);

  if (!submitRes.ok) {
    const text = await submitRes.text().catch(() => "unknown");
    throw new Error(`${config.name} video submit error ${submitRes.status}: ${text}`);
  }

  const job = await submitRes.json();
  const jobId: string = job.id;
  const pollingUrl: string = job.polling_url ?? `${config.baseUrl}/videos/${jobId}`;
  console.log(`[video] job submitted: ${jobId}, polling: ${pollingUrl}`);

  // Step 2: Poll until completion (max ~5 minutes, interval 20s, retry on ETIMEDOUT)
  const deadline = Date.now() + 300_000;
  let status = "pending";
  let result: Record<string, unknown> = {};
  let pollAttempts = 0;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 20_000));
    pollAttempts++;
    console.log(`[video] poll attempt ${pollAttempts}, status: ${status}`);

    try {
      const pollRes = await fetchWithRetry(pollingUrl, { headers: headers(config) }, 3, 60_000);
      if (!pollRes.ok) {
        const text = await pollRes.text().catch(() => "unknown");
        throw new Error(`${config.name} video poll error ${pollRes.status}: ${text}`);
      }
      result = await pollRes.json();
      status = result.status as string;
      console.log(`[video] poll result:`, JSON.stringify(result).slice(0, 300));
      if (status === "completed" || status === "failed") break;
    } catch (e) {
      // On network errors, keep polling — job is still running on OpenRouter side
      console.warn(`[video] poll attempt ${pollAttempts} failed:`, e instanceof Error ? e.message : String(e));
      if (pollAttempts >= 5 && status === "pending") {
        // Too many consecutive failures, but we haven't got a single successful poll yet
        throw new Error(`Video poll failed after ${pollAttempts} attempts: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  if (status === "failed") {
    throw new Error(`Video generation failed: ${(result.error as string) ?? "unknown"}`);
  }
  if (status !== "completed") {
    throw new Error(`Video generation timed out after 5 min (status: ${status}). Poll at: ${pollingUrl}`);
  }

  const unsignedUrls = result.unsigned_urls as string[] | undefined;
  if (!unsignedUrls?.length) {
    throw new Error("Video generation completed but no unsigned_urls returned");
  }

  // Step 3: Download the video (requires Authorization header — unsigned_urls are authenticated)
  const videoUrl = unsignedUrls[0];
  const dlRes = await fetchWithRetry(
    videoUrl,
    {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    },
    3,
    120_000
  );
  if (!dlRes.ok) throw new Error(`Failed to download video: ${dlRes.status}`);
  const buffer = Buffer.from(await dlRes.arrayBuffer());
  const mimeType = dlRes.headers.get("content-type") ?? "video/mp4";
  const ext = extensionForMime(mimeType, "video");

  const stored = await uploadAsset("files", buffer, `${Date.now()}.${ext}`, mimeType);
  return { type: "video", url: stored.publicUrl, key: stored.key, bucket: stored.bucket, prompt: request.prompt, size: buffer.length, mimeType };
}

// ─── Music / Audio Generation: chat/completions ─────────────────
// Handles both:
//   A) OpenAI Audio Output API  (modalities + audio params + SSE delta.audio)
//   B) Gemini/Lyria inlineData  (returns data:audio/...;base64,... in content text)
async function generateMusic(request: MediaRequest): Promise<MediaResult> {
  const config = getMediaProviderConfig();
  const model = selectMediaModel("music");
  const supportsOpenAiAudio = model.includes("gpt-4o-audio") || model.includes("openai/");

  // Build request body
  const body: Record<string, unknown> = {
    model,
    messages: [{ role: "user", content: request.prompt }],
    stream: true,
  };

  // Only OpenAI Audio Preview models use the modalities/audio params
  if (supportsOpenAiAudio) {
    body.modalities = ["text", "audio"];
    body.audio = { voice: env.OPENROUTER_AUDIO_VOICE, format: env.OPENROUTER_AUDIO_FORMAT };
  }

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: headers(config),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown");
    throw new Error(`OpenRouter music error ${res.status}: ${text}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("Music response body has no reader (stream not supported)");

  const decoder = new TextDecoder();
  const audioChunks: string[] = [];
  const contentChunks: string[] = [];
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop()!;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      const payload = trimmed.slice(6).trim();
      if (payload === "[DONE]") break;

      try {
        const chunk = JSON.parse(payload);

        // Strategy A: OpenAI Audio Output (delta.audio.data)
        const audio = chunk.choices?.[0]?.delta?.audio;
        if (audio?.data) {
          audioChunks.push(audio.data);
          continue;
        }

        // Strategy B: normal text streaming — accumulate to check for data URL later
        const deltaContent = chunk.choices?.[0]?.delta?.content;
        if (typeof deltaContent === "string") {
          contentChunks.push(deltaContent);
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  // Strategy A: OpenAI Audio Output — base64 chunks
  if (audioChunks.length > 0) {
    const fullB64 = audioChunks.join("");
    const mimeType = mimeForAudioFormat(env.OPENROUTER_AUDIO_FORMAT);
    const ext = extForAudioFormat(env.OPENROUTER_AUDIO_FORMAT);
    const bufferData = Buffer.from(fullB64, "base64");
    const stored = await uploadAsset("files", bufferData, `${Date.now()}.${ext}`, mimeType);
    return { type: "music", url: stored.publicUrl, key: stored.key, bucket: stored.bucket, prompt: request.prompt, size: bufferData.length, mimeType };
  }

  // Strategy B: Gemini/Lyria inline data — look for data URL in accumulated content
  let fullContent = contentChunks.join("");

  // If content is empty, try the last chunk's message content (non-streaming fallback)
  if (!fullContent) {
    try {
      const parsed = JSON.parse(buffer || "{}");
      const msgContent = parsed.choices?.[0]?.message?.content;
      if (typeof msgContent === "string") fullContent = msgContent;
      else if (Array.isArray(msgContent)) fullContent = JSON.stringify(msgContent);
    } catch { /* ignore */ }
  }

  // Search for data:audio URL in content
  const audioDataUrlMatch = fullContent.match(/data:audio\/([a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=\r\n]+)/);
  if (audioDataUrlMatch) {
    const mime = `audio/${audioDataUrlMatch[1]}`;
    const ext = extensionForMime(mime, "music");
    const bufferData = Buffer.from(audioDataUrlMatch[2].replace(/[\r\n]/g, ""), "base64");
    const stored = await uploadAsset("files", bufferData, `${Date.now()}.${ext}`, mime);
    return { type: "music", url: stored.publicUrl, key: stored.key, bucket: stored.bucket, prompt: request.prompt, size: bufferData.length, mimeType: mime };
  }

  // Search for any data URL (not necessarily audio/* — Lyria might return generic)
  const anyDataUrlMatch = fullContent.match(/data:([a-zA-Z0-9/+.-]+);base64,([A-Za-z0-9+/=\r\n]+)/);
  if (anyDataUrlMatch) {
    const mime = anyDataUrlMatch[1];
    const ext = extensionForMime(mime, "music");
    const bufferData = Buffer.from(anyDataUrlMatch[2].replace(/[\r\n]/g, ""), "base64");
    const stored = await uploadAsset("files", bufferData, `${Date.now()}.${ext}`, mime);
    return { type: "music", url: stored.publicUrl, key: stored.key, bucket: stored.bucket, prompt: request.prompt, size: bufferData.length, mimeType: mime };
  }

  // Search for HTTP URL pointing to an audio file
  const audioUrlMatch = fullContent.match(/(https?:\/\/[^\s"<>)]+\.(mp3|wav|ogg|m4a|aac|flac)(\?[^\s"<>)]*)?)/i);
  if (audioUrlMatch) {
    const dlRes = await fetch(audioUrlMatch[1]);
    if (!dlRes.ok) throw new Error(`Failed to download music: ${dlRes.status}`);
    const bufferData = Buffer.from(await dlRes.arrayBuffer());
    const mime = dlRes.headers.get("content-type") ?? "audio/mpeg";
    const ext = extensionForMime(mime, "music");
    const stored = await uploadAsset("files", bufferData, `${Date.now()}.${ext}`, mime);
    return { type: "music", url: stored.publicUrl, key: stored.key, bucket: stored.bucket, prompt: request.prompt, size: bufferData.length, mimeType: mime };
  }

  throw new Error(`Music response did not contain audio data. Content preview: ${fullContent.slice(0, 300)}`);
}

function mimeForAudioFormat(fmt: string): string {
  const map: Record<string, string> = { mp3: "audio/mpeg", wav: "audio/wav", flac: "audio/flac", opus: "audio/opus", pcm16: "audio/L16" };
  return map[fmt] ?? "audio/wav";
}
function extForAudioFormat(fmt: string): string {
  const map: Record<string, string> = { mp3: "mp3", wav: "wav", flac: "flac", opus: "opus", pcm16: "pcm" };
  return map[fmt] ?? "wav";
}

// ─── Public dispatcher ─────────────────────────────────────────
export async function generateMedia(request: MediaRequest): Promise<MediaResult> {
  await initProviders();
  const config = getMediaProviderConfig();
  if (!config.apiKey) {
    throw new Error(`Provider '${config.name}' is not configured with an API key`);
  }

  switch (request.type) {
    case "image":
      return generateImage(request);
    case "video":
      return generateVideo(request);
    case "music":
      return generateMusic(request);
    case "transcription":
      throw new Error("Use transcribeAudio for transcription");
    default:
      throw new Error(`Unsupported media type: ${request.type}`);
  }
}

/**
 * Transcribe audio using OpenRouter Whisper audio transcriptions endpoint.
 */
export async function transcribeAudio(audioBuffer: Buffer, mimeType: string, filename: string): Promise<MediaResult> {
  await initProviders();
  const config = getMediaProviderConfig();
  if (!config.apiKey) {
    throw new Error(`Provider '${config.name}' is not configured with an API key`);
  }

  // OpenAI-compatible audio/transcriptions accepts multipart/form-data with the audio file directly.
  const form = new FormData();
  const arrayBuffer = audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength) as ArrayBuffer;
  form.append("file", new Blob([arrayBuffer], { type: mimeType }), filename);
  form.append("model", env.OPENROUTER_TRANSCRIPTION_MODEL);
  form.append("response_format", "json");

  const res = await fetch(`${config.baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "HTTP-Referer": config.siteUrl ?? "https://jarwisyan.local",
      "X-Title": config.siteName ?? "AI Jarwisyan",
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown");
    throw new Error(`${config.name} transcription error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const transcript = data.text ?? "";

  // Store transcript as a text file in Supabase Storage
  const textBuffer = Buffer.from(transcript, "utf-8");
  const stored = await uploadAsset("files", textBuffer, `${Date.now()}_transcription.txt`, "text/plain");

  return {
    type: "transcription",
    url: stored.publicUrl,
    key: stored.key,
    bucket: stored.bucket,
    prompt: "Transcribe this audio to text.",
    size: textBuffer.length,
    mimeType: "text/plain",
  };
}



function extensionForMime(mimeType: string, fallbackType: MediaType): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/wav": "wav",
    "text/plain": "txt",
  };
  return map[mimeType] ?? (fallbackType === "image" ? "png" : fallbackType === "video" ? "mp4" : "mp3");
}
