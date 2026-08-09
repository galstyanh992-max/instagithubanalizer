import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type {
  AdapterExecutionRequest,
  AdapterExecutionResult,
  AdapterHealth,
  AdapterStatus,
  JarvisRuntimeAdapter,
} from './adapter-contract';
import type { OllamaModelDetails } from './types';

interface OllamaTag {
  name?: string;
  size?: number;
  details?: { parameter_size?: string; quantization_level?: string; family?: string };
}

interface OllamaProcess {
  name?: string;
  size?: number;
  size_vram?: number;
  context_length?: number;
}

interface OllamaChatResponse {
  model?: string;
  message?: { role?: string; content?: string };
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
  total_duration?: number;
  load_duration?: number;
  done?: boolean;
}

export interface OllamaBenchmark {
  model: string;
  mode: 'cold' | 'warm';
  ok: boolean;
  checkedAt: string;
  wallMs: number;
  loadMs: number | null;
  tokensPerSecond: number | null;
  response: string;
}

const HEALTH_TIMEOUT_MS = 8_000;
const WARM_INFERENCE_TIMEOUT_MS = 30_000;
// RX 580/Vulkan can need more than a minute to map a model on first load.
const COLD_INFERENCE_TIMEOUT_MS = 120_000;
const MAX_JSON_BYTES = 2_097_152;

function recommendedUse(name: string, family?: string): string[] {
  const value = `${name} ${family ?? ''}`.toLowerCase();
  const use: string[] = [];
  if (/code|coder|starcoder|deepseek-coder/.test(value)) use.push('код', 'рефакторинг');
  if (/embed/.test(value)) use.push('эмбеддинги', 'поиск');
  if (/vision|llava|moondream/.test(value)) use.push('изображения');
  if (/qwen|llama|mistral|gemma|phi/.test(value)) use.push('диалог', 'классификация');
  return use.length > 0 ? use : ['простые локальные задачи'];
}

function tokensPerSecond(response: Pick<OllamaChatResponse, 'eval_count' | 'eval_duration'>): number | null {
  if (!response.eval_count || !response.eval_duration) return null;
  return Math.round((response.eval_count / (response.eval_duration / 1_000_000_000)) * 100) / 100;
}

function benchmarkPath(): string {
  return join(process.cwd(), '.jarvis', 'state', 'ollama-benchmarks.json');
}

async function saveBenchmark(benchmark: OllamaBenchmark): Promise<void> {
  const path = benchmarkPath();
  let previous: OllamaBenchmark[] = [];
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8')) as unknown;
    if (Array.isArray(parsed)) previous = parsed.filter((item): item is OllamaBenchmark => Boolean(item && typeof item === 'object'));
  } catch { /* first benchmark */ }
  const next = [...previous, benchmark].slice(-100);
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  await rename(temporary, path);
}

async function readLastBenchmark(): Promise<OllamaBenchmark | null> {
  try {
    const parsed = JSON.parse(await readFile(benchmarkPath(), 'utf8')) as OllamaBenchmark[];
    return Array.isArray(parsed) ? parsed.at(-1) ?? null : null;
  } catch { return null; }
}

export class OllamaAdapter implements JarvisRuntimeAdapter {
  constructor(private readonly endpoint = 'http://127.0.0.1:11434') {}

  metadata() {
    return {
      id: 'ollama-local',
      name: 'Ollama Local',
      kind: 'provider',
      description: 'Официальный локальный runtime Ollama',
      source: 'ollama/ollama',
    };
  }

  capabilities() {
    return ['local_ai', 'chat', 'streaming', 'structured_output', 'classification', 'completion', 'embeddings', 'model_management', 'benchmark'];
  }

  configuration() {
    return {
      endpoint: this.endpoint,
      localOnly: true,
      automaticLargeDownloads: false,
      timeouts: { healthMs: HEALTH_TIMEOUT_MS, warmInferenceMs: WARM_INFERENCE_TIMEOUT_MS, coldInferenceMs: COLD_INFERENCE_TIMEOUT_MS },
    };
  }

