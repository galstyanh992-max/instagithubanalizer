import { spawn, ChildProcess } from 'child_process';
import { PathGuard } from '../sandbox/path-guard';
import treeKill from 'tree-kill';
import { DaemonConfig } from '../config';

export interface ProcessRunnerOptions {
  executableId: string;
  resolvedPath: string;
  args: string[];
  cwd: string;
  environmentProfile: 'MINIMAL' | 'INHERIT';
  timeoutMs: number;
}

export interface ProcessRunnerResult {
  status: 'succeeded' | 'failed' | 'timeout';
  exitCode: number | null;
  stdout: string;
  stderr: string;
  errorMessage?: string;
  durationMs: number;
}

export class ProcessRunner {
  /**
   * Executes a process strictly without a shell.
   * Enforces argument safety and environment masking.
   */
  public static async executeSafe(options: ProcessRunnerOptions): Promise<ProcessRunnerResult> {
    const startTime = Date.now();
    PathGuard.assertSafePath(options.cwd, true);

    // Note: options.resolvedPath is trusted because it comes from the DaemonRegistry.
    // System binaries (like npm or cmd) live outside the Workspace.
    
    // 1. Argument validation (No shell metacharacters if someone bypassed)
    this.validateArgsSafety(options.args);

    // 2. Environment Profile Preparation
    const env = this.buildEnvironmentProfile(options.environmentProfile);

    // 3. Spawn process WITHOUT shell
    return new Promise((resolve) => {
      let stdoutBuf = '';
      let stderrBuf = '';
      let isCompleted = false;

      const child: ChildProcess = spawn(options.resolvedPath, options.args, {
        cwd: options.cwd,
        env,
        shell: false, // MANDATORY PHASE 04 REQUIREMENT
        windowsHide: true,
      });

      const timer = setTimeout(() => {
        if (!isCompleted) {
          isCompleted = true;
          this.terminateTree(child.pid);
          resolve({
            status: 'timeout',
            exitCode: null,
            stdout: stdoutBuf,
            stderr: stderrBuf,
            errorMessage: `Process timed out after ${options.timeoutMs}ms`,
            durationMs: Date.now() - startTime
          });
        }
      }, options.timeoutMs);

      child.stdout?.on('data', (data) => {
        stdoutBuf += data.toString();
        // Prevent buffer overflow DoS (limit to 5MB)
        if (stdoutBuf.length > 5 * 1024 * 1024) {
          stdoutBuf = stdoutBuf.slice(0, 5 * 1024 * 1024) + '\n[TRUNCATED_BY_DAEMON]';
        }
      });

      child.stderr?.on('data', (data) => {
        stderrBuf += data.toString();
        if (stderrBuf.length > 1 * 1024 * 1024) {
          stderrBuf = stderrBuf.slice(0, 1 * 1024 * 1024) + '\n[TRUNCATED_BY_DAEMON]';
        }
      });

      child.on('error', (err) => {
        if (!isCompleted) {
          isCompleted = true;
          clearTimeout(timer);
          resolve({
            status: 'failed',
            exitCode: null,
            stdout: stdoutBuf,
            stderr: stderrBuf,
            errorMessage: err.message,
            durationMs: Date.now() - startTime
          });
        }
      });

      child.on('close', (code) => {
        if (!isCompleted) {
          isCompleted = true;
          clearTimeout(timer);
          resolve({
            status: code === 0 ? 'succeeded' : 'failed',
            exitCode: code,
            stdout: stdoutBuf,
            stderr: stderrBuf,
            durationMs: Date.now() - startTime
          });
        }
      });
    });
  }

  /**
   * Builds an isolated environment for the spawned process.
   */
  private static buildEnvironmentProfile(profile: 'MINIMAL' | 'INHERIT'): NodeJS.ProcessEnv {
    if (profile === 'INHERIT') {
      return { ...process.env }; // Warning: Might contain secrets
    }

    // MINIMAL: Whitelist-only environment variables
    const safeEnv: NodeJS.ProcessEnv = {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: DaemonConfig.TEMP_ROOT,
      TMP: DaemonConfig.TEMP_ROOT,
      NODE_ENV: process.env.NODE_ENV,
    };

    return safeEnv;
  }

  /**
   * Strictly validates arguments to prevent arbitrary execution injections.
   * Since shell: false is used, characters like &&, |, >, < are passed literally to the program,
   * but we still reject them if they look like an attempt to inject shell logic.
   */
  private static validateArgsSafety(args: string[]) {
    const dangerousPatterns = [/\|/, />/, /</, /&&/, /;/];
    for (const arg of args) {
      for (const pattern of dangerousPatterns) {
        if (pattern.test(arg)) {
          throw new Error(`ProcessRunner Exception: Disallowed shell character detected in argument: ${arg}`);
        }
      }
    }
  }

  /**
   * Terminates the entire process tree cleanly.
   */
  private static terminateTree(pid: number | undefined) {
    if (!pid) return;
    try {
      treeKill(pid, 'SIGKILL', (err) => {
        if (err) {
          console.error(`Failed to kill process tree for PID ${pid}:`, err);
        }
      });
    } catch (e) {
      console.error(`Error terminating PID ${pid}:`, e);
    }
  }
}
