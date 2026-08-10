// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CodexWorkerAdapter } from '@/local-runtime/worker-registry/adapters/codex-cli';
import { TaskPayload } from '../types';

vi.mock('child_process');
vi.mock('fs');

/**
 * Builds a mock child_process.ChildProcess-shaped object.
 *
 * `emitClose` controls whether a 'close' event fires on its own after a fixed
 * delay (used for the "normal" exit tests). When `killTriggersClose` is true,
 * calling the mock's `kill()` schedules the 'close' callback asynchronously
 * via `queueMicrotask` (simulating the OS delivering a terminal close event
 * after SIGKILL/SIGTERM) instead of relying on a real multi-second wait — this
 * is what the TIMEOUT and CANCELLED tests need: a deterministic, fast way to
 * prove the adapter's Promise resolves only after a real terminal event, not
 * merely after kill() is called.
 */
function makeMockChild(overrides: Partial<{
  closeCode: number | null;
  closeSignal: string | null;
  emitClose: boolean;
  killTriggersClose: boolean;
  closeCodeOnKill: number | null;
  stdinEnd: ReturnType<typeof vi.fn>;
  stdinWrite: ReturnType<typeof vi.fn>;
}> = {}) {
  const stdinEnd = overrides.stdinEnd ?? vi.fn();
  const stdinWrite = overrides.stdinWrite ?? vi.fn();
  const emitClose = overrides.emitClose ?? true;
  const closeCode = overrides.closeCode !== undefined ? overrides.closeCode : 0;
  const closeSignal = overrides.closeSignal ?? null;
  const killTriggersClose = overrides.killTriggersClose ?? false;
  const closeCodeOnKill = overrides.closeCodeOnKill ?? null;

  const handlers: Record<string, Array<(...args: any[]) => void>> = {};
  const emit = (event: string, ...args: unknown[]) => {
    for (const handler of handlers[event] ?? []) handler(...args);
  };

  const kill = vi.fn((signal?: string) => {
    if (killTriggersClose) {
      // Deterministic async terminal event — no real wait, no fake timers needed.
      queueMicrotask(() => emit('close', closeCodeOnKill, signal ?? null));
    }
  });

  const child: any = {
    stdin: { end: stdinEnd, write: stdinWrite },
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      (handlers[event] ??= []).push(cb);
      if (event === 'close' && emitClose && !killTriggersClose) {
        setTimeout(() => emit('close', closeCode, closeSignal), 10);
      }
      return child;
    }),
    kill,
    emit,
    handlers
  };

  return child;
}

/** Waits until the adapter has attached a listener for `event`. */
async function waitForHandler(child: any, event: string): Promise<void> {
  for (let i = 0; i < 200; i++) {
    if ((child.handlers[event] ?? []).length > 0) return;
    await new Promise((r) => setTimeout(r, 1));
  }
  throw new Error(`Adapter never registered a '${event}' handler`);
}

