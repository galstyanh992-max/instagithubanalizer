// Thin shared-tree proxy for external command-line tool adapters
// (browser-use, crawl4ai, agent-reach, faster-whisper, chatterbox-tts,
// yt-dlp, repomix). The real implementations (execFile against local
// isolated venvs / node binaries) live at
// src/local-runtime/platform/external-tool-adapters.ts and are
// local-runtime only. Metadata below is safe static catalog data (id/name/
// kind/description/source/capabilities — no local paths); execution methods
// fail closed on web-control-plane instead of ever shelling out.
import { env } from '@/lib/env';
import type { AdapterExecutionRequest, AdapterExecutionResult, AdapterHealth, AdapterStatus, JarvisRuntimeAdapter, AdapterMetadata } from './adapter-contract';
import { documentRouter } from '@/lib/document-router';

const FORBIDDEN_MESSAGE = 'LOCAL_EXECUTION_FORBIDDEN: This external tool runs on the local JARVIS runtime only.';

function isForbidden(): boolean {
  return env.JARVIS_RUNTIME_ROLE === 'web-control-plane';
}

function forbiddenHealth(): AdapterHealth {
  return { state: 'UNKNOWN', message: FORBIDDEN_MESSAGE, checkedAt: new Date().toISOString() };
}

function forbiddenExecutionResult(startedAt: number): AdapterExecutionResult {
  return { ok: false, error: { code: 'LOCAL_EXECUTION_FORBIDDEN', message: FORBIDDEN_MESSAGE, retryable: false }, durationMs: Date.now() - startedAt };
}

const CATALOG: Array<{ metadata: AdapterMetadata; capabilities: string[] }> = [
  { metadata: { id: 'browser-use', name: 'Browser Use', kind: 'browser', description: 'Изолированный агентный браузер Browser Use', source: 'browser-use/browser-use' }, capabilities: ['browser_agent', 'navigation', 'page_extraction'] },
  { metadata: { id: 'crawl4ai', name: 'Crawl4AI', kind: 'crawler', description: 'Изолированный crawler и Markdown-экстрактор', source: 'unclecode/crawl4ai' }, capabilities: ['crawl', 'markdown_extraction', 'structured_extraction'] },
  { metadata: { id: 'agent-reach', name: 'Agent Reach', kind: 'social', description: 'Доступ к проверенным публичным социальным каналам', source: 'Panniantong/agent-reach' }, capabilities: ['github_reach', 'youtube_metadata', 'rss', 'web_reader', 'v2ex'] },
  { metadata: { id: 'faster-whisper', name: 'Faster Whisper', kind: 'stt', description: 'Локальная CPU-транскрибация через CTranslate2', source: 'SYSTRAN/faster-whisper' }, capabilities: ['transcription', 'stt', 'timestamps'] },
  { metadata: { id: 'chatterbox-tts', name: 'Chatterbox TTS', kind: 'tts', description: 'Опциональный локальный TTS; основной CPU fallback остаётся Edge TTS', source: 'resemble-ai/chatterbox' }, capabilities: ['tts', 'voice_generation'] },
  { metadata: { id: 'yt-dlp', name: 'yt-dlp', kind: 'media', description: 'Метаданные и разрешённые загрузки медиа', source: 'yt-dlp/yt-dlp' }, capabilities: ['media_metadata', 'subtitle_extraction', 'media_download'] },
  { metadata: { id: 'repomix', name: 'Repomix', kind: 'code_intelligence', description: 'Детерминированная упаковка репозитория для анализа', source: 'yamadashy/repomix' }, capabilities: ['repository_pack', 'code_context'] },
];

let cachedReal: Map<string, JarvisRuntimeAdapter> | null = null;

async function realAdapters(): Promise<Map<string, JarvisRuntimeAdapter>> {
  if (cachedReal) return cachedReal;
  const { externalToolAdapters: real } = await import('@/local-runtime/platform/external-tool-adapters');
  const map = new Map<string, JarvisRuntimeAdapter>();
  for (const adapter of real) {
    const metadata = adapter.metadata();
    if (!(metadata instanceof Promise)) map.set(metadata.id, adapter);
  }
  cachedReal = map;
  return map;
}

