import { mkdir, realpath } from 'node:fs/promises';
import { basename, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '@/lib/env';
import type { DocumentConversionResult, DocumentEngine, DocumentEngineAdapter } from './types';

export type { DocumentConversionResult, DocumentEngine } from './types';

const FORBIDDEN_MESSAGE = 'LOCAL_EXECUTION_FORBIDDEN: Document conversion runs on the local JARVIS runtime only.';

function isForbidden(): boolean {
  return env.JARVIS_RUNTIME_ROLE === 'web-control-plane';
}

// The real OpenDataLoader/Docling adapters shell out (execFile) to a local
// Java runtime / Python venv — local-runtime only. Never imported statically
// so document-router/index.ts can stay in the shared tree without shipping
// that execution into a Vercel web-control-plane bundle.
async function defaultAdapters(): Promise<DocumentEngineAdapter[]> {
  const { OpenDataLoaderAdapter, DoclingAdapter } = await import('@/local-runtime/document-router/adapters');
  return [new OpenDataLoaderAdapter(), new DoclingAdapter()];
}

function isInside(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

export class DocumentRouter {
  // Explicit adapters (used by tests / any future daemon-side caller) are
  // honored as-is. Without an explicit array, the real adapters are
  // resolved lazily per-call, never at construction or module-load time.
  constructor(private readonly injectedAdapters?: DocumentEngineAdapter[]) {}

  private async resolveAdapters(): Promise<DocumentEngineAdapter[]> {
    if (this.injectedAdapters) return this.injectedAdapters;
    return defaultAdapters();
  }

  async status() {
    if (isForbidden()) return [];
    const adapters = await this.resolveAdapters();
    return Promise.all(adapters.map(async (adapter) => ({ id: adapter.id, ...(await adapter.available()) })));
  }

  async convert(input: string, preferred?: DocumentEngine): Promise<DocumentConversionResult> {
    if (isForbidden()) throw new Error(FORBIDDEN_MESSAGE);
    const startedAt = Date.now();
    const adapters = await this.resolveAdapters();
    const root = await realpath(/*turbopackIgnore: true*/ process.cwd());
    const resolvedInput = await realpath(resolve(/*turbopackIgnore: true*/ root, input));
    if (!isInside(root, resolvedInput)) throw new Error('Документ должен находиться внутри рабочей области');
    const extension = extname(resolvedInput).toLowerCase();

    const supported = adapters.filter((adapter) => adapter.supports(extension));
    const ordered = preferred
      ? [...supported.filter((adapter) => adapter.id === preferred), ...supported.filter((adapter) => adapter.id !== preferred)]
      : extension === '.pdf'
        ? [...supported.filter((adapter) => adapter.id === 'opendataloader'), ...supported.filter((adapter) => adapter.id !== 'opendataloader')]
        : supported;
    if (ordered.length === 0) throw new Error(`Формат ${extension || 'без расширения'} не поддерживается`);

    const outputDirectory = join(root, '.jarvis', 'documents', randomUUID());
    await mkdir(outputDirectory, { recursive: true });
    const warnings: string[] = [];
    let attempts = 0;
    for (const adapter of ordered) {
      const availability = await adapter.available();
      if (!availability.available) {
        warnings.push(`${adapter.id}: ${availability.reason ?? 'недоступен'}`);
        continue;
      }
      attempts += 1;
      try {
        await adapter.convert(resolvedInput, outputDirectory, adapter.id === 'docling' ? 300_000 : 120_000);
        const stem = basename(resolvedInput, extension);
        return {
          ok: true,
          engine: adapter.id,
          inputPath: resolvedInput,
          outputDirectory,
          markdownPath: join(outputDirectory, `${stem}.md`),
          jsonPath: join(outputDirectory, `${stem}.json`),
          durationMs: Date.now() - startedAt,
          fallbackUsed: attempts > 1 || (preferred !== undefined && adapter.id !== preferred),
          warnings,
        };
      } catch (error) {
        warnings.push(`${adapter.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    throw new Error(`Не удалось обработать документ: ${warnings.join('; ')}`);
  }
}

export const documentRouter = new DocumentRouter();