describe('CodexWorkerAdapter', () => {
  let adapter: CodexWorkerAdapter;
  let mockSpawn: any;

  beforeEach(() => {
    adapter = new CodexWorkerAdapter();
    mockSpawn = vi.spyOn(adapter as any, 'spawnProcess');
    mockSpawn.mockReturnValue(makeMockChild());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const baseTask: TaskPayload = {
    taskId: 'test-1',
    runId: 'run-1',
    projectRoot: 'D:\\test',
    files: [],
    instructions: 'test instruction'
  };

  describe('production args', () => {
    it('does not contain any dangerous or unsupported flag', async () => {
      const plan = await adapter.prepareExecutionPlan(baseTask, 'D:\\test');
      const joined = plan.args.join(' ');
      expect(joined).not.toContain('--dangerously-bypass-approvals-and-sandbox');
      expect(joined).not.toContain('--yolo');
      expect(joined).not.toContain('danger-full-access');
      expect(joined).not.toContain('--full-auto');
      // `codex exec` (codex-cli 0.145.0) rejects this flag outright — see 05ZLRT.
      expect(plan.args).not.toContain('--ask-for-approval');
    });

    it('contains exec, workspace-write sandbox, inline never-approval config, exact isolated workspace, JSON mode, and stdin sentinel', async () => {
      const workspaceRoot = 'D:\\test';
      const plan = await adapter.prepareExecutionPlan(baseTask, workspaceRoot);

      expect(plan.args).toContain('exec');
      expect(plan.args).toContain('--sandbox');
      expect(plan.args).toContain('workspace-write');
      expect(plan.args).toContain('-c');
      expect(plan.args).toContain('approval_policy="never"');
      expect(plan.args).toContain('--cd');
      expect(plan.args).toContain(workspaceRoot);
      expect(plan.args).toContain('--json');
      expect(plan.args[plan.args.length - 1]).toBe('-');
    });

    it('never places the task prompt directly in argv', async () => {
      const plan = await adapter.prepareExecutionPlan(baseTask, 'D:\\test');
      expect(plan.args).not.toContain(baseTask.instructions);
    });

    it('sets shell to false', async () => {
      const plan = await adapter.prepareExecutionPlan(baseTask, 'D:\\test');
      expect(plan.shell).toBe(false);
    });

    it('does not pass OPENAI_API_KEY / CODEX_API_KEY to the child process env', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      const originalCodexKey = process.env.CODEX_API_KEY;
      process.env.OPENAI_API_KEY = 'sk-should-not-leak';
      process.env.CODEX_API_KEY = 'codex-should-not-leak';

      try {
        const plan = await adapter.prepareExecutionPlan(baseTask, 'D:\\test');
        expect(plan.env?.OPENAI_API_KEY).toBeUndefined();
        expect(plan.env?.CODEX_API_KEY).toBeUndefined();
      } finally {
        if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
        else process.env.OPENAI_API_KEY = originalKey;
        if (originalCodexKey === undefined) delete process.env.CODEX_API_KEY;
        else process.env.CODEX_API_KEY = originalCodexKey;
      }
    });

    it('uses trusted executable and correct cwd', async () => {
      const workspaceRoot = 'D:\\test';
      const plan = await adapter.prepareExecutionPlan(baseTask, workspaceRoot);

      if (process.platform === 'win32') {
        expect(plan.command).toBe('node');
        expect(plan.args[0]).toMatch(/codex\.js$/);
      } else {
        expect(plan.command).toBe('codex');
      }
      expect(plan.cwd).toBe(workspaceRoot);
      expect(Array.isArray(plan.args)).toBe(true);
    });
  });

  it('rejects task with custom executable', async () => {
    const task: TaskPayload = { ...baseTask, executablePath: 'malicious.exe' };
    const validation = adapter.validateTask(task);
    expect(validation.valid).toBe(false);
    expect(validation.reason).toContain('Security Violation');
  });

  it('rejects task with custom flags', async () => {
    const task: TaskPayload = { ...baseTask, customFlags: ['--rm', '-rf', '/'] };
    const validation = adapter.validateTask(task);
    expect(validation.valid).toBe(false);
    expect(validation.reason).toContain('Security Violation');
  });

  it('delivers the prompt via stdin and closes stdin with EOF', async () => {
    const stdinWrite = vi.fn();
    const stdinEnd = vi.fn();
    mockSpawn.mockReturnValue(makeMockChild({ stdinWrite, stdinEnd, closeCode: 0 }));

    const result = await adapter.execute(baseTask, 'D:\\test');

    expect(stdinWrite).toHaveBeenCalledWith(baseTask.instructions);
    expect(stdinEnd).toHaveBeenCalled();
    // write must happen before end (EOF) for the prompt to be delivered intact
    const writeOrder = stdinWrite.mock.invocationCallOrder[0];
    const endOrder = stdinEnd.mock.invocationCallOrder[0];
    expect(writeOrder).toBeLessThan(endOrder);
    expect(result.status).toBe('SUCCESS');
  });

  it('returns SUCCESS on exit 0 with fail-closed diagnostics attached (new inline-config policy)', async () => {
    mockSpawn.mockReturnValue(makeMockChild({ closeCode: 0 }));

    const result = await adapter.execute(baseTask, 'D:\\test');

    expect(result.status).toBe('SUCCESS');
    expect(result.exitCode).toBe(0);
    expect(result.warnings).toContain('dangerousBypassUsed=false');
    expect(result.warnings).toContain('sandboxPolicy=workspace-write');
    expect(result.warnings).toContain('networkAccessEnabled=false');
    // The old flag-based label must never be asserted/emitted again.
    expect(result.warnings).toContain('approvalPolicy=never-via-inline-config');
    expect(result.warnings).not.toContain('approvalPolicy=never');
    expect(result.warnings).not.toContain('approvalPolicy=never-via-flag');
  });

  it('returns FAILED on non-zero exit', async () => {
    mockSpawn.mockReturnValue(makeMockChild({ closeCode: 1 }));

    const result = await adapter.execute(baseTask, 'D:\\test');

    expect(result.status).toBe('FAILED');
    expect(result.exitCode).toBe(1);
    expect(result.status).not.toBe('SUCCESS');
  });

  it('classifies a rejected CLI argument (e.g. the old --ask-for-approval failure) as a structured, labeled failure, never a dangerous retry', async () => {
    const child = makeMockChild({ closeCode: 2 });
    // Simulate the real clap rejection text observed in 05ZLS's live E2E run.
    child.stderr.on = vi.fn((event: string, cb: (data: Buffer) => void) => {
      if (event === 'data') {
        queueMicrotask(() => cb(Buffer.from("error: unexpected argument '--ask-for-approval' found\ncodex exec")));
      }
    });
    mockSpawn.mockReturnValue(child);

    const result = await adapter.execute(baseTask, 'D:\\test');

    expect(result.status).toBe('FAILED');
    expect(result.errors.some((e) => e.startsWith('CODEX_CLI_ARGUMENT_REJECTED:'))).toBe(true);
  });

  it('returns TIMEOUT when execution exceeds the timeout budget, proven via a real (mocked) terminal close event', async () => {
    const kill = vi.fn();
    mockSpawn.mockReturnValue(makeMockChild({ killTriggersClose: true, closeCodeOnKill: null }));

    const start = Date.now();
    const result = await adapter.execute(baseTask, 'D:\\test', { timeoutMs: 20 });
    const elapsedMs = Date.now() - start;

    expect(result.status).toBe('TIMEOUT');
    expect(result.status).not.toBe('SUCCESS');
    expect(result.errors.some((e) => e.startsWith('CODEX_TIMED_OUT:'))).toBe(true);
    // Proves the Promise resolved from the real terminal-event path (fast,
    // deterministic), not by hanging to Vitest's own default test timeout.
    expect(elapsedMs).toBeLessThan(4000);
  });

  it('verifies kill(SIGKILL) was actually invoked on timeout', async () => {
    const child = makeMockChild({ killTriggersClose: true, closeCodeOnKill: null });
    mockSpawn.mockReturnValue(child);

    await adapter.execute(baseTask, 'D:\\test', { timeoutMs: 20 });

    expect(child.kill).toHaveBeenCalledWith('SIGKILL');
  });

  it('returns CANCELLED when cancel() is invoked mid-execution, not SUCCESS/FAILED', async () => {
    const child = makeMockChild({ emitClose: false, killTriggersClose: true, closeCodeOnKill: null });
    mockSpawn.mockReturnValue(child);

    const executePromise = adapter.execute(baseTask, 'D:\\test', { timeoutMs: 180000 });

    // Allow spawnProcess to be invoked and runId registered before cancelling.
    await new Promise((r) => setTimeout(r, 5));
    const cancelled = await adapter.cancel(baseTask.runId);
    expect(cancelled).toBe(true);
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');

    const result = await executePromise;
    expect(result.status).toBe('CANCELLED');
    expect(result.status).not.toBe('SUCCESS');
    expect(result.status).not.toBe('FAILED');
    expect(result.errors.some((e) => e.startsWith('CODEX_CANCELLED:'))).toBe(true);
  });

  it('does not perform an automatic dangerous-mode retry after failure', async () => {
    mockSpawn.mockReturnValue(makeMockChild({ closeCode: 1 }));

    await adapter.execute(baseTask, 'D:\\test');

    expect(mockSpawn).toHaveBeenCalledTimes(1);
    const [, args] = mockSpawn.mock.calls[0];
    expect(args.join(' ')).not.toContain('--dangerously-bypass-approvals-and-sandbox');
    expect(args).not.toContain('--ask-for-approval');
  });

  it('does not perform an automatic dangerous-mode retry after timeout', async () => {
    mockSpawn.mockReturnValue(makeMockChild({ killTriggersClose: true, closeCodeOnKill: null }));

    await adapter.execute(baseTask, 'D:\\test', { timeoutMs: 20 });

    expect(mockSpawn).toHaveBeenCalledTimes(1);
  });

  it('does not perform an automatic dangerous-mode retry after cancellation', async () => {
    const child = makeMockChild({ emitClose: false, killTriggersClose: true, closeCodeOnKill: null });
    mockSpawn.mockReturnValue(child);

    const executePromise = adapter.execute(baseTask, 'D:\\test', { timeoutMs: 180000 });
    await new Promise((r) => setTimeout(r, 5));
    await adapter.cancel(baseTask.runId);
    await executePromise;

    expect(mockSpawn).toHaveBeenCalledTimes(1);
  });

  // ─── Terminal-state precedence regressions (Phase 06B) ─────────────────

  describe('terminal-state precedence', () => {
    it('null exit code without cancellation or timeout => FAILED, never coerced to 0', async () => {
      mockSpawn.mockReturnValue(makeMockChild({ closeCode: null, closeSignal: null }));

      const result = await adapter.execute(baseTask, 'D:\\test');

      expect(result.status).toBe('FAILED');
      expect(result.status).not.toBe('SUCCESS');
      expect(result.exitCode).not.toBe(0);
      expect(result.terminalReason).toBe('NO_EXIT_CODE');
    });

    it('signal-only close (null exit + SIGKILL) => FAILED, never SUCCESS', async () => {
      mockSpawn.mockReturnValue(makeMockChild({ closeCode: null, closeSignal: 'SIGKILL' }));

      const result = await adapter.execute(baseTask, 'D:\\test');

      expect(result.status).toBe('FAILED');
      expect(result.status).not.toBe('SUCCESS');
      expect(result.terminalReason).toBe('NO_EXIT_CODE');
      expect(result.terminalSignal).toBe('SIGKILL');
    });

    it('SUCCESS is gated on a strict exit code of 0 and nothing else', async () => {
      const cases: Array<{ code: number | null; signal: string | null; expected: string }> = [
        { code: 0, signal: null, expected: 'SUCCESS' },
        { code: 1, signal: null, expected: 'FAILED' },
        { code: 2, signal: null, expected: 'FAILED' },
        { code: null, signal: null, expected: 'FAILED' },
        { code: null, signal: 'SIGTERM', expected: 'FAILED' }
      ];

      for (const testCase of cases) {
        const localAdapter = new CodexWorkerAdapter();
        const spy = vi.spyOn(localAdapter as any, 'spawnProcess');
        spy.mockReturnValue(makeMockChild({ closeCode: testCase.code, closeSignal: testCase.signal }));

        const result = await localAdapter.execute(baseTask, 'D:\\test');
        expect(
          result.status,
          `exitCode=${testCase.code} signal=${testCase.signal}`
        ).toBe(testCase.expected);
      }
    });

    it('cancellation followed by a later timeout stays CANCELLED', async () => {
      const child = makeMockChild({ emitClose: false });
      mockSpawn.mockReturnValue(child);

      const promise = adapter.execute(baseTask, 'D:\\test', { timeoutMs: 15 });
      await waitForHandler(child, 'close');

      await adapter.cancel(baseTask.runId);
      await new Promise((r) => setTimeout(r, 45));
      child.emit('close', null, 'SIGKILL');

      const result = await promise;
      expect(result.status).toBe('CANCELLED');
      expect(result.status).not.toBe('TIMEOUT');
      expect(result.terminalReason).toBe('CANCELLED_BY_OWNER');
    });

    it('timeout followed by a later close(0) stays TIMEOUT', async () => {
      const child = makeMockChild({ emitClose: false });
      mockSpawn.mockReturnValue(child);

      const promise = adapter.execute(baseTask, 'D:\\test', { timeoutMs: 15 });
      await waitForHandler(child, 'close');

      await new Promise((r) => setTimeout(r, 45));
      child.emit('close', 0, null);

      const result = await promise;
      expect(result.status).toBe('TIMEOUT');
      expect(result.status).not.toBe('SUCCESS');
    });

    it('a duplicate close event produces exactly one terminal result', async () => {
      const child = makeMockChild({ emitClose: false });
      mockSpawn.mockReturnValue(child);

      const promise = adapter.execute(baseTask, 'D:\\test', { timeoutMs: 180000 });
      await waitForHandler(child, 'close');

      child.emit('close', 0, null);
      child.emit('close', 1, null);

      const result = await promise;
      expect(result.status).toBe('SUCCESS');
      expect(result.exitCode).toBe(0);
      expect(await promise).toBe(result);
    });

    it('a spawn error, then a late close, produces exactly one FAILED result', async () => {
      const child = makeMockChild({ emitClose: false });
      mockSpawn.mockReturnValue(child);

      const promise = adapter.execute(baseTask, 'D:\\test', { timeoutMs: 180000 });
      await waitForHandler(child, 'error');

      child.emit('error', new Error('spawn ENOENT'));
      child.emit('close', 0, null);

      const result = await promise;
      expect(result.status).toBe('FAILED');
      expect(result.terminalReason).toBe('SPAWN_ERROR');
      expect(await promise).toBe(result);
    });

    it('emits non-secret structured terminal diagnostics', async () => {
      mockSpawn.mockReturnValue(makeMockChild({ closeCode: 3 }));

      const result = await adapter.execute(baseTask, 'D:\\test');

      expect(result.warnings).toContain('terminalReason=NON_ZERO_EXIT_CODE');
      expect(result.warnings).toContain('exitCode=3');
      expect(result.warnings).toContain('cancelRequested=false');
      expect(result.warnings).toContain('timedOut=false');
      // Sandbox fail-closed diagnostics are preserved alongside them.
      expect(result.warnings).toContain('sandboxPolicy=workspace-write');
      expect(result.warnings).toContain('dangerousBypassUsed=false');
    });
  });
});
