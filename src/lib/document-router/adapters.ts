import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { DocumentEngineAdapter } from './types';

const execFileAsync = promisify(execFile);

async function exists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

async function findJavaHome(): Promise<string | null> {
  const candidates = [
    process.env.JAVA_HOME,
    process.env.JARVIS_JAVA_HOME,
    process.platform === 'win32' ? 'C:\\Program Files\\Eclipse Adoptium\\jre-21.0.12.8-hotspot' : undefined,
  ].filter((value): value is string => Boolean(value));
  for (const home of candidates) {
    try {
      await execFileAsync(join(home, 'bin', process.platform === 'win32' ? 'java.exe' : 'java'), ['-version'], {
        timeout: 5_000,
        windowsHide: true,
      });
      return home;
    } catch { /* try the next configured runtime */ }
  }
  return null;
}

export class OpenDataLoaderAdapter implements DocumentEngineAdapter {
  readonly id = 'opendataloader' as const;
  private readonly cli = join(process.cwd(), 'node_modules', '@opendataloader', 'pdf', 'dist', 'cli.js');

  supports(extension: string): boolean { return extension === '.pdf'; }

  async available() {
    const javaHome = await findJavaHome();
    if (!await exists(this.cli)) return { available: false, version: null, reason: 'Пакет @opendataloader/pdf не установлен' };
    if (!javaHome) return { available: false, version: null, reason: 'Java 11+ не найдена' };
    return { available: true, version: '2.5.0', reason: null };
  }

  async convert(inputPath: string, outputDirectory: string, timeoutMs: number): Promise<void> {
    const javaHome = await findJavaHome();
    if (!javaHome) throw new Error('Java 11+ не найдена');
    await execFileAsync(process.execPath, [
      this.cli,
      '--output-dir', outputDirectory,
      '--format', 'markdown,json',
      '--image-output', 'off',
      inputPath,
    ], {
      timeout: timeoutMs,
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024,
      env: { ...process.env, JAVA_HOME: javaHome, PATH: `${join(javaHome, 'bin')};${process.env.PATH ?? ''}` },
    });
  }
}

export class DoclingAdapter implements DocumentEngineAdapter {
  readonly id = 'docling' as const;
  private readonly executable = join(process.cwd(), '.jarvis', 'venvs', 'documents', 'Scripts', process.platform === 'win32' ? 'docling.exe' : 'docling');

  supports(extension: string): boolean {
    // Docling 2.118.1 leaves its PDF handle open on this Windows runtime and
    // then fails while cleaning its temporary copy. OpenDataLoader remains the
    // verified PDF engine; keep Docling available for the formats that pass.
    if (process.platform === 'win32' && extension === '.pdf') return false;
    return ['.pdf', '.docx', '.pptx', '.xlsx', '.html', '.htm', '.md', '.txt', '.png', '.jpg', '.jpeg', '.tiff', '.wav', '.mp3'].includes(extension);
  }

  async available() {
    if (!await exists(this.executable)) return { available: false, version: null, reason: 'Изолированное окружение Docling не установлено' };
    // Version is pinned by the environment installation and exposed without
    // importing the heavy ML stack on every dashboard refresh.
    return {
      available: true,
      version: '2.118.1',
      reason: process.platform === 'win32'
        ? 'PDF-конвейер отключён после неуспешной runtime-проверки; PDF обрабатывает OpenDataLoader'
        : null,
    };
  }

  async convert(inputPath: string, outputDirectory: string, timeoutMs: number): Promise<void> {
    await execFileAsync(this.executable, [
      'convert', '--to', 'md', '--to', 'json', '--output', outputDirectory,
      '--image-export-mode', 'placeholder', '--no-ocr', inputPath,
    ], { timeout: timeoutMs, windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  }
}