class CommandToolAdapterProxy implements JarvisRuntimeAdapter {
  constructor(private readonly entry: { metadata: AdapterMetadata; capabilities: string[] }) {}

  metadata() { return this.entry.metadata; }
  capabilities() { return this.entry.capabilities; }
  configuration() { return { localOnly: true, available: !isForbidden() }; }

  private async real(): Promise<JarvisRuntimeAdapter> {
    const map = await realAdapters();
    const adapter = map.get(this.entry.metadata.id);
    if (!adapter) throw new Error(`Unknown external tool adapter: ${this.entry.metadata.id}`);
    return adapter;
  }

  async version(): Promise<string | null> {
    if (isForbidden()) return null;
    return (await this.real()).version();
  }

  async health(): Promise<AdapterHealth> {
    if (isForbidden()) return forbiddenHealth();
    return (await this.real()).health();
  }

  async status(): Promise<AdapterStatus> {
    if (isForbidden()) return { installed: false, enabled: false, running: false, state: 'FORBIDDEN' };
    return (await this.real()).status();
  }

  async metrics(): Promise<Record<string, number | string | null>> {
    if (isForbidden()) return { installed: 0 };
    return (await this.real()).metrics();
  }

  async execute(request: AdapterExecutionRequest): Promise<AdapterExecutionResult> {
    const startedAt = Date.now();
    if (isForbidden()) return forbiddenExecutionResult(startedAt);
    return (await this.real()).execute(request);
  }
}

class DocumentRouterAdapter implements JarvisRuntimeAdapter {
  metadata(): AdapterMetadata { return { id: 'document-router', name: 'Document Router', kind: 'document_processor', description: 'Маршрутизация OpenDataLoader → Docling с fallback', source: 'jarvis' }; }
  capabilities() { return ['pdf_to_markdown', 'pdf_to_json', 'office_documents', 'document_fallback']; }
  configuration() { return { primaryPdf: 'opendataloader', fallback: 'docling', localOnly: true }; }
  async version() { return '1'; }
  async health(): Promise<AdapterHealth> {
    const states = await documentRouter.status();
    const available = states.filter((state) => state.available);
    const limitations = available.filter((state) => state.reason);
    return {
      state: available.length === 0 ? 'UNHEALTHY' : available.length < states.length || limitations.length > 0 ? 'DEGRADED' : 'HEALTHY',
      message: `Доступно движков: ${available.length}/${states.length}${limitations.length > 0 ? `; ограничения: ${limitations.map((state) => state.reason).join('; ')}` : ''}`,
      checkedAt: new Date().toISOString(),
    };
  }
  async status(): Promise<AdapterStatus> { const health = await this.health(); return { installed: health.state !== 'UNHEALTHY', enabled: true, running: false, state: health.state }; }
  async metrics() { const states = await documentRouter.status(); return { available_engines: states.filter((state) => state.available).length, total_engines: states.length }; }
  async execute(request: AdapterExecutionRequest): Promise<AdapterExecutionResult> {
    const startedAt = Date.now();
    try {
      if (request.action === 'convert') {
        const path = typeof request.input?.path === 'string' ? request.input.path : '';
        const preferred = request.input?.engine === 'opendataloader' || request.input?.engine === 'docling' ? request.input.engine : undefined;
        return { ok: true, output: await documentRouter.convert(path, preferred), durationMs: Date.now() - startedAt };
      }
      if (request.action === 'health') return { ok: true, output: await this.health(), durationMs: Date.now() - startedAt };
      throw new Error(`Действие ${request.action} не поддерживается`);
    } catch (error) {
      return { ok: false, error: { code: 'DOCUMENT_ROUTER_FAILED', message: error instanceof Error ? error.message : String(error), retryable: true }, durationMs: Date.now() - startedAt };
    }
  }
}

export const externalToolAdapters: JarvisRuntimeAdapter[] = [
  ...CATALOG.map((entry) => new CommandToolAdapterProxy(entry)),
  new DocumentRouterAdapter(),
];
