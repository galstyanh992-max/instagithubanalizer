import fs from 'node:fs/promises';
import path from 'node:path';
import { CodexProviderError } from './types';

export async function validateCodexWorkingDirectory(input: string): Promise<string> {
  const candidate = input.trim();
  if (!candidate || candidate.startsWith('\\\\') || candidate.startsWith('//')) {
    throw new CodexProviderError('PERMISSION_DENIED', 'A local D: drive directory is required.');
  }

  const resolved = path.win32.resolve(candidate);
  const parsed = path.win32.parse(resolved);
  if (parsed.root.toUpperCase() !== 'D:\\') {
    throw new CodexProviderError('PERMISSION_DENIED', 'Codex working directories are restricted to the local D: drive.');
  }

  let canonical: string;
  try {
    canonical = await fs.realpath(resolved);
    const stat = await fs.stat(canonical);
    if (!stat.isDirectory()) throw new Error('not a directory');
  } catch {
    throw new CodexProviderError('PERMISSION_DENIED', 'The requested Codex working directory does not exist or is not a directory.');
  }

  if (canonical.startsWith('\\\\') || path.win32.parse(canonical).root.toUpperCase() !== 'D:\\') {
    throw new CodexProviderError('PERMISSION_DENIED', 'The canonical Codex working directory is outside the local D: drive.');
  }
  return canonical;
}
