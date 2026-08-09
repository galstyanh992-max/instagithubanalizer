import { execFile } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import type { AdapterExecutionRequest, AdapterExecutionResult, AdapterHealth, AdapterStatus, JarvisRuntimeAdapter } from './adapter-contract';
import type { AdapterMetadata } from './adapter-contract';
import { documentRouter } from '@/lib/document-router';

const execFileAsync = promisify(execFile);

interface CommandToolDefinition {
  metadata: AdapterMetadata;
  executable: string;
  versionArgs: string[];
  capabilities: string[];
  env?: () => NodeJS.ProcessEnv;
  smoke?: { args: string[]; timeoutMs: number };
  optional?: boolean;
}

async function exists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

function pythonMetadata(venv: string, packageName: string): Pick<CommandToolDefinition, 'executable' | 'versionArgs'> {
  return {
    executable: join(process.cwd(), '.jarvis', 'venvs', venv, 'Scripts', 'python.exe'),
    versionArgs: ['-c', `import importlib.metadata; print(importlib.metadata.version('${packageName}'))`],
  };
}

function agentReachEnv(): NodeJS.ProcessEnv {
  const media = join(process.cwd(), '.jarvis', 'venvs', 'media', 'Scripts');
  const reach = join(process.cwd(), '.jarvis', 'venvs', 'agent-reach', 'Scripts');
  return { ...process.env, PATH: `${media};${reach};${process.env.PATH ?? ''}` };
}

const DEFINITIONS: CommandToolDefinition[] = [
  {
    metadata: { id: 'browser-use', name: 'Browser Use', kind: 'browser', description: 'Изолированный агентный браузер Browser Use', source: 'browser-use/browser-use' },
    ...pythonMetadata('browser-use', 'browser-use'),
    capabilities: ['browser_agent', 'navigation', 'page_extraction'],
  },
  {
    metadata: { id: 'crawl4ai', name: 'Crawl4AI', kind: 'crawler', description: 'Изолированный crawler и Markdown-экстрактор', source: 'unclecode/crawl4ai' },
    ...pythonMetadata('crawl4ai', 'crawl4ai'),
    capabilities: ['crawl', 'markdown_extraction', 'structured_extraction'],
  },
  {
    metadata: { id: 'agent-reach', name: 'Agent Reach', kind: 'social', description: 'Доступ к проверенным публичным социальным каналам', source: 'Panniantong/agent-reach' },
    ...pythonMetadata('agent-reach', 'agent-reach'),
    capabilities: ['github_reach', 'youtube_metadata', 'rss', 'web_reader', 'v2ex'],
    env: agentReachEnv,
    smoke: { args: [join(process.cwd(), '.jarvis', 'venvs', 'agent-reach', 'Scripts', 'agent-reach.exe'), 'doctor', '--json'], timeoutMs: 30_000 },
  },
  {
    metadata: { id: 'faster-whisper', name: 'Faster Whisper', kind: 'stt', description: 'Локальная CPU-транскрибация через CTranslate2', source: 'SYSTRAN/faster-whisper' },
    ...pythonMetadata('voice', 'faster-whisper'),
    capabilities: ['transcription', 'stt', 'timestamps'],
  },
  {
    metadata: { id: 'chatterbox-tts', name: 'Chatterbox TTS', kind: 'tts', description: 'Опциональный локальный TTS; основной CPU fallback остаётся Edge TTS', source: 'resemble-ai/chatterbox' },
    ...pythonMetadata('chatterbox', 'chatterbox-tts'),
    capabilities: ['tts', 'voice_generation'],
    optional: true,
  },
  {
    metadata: { id: 'yt-dlp', name: 'yt-dlp', kind: 'media', description: 'Метаданные и разрешённые загрузки медиа', source: 'yt-dlp/yt-dlp' },
    executable: join(process.cwd(), '.jarvis', 'venvs', 'media', 'Scripts', 'yt-dlp.exe'),
    versionArgs: ['--version'],
    capabilities: ['media_metadata', 'subtitle_extraction', 'media_download'],
  },
  {
    metadata: { id: 'repomix', name: 'Repomix', kind: 'code_intelligence', description: 'Детерминированная упаковка репозитория для анализа', source: 'yamadashy/repomix' },
    executable: process.execPath,
    versionArgs: [join(process.cwd(), 'node_modules', 'repomix', 'bin', 'repomix.cjs'), '--version'],
    capabilities: ['repository_pack', 'code_context'],
  },
];

