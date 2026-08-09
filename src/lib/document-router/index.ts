import { mkdir, realpath } from 'node:fs/promises';
import { basename, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DoclingAdapter, OpenDataLoaderAdapter } from './adapters';
import type { DocumentConversionResult, DocumentEngine, DocumentEngineAdapter } from './types';

export type { DocumentConversionResult, DocumentEngine } from './types';

function isInside(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

export class DocumentRouter {
  constructor(private readonly adapters: DocumentEngineAdapter[] = [new OpenDataLoaderAdapter(), new DoclingAdapter()]) {}

  async status() {
    return Promise.all(this.adapters.map(async (adapter) => ({ id: adapter.id, ...(await adapter.available()) })));
  }

  async convert(input: string, preferred?: DocumentEngine): Promise<DocumentConversionResult> {
    const startedAt = Date.now();
    const root = await realpath(/*turbopackIgnore: true*/ process.cwd());
    const resolvedInput = await realpath(resolve(/*turbopackIgnore: true*/ root, input));
    if (!isInside(root, resolvedInput)) throw new Error('Документ должен находиться внутри рабочей области');
    const extension = extname(resolvedInput).toLowerCase();

    const supported = this.adapters.filter((adapter) => adapter.supports(extension));
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