  private async fetch(path: string, init?: RequestInit, timeoutMs = HEALTH_TIMEOUT_MS): Promise<Response> {
    const controller = new AbortController();
    const externalSignal = init?.signal;
    const onAbort = () => controller.abort();
    externalSignal?.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${this.endpoint}${path}`, { ...init, signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
      return response;
    } catch (error) {
      if (controller.signal.aborted) throw new Error(`Ollama не ответил за ${Math.round(timeoutMs / 1_000)} секунд`);
      throw error;
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener('abort', onAbort);
    }
  }

  private async request<T>(path: string, init?: RequestInit, timeoutMs = HEALTH_TIMEOUT_MS, maxResponseBytes = MAX_JSON_BYTES): Promise<T> {
    const response = await this.fetch(path, init, timeoutMs);
    const declaredLength = Number(response.headers.get('content-length') ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > maxResponseBytes) throw new Error('Ответ Ollama превышает допустимый размер');
    if (!response.body) throw new Error('Ollama вернул пустой ответ');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxResponseBytes) {
        await reader.cancel();
        throw new Error('Ответ Ollama превышает допустимый размер');
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  }

  async health(): Promise<AdapterHealth> {
    const startedAt = Date.now();
    try {
      await this.request('/api/tags');
      return { state: 'HEALTHY', message: 'Локальный сервер отвечает', checkedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt };
    } catch (error) {
      return { state: 'UNHEALTHY', message: error instanceof Error ? error.message : String(error), checkedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt };
    }
  }

  async version(): Promise<string | null> {
    try {
      const response = await this.request<{ version?: string }>('/api/version');
      return response.version ?? null;
    } catch { return null; }
  }

  async status(): Promise<AdapterStatus> {
    const health = await this.health();
    const running = health.state === 'HEALTHY';
    return { installed: true, enabled: true, running, state: running ? 'ONLINE' : 'OFFLINE' };
  }

  async models(): Promise<OllamaModelDetails[]> {
    const [tags, processes] = await Promise.all([
      this.request<{ models?: OllamaTag[] }>('/api/tags'),
      this.request<{ models?: OllamaProcess[] }>('/api/ps').catch(() => ({ models: [] })),
    ]);
    const running = new Map((Array.isArray(processes.models) ? processes.models : []).slice(0, 256).map((model) => [model.name, model]));
    return (Array.isArray(tags.models) ? tags.models : []).slice(0, 256).map((model) => {
      const active = running.get(model.name);
      return {
        name: (model.name ?? 'unknown').slice(0, 200),
        size: model.size ?? null,
        parameter_size: model.details?.parameter_size ?? null,
        quantization: model.details?.quantization_level ?? null,
        loaded: Boolean(active),
        estimated_ram: model.size ?? null,
        current_ram: active?.size ?? null,
        context: active?.context_length ?? null,
        recommended_use: recommendedUse(model.name ?? '', model.details?.family),
      };
    });
  }

  async chat(input: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    format?: Record<string, unknown> | 'json';
    options?: Record<string, unknown>;
    cold?: boolean;
    signal?: AbortSignal;
  }): Promise<OllamaChatResponse> {
    return this.request<OllamaChatResponse>('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: input.model, messages: input.messages, format: input.format, stream: false, options: input.options }),
      signal: input.signal,
    }, input.cold ? COLD_INFERENCE_TIMEOUT_MS : WARM_INFERENCE_TIMEOUT_MS);
  }

  async streamChat(input: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    options?: Record<string, unknown>;
    cold?: boolean;
    signal?: AbortSignal;
  }): Promise<{ chunks: string[]; response: string; timeToFirstTokenMs: number | null; durationMs: number }> {
    const startedAt = Date.now();
    const response = await this.fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: input.model, messages: input.messages, stream: true, options: input.options }),
      signal: input.signal,
    }, input.cold ? COLD_INFERENCE_TIMEOUT_MS : WARM_INFERENCE_TIMEOUT_MS);
    if (!response.body) throw new Error('Ollama вернул пустой поток');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let combined = '';
    let totalBytes = 0;
    let firstTokenAt: number | null = null;
    const chunks: string[] = [];
    while (true) {
      const { done, value } = await reader.read();
      totalBytes += value?.byteLength ?? 0;
      if (totalBytes > MAX_JSON_BYTES) {
        await reader.cancel();
        throw new Error('Поток Ollama превышает допустимый размер');
      }
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line) as OllamaChatResponse;
        const content = event.message?.content ?? '';
        if (content) {
          if (firstTokenAt === null) firstTokenAt = Date.now();
          chunks.push(content);
          combined += content;
        }
      }
      if (done) break;
    }
    return { chunks, response: combined, timeToFirstTokenMs: firstTokenAt === null ? null : firstTokenAt - startedAt, durationMs: Date.now() - startedAt };
  }

  async metrics(): Promise<Record<string, number | string | null>> {
    try {
      const [models, lastBenchmark] = await Promise.all([this.models(), readLastBenchmark()]);
      return {
        installed_models: models.length,
        loaded_models: models.filter((model) => model.loaded).length,
        loaded_ram_bytes: models.reduce((sum, model) => sum + (model.current_ram ?? 0), 0),
        last_benchmark_ms: lastBenchmark?.wallMs ?? null,
        last_tokens_per_second: lastBenchmark?.tokensPerSecond ?? null,
        last_benchmark_model: lastBenchmark?.model ?? null,
      };
    } catch {
      return { installed_models: 0, loaded_models: 0, loaded_ram_bytes: 0, last_benchmark_ms: null, last_tokens_per_second: null, last_benchmark_model: null };
    }
  }

  private async benchmark(model: string, mode: 'cold' | 'warm', signal?: AbortSignal): Promise<OllamaBenchmark> {
    const startedAt = Date.now();
    const output = await this.chat({
      model,
      messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
      options: { temperature: 0, num_ctx: 512, num_predict: 4 },
      cold: mode === 'cold',
      signal,
    });
    const benchmark: OllamaBenchmark = {
      model,
      mode,
      ok: Boolean(output.message?.content?.trim()),
      checkedAt: new Date().toISOString(),
      wallMs: Date.now() - startedAt,
      loadMs: typeof output.load_duration === 'number' ? Math.round(output.load_duration / 1_000_000) : null,
      tokensPerSecond: tokensPerSecond(output),
      response: output.message?.content?.trim().slice(0, 200) ?? '',
    };
    await saveBenchmark(benchmark);
    return benchmark;
  }

  async execute(request: AdapterExecutionRequest): Promise<AdapterExecutionResult> {
    const startedAt = Date.now();
    try {
      if (request.action === 'list_models') return { ok: true, output: await this.models(), durationMs: Date.now() - startedAt };
      if (request.action === 'health') return { ok: true, output: await this.health(), durationMs: Date.now() - startedAt };
      const models = await this.models();
      const requestedModel = typeof request.input?.model === 'string' ? request.input.model : undefined;
      const model = requestedModel ?? models.find((item) => /phi4-mini/i.test(item.name))?.name ?? models[0]?.name;
      if (!model) throw new Error('Нет установленной модели для теста');
      const cold = request.input?.cold === true || !models.find((item) => item.name === model)?.loaded;

      if (request.action === 'test_inference' || request.action === 'benchmark') {
        const mode = cold ? 'cold' : 'warm';
        const benchmark = await this.benchmark(model, mode, request.signal);
        return { ok: benchmark.ok, output: benchmark, durationMs: Date.now() - startedAt };
      }
      if (request.action === 'chat') {
        const prompt = typeof request.input?.prompt === 'string' ? request.input.prompt : '';
        if (!prompt.trim()) throw new Error('Пустой запрос к Ollama');
        const output = await this.chat({ model, messages: [{ role: 'user', content: prompt }], cold, signal: request.signal });
        return { ok: Boolean(output.message?.content?.trim()), output, durationMs: Date.now() - startedAt };
      }
      if (request.action === 'test_json' || request.action === 'test_classification') {
        const schema = {
          type: 'object',
          properties: { label: { type: 'string', enum: ['positive', 'negative', 'neutral'] } },
          required: ['label'],
          additionalProperties: false,
        };
        const output = await this.chat({
          model,
          messages: [{ role: 'user', content: 'Classify sentiment: I love this. Return only the requested JSON.' }],
          format: schema,
          options: { temperature: 0, num_ctx: 512, num_predict: 16 },
          cold,
          signal: request.signal,
        });
        const parsed = JSON.parse(output.message?.content ?? '{}') as { label?: string };
        const ok = ['positive', 'negative', 'neutral'].includes(parsed.label ?? '');
        return { ok, output: { model, result: parsed, tokens_per_second: tokensPerSecond(output) }, durationMs: Date.now() - startedAt };
      }
      if (request.action === 'test_stream') {
        const output = await this.streamChat({
          model,
          messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
          options: { temperature: 0, num_ctx: 512, num_predict: 4 },
          cold,
          signal: request.signal,
        });
        return { ok: Boolean(output.response.trim()) && output.chunks.length > 0, output, durationMs: Date.now() - startedAt };
      }
      throw new Error(`Неподдерживаемое действие Ollama: ${request.action}`);
    } catch (error) {
      return {
        ok: false,
        error: { code: 'OLLAMA_ACTION_FAILED', message: error instanceof Error ? error.message : String(error), retryable: true },
        durationMs: Date.now() - startedAt,
      };
    }
  }
}

export const ollamaAdapter = new OllamaAdapter();