class CommandToolAdapter implements JarvisRuntimeAdapter {
  constructor(private readonly definition: CommandToolDefinition) {}

  metadata() { return this.definition.metadata; }
  capabilities() { return this.definition.capabilities; }
  configuration() { return { executable: this.definition.executable, isolated: this.definition.executable.includes('.jarvis') && this.definition.executable.includes('venvs'), optional: this.definition.optional ?? false }; }

  async version(): Promise<string | null> {
    if (!await exists(this.definition.executable)) return null;
    try {
      const { stdout, stderr } = await execFileAsync(this.definition.executable, this.definition.versionArgs, {
        timeout: 15_000,
        windowsHide: true,
        env: this.definition.env?.() ?? process.env,
      });
      return `${stdout}\n${stderr}`.trim().split(/\r?\n/)[0]?.trim() || null;
    } catch { return null; }
  }

  async health(): Promise<AdapterHealth> {
    const startedAt = Date.now();
    const installed = await exists(this.definition.executable);
    const version = installed ? await this.version() : null;
    return {
      state: version ? 'HEALTHY' : installed ? 'DEGRADED' : 'MISSING',
      message: version
        ? `Готово, версия ${version}`
        : installed
          ? 'Команда найдена, проверка версии не прошла'
          : this.definition.optional
            ? 'Опциональный компонент не установлен; используется CPU fallback'
            : 'Изолированное окружение не установлено',
      checkedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
    };
  }

  async status(): Promise<AdapterStatus> {
    const health = await this.health();
    const installed = health.state !== 'MISSING';
    return { installed, enabled: true, running: false, state: health.state === 'HEALTHY' ? 'READY' : health.state };
  }

  async metrics() { return { installed: await exists(this.definition.executable) ? 1 : 0 }; }

  async execute(request: AdapterExecutionRequest): Promise<AdapterExecutionResult> {
    const startedAt = Date.now();
    try {
      if (request.action === 'health' || request.action === 'version') {
        return { ok: true, output: request.action === 'health' ? await this.health() : await this.version(), durationMs: Date.now() - startedAt };
      }
      if (request.action === 'doctor' && this.definition.smoke) {
        const [command, ...args] = this.definition.smoke.args;
        const { stdout } = await execFileAsync(command, args, {
          timeout: this.definition.smoke.timeoutMs,
          windowsHide: true,
          env: this.definition.env?.() ?? process.env,
          maxBuffer: 4 * 1024 * 1024,
        });
        return { ok: true, output: JSON.parse(stdout), durationMs: Date.now() - startedAt };
      }
      if (this.definition.metadata.id === 'yt-dlp' && request.action === 'metadata') {
        const url = typeof request.input?.url === 'string' ? request.input.url : '';
        if (!/^https:\/\//i.test(url)) throw new Error('Требуется HTTPS URL');
        const { stdout } = await execFileAsync(this.definition.executable, ['--dump-single-json', '--skip-download', '--no-playlist', url], {
          timeout: 120_000, windowsHide: true, maxBuffer: 8 * 1024 * 1024,
        });
        return { ok: true, output: JSON.parse(stdout), durationMs: Date.now() - startedAt };
      }
      if (this.definition.metadata.id === 'repomix' && request.action === 'pack') {
        const input = typeof request.input?.path === 'string' ? request.input.path : '.';
        const root = resolve(/*turbopackIgnore: true*/ process.cwd());
        const target = resolve(/*turbopackIgnore: true*/ root, input);
        if (target !== root && !target.startsWith(`${root}\\`)) throw new Error('Путь Repomix вне рабочей области запрещён');
        const output = join(/*turbopackIgnore: true*/ process.cwd(), '.jarvis', 'repomix', `${basename(target)}-${Date.now()}.xml`);
        const cli = this.definition.versionArgs[0];
        await mkdir(dirname(output), { recursive: true });
        await execFileAsync(process.execPath, [cli, target, '--output', output, '--style', 'xml'], { timeout: 120_000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
        return { ok: true, output: { path: output }, durationMs: Date.now() - startedAt };
      }
      throw new Error(`Действие ${request.action} не разрешено для ${this.definition.metadata.id}`);
    } catch (error) {
      return { ok: false, error: { code: 'EXTERNAL_TOOL_FAILED', message: error instanceof Error ? error.message : String(error), retryable: true }, durationMs: Date.now() - startedAt };
    }
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
  ...DEFINITIONS.map((definition) => new CommandToolAdapter(definition)),
  new DocumentRouterAdapter(),
];
