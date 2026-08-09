import { execFile, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { promisify } from 'node:util';
import { CodexProviderError } from './types';
import { redactCodexText } from './redaction';

const execFileAsync = promisify(execFile);
const ALLOWED_COMMANDS = new Set([
  '--version',
  'login status',
  'login',
  'logout',
  'app-server --stdio',
]);

export interface CodexCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export class CodexProcessRunner {
  private executablePromise?: Promise<string | null>;

  async findExecutable(): Promise<string | null> {
    if (!this.executablePromise) this.executablePromise = this.discoverExecutable();
    return this.executablePromise;
  }

  private async discoverExecutable(): Promise<string | null> {
    try {
      const locator = process.platform === 'win32' ? 'where.exe' : 'which';
      const { stdout } = await execFileAsync(locator, ['codex'], { timeout: 5_000, windowsHide: true });
      const paths = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      if (process.platform === 'win32') {
        return paths.find((item) => item.toLowerCase().endsWith('.exe'))
          ?? paths.find((item) => item.toLowerCase().endsWith('.cmd'))
          ?? null;
      }
      return paths[0] ?? null;
    } catch {
      return null;
    }
  }

  private assertAllowed(args: string[]): void {
    if (!ALLOWED_COMMANDS.has(args.join(' '))) {
      throw new CodexProviderError('BLOCKED', 'The requested Codex CLI operation is not allowlisted.');
    }
  }

  async run(args: string[], timeoutMs = 10_000): Promise<CodexCommandResult> {
    this.assertAllowed(args);
    const executable = await this.findExecutable();
    if (!executable) return { exitCode: 127, stdout: '', stderr: 'CODEX_NOT_INSTALLED' };
    try {
      const { stdout, stderr } = await execFileAsync(executable, args, {
        timeout: timeoutMs,
        windowsHide: true,
        maxBuffer: 256_000,
        shell: false,
      });
      return { exitCode: 0, stdout: redactCodexText(stdout, 8_000), stderr: redactCodexText(stderr, 2_000) };
    } catch (error) {
      const failure = error as NodeJS.ErrnoException & { code?: number | string; stdout?: string; stderr?: string };
      return {
        exitCode: typeof failure.code === 'number' ? failure.code : 1,
        stdout: redactCodexText(failure.stdout ?? '', 8_000),
        stderr: redactCodexText(failure.stderr ?? failure.message, 2_000),
      };
    }
  }

  async spawn(args: string[]): Promise<ChildProcessWithoutNullStreams> {
    this.assertAllowed(args);
    const executable = await this.findExecutable();
    if (!executable) throw new CodexProviderError('NOT_INSTALLED', 'Official Codex CLI is not installed.');
    return spawn(executable, args, {
      shell: false,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });
  }
}
