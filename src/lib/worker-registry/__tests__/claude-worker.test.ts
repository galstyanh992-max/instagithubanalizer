// @vitest-environment node
//
// Claude Code worker — terminal-state correctness suite (Phase 06B).
//
// These tests exist to prove one property above all others: the adapter can
// return SUCCESS **only** when the child process really exited with a
// confirmed exit code of strictly 0, with no cancellation, no timeout and no
// spawn error. Every other terminal path must surface as CANCELLED,
// TIMEOUT or FAILED — never SUCCESS.
//
// The mock child process models the real Node lifecycle: kill() does not
// resolve anything by itself; a terminal 'close' event is delivered
// asynchronously (via queueMicrotask / explicit emit), exactly as the OS
// would deliver it after SIGTERM/SIGKILL. This keeps the suite deterministic
// and fast without relying on Vitest's own timeout to end a hung promise.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClaudeCodeWorkerAdapter } from '@/local-runtime/worker-registry/adapters/claude-code';
import { TaskPayload } from '../types';

vi.mock('child_process');
vi.mock('fs');

type Handler = (...args: any[]) => void;

interface MockChildOptions {
  /** Emit a 'close' event on its own as soon as the handler is registered. */
  autoClose?: { code: number | null; signal?: string | null } | null;
  /** Emit a 'close' event asynchronously when kill() is called. */
  killTriggersClose?: { code: number | null; signal?: string | null } | null;
}

function makeMockChild(options: MockChildOptions = {}) {
  const handlers: Record<string, Handler[]> = {};
  const stdinEnd = vi.fn();
  const stdinWrite = vi.fn();

  const emit = (event: string, ...args: unknown[]) => {
    for (const handler of handlers[event] ?? []) {
      handler(...args);
    }
  };

  const kill = vi.fn((signal?: string) => {
    const spec = options.killTriggersClose;
    if (spec) {
      // Deterministic asynchronous terminal event — mirrors the OS delivering
      // 'close' some time after the signal, never synchronously inside kill().
      queueMicrotask(() => emit('close', spec.code, spec.signal ?? signal ?? null));
    }
  });

  const child: any = {
    stdin: { end: stdinEnd, write: stdinWrite },
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn((event: string, cb: Handler) => {
      (handlers[event] ??= []).push(cb);
      if (event === 'close' && options.autoClose) {
        const spec = options.autoClose;
        queueMicrotask(() => emit('close', spec.code, spec.signal ?? null));
      }
      return child;
    }),
    kill,
    emit,
    handlers,
    stdinEnd,
    stdinWrite
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('ClaudeCodeWorkerAdapter', () => {
  let adapter: ClaudeCodeWorkerAdapter;
  let mockSpawn: any;

  const baseTask: TaskPayload = {
    taskId: 'test-1',
    runId: 'run-1',
    projectRoot: 'D:\\test',
    files: [],
    instructions: 'test instruction'
  };

  beforeEach(() => {
    adapter = new ClaudeCodeWorkerAdapter();
    mockSpawn = vi.spyOn(adapter as any, 'spawnProcess');
    mockSpawn.mockReturnValue(makeMockChild({ autoClose: { code: 0 } }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ─── Execution plan / invocation contract ──────────────────────────────

  it('16. uses the trusted executable with shell=false and the expected args', async () => {
    const plan = await adapter.prepareExecutionPlan(baseTask, 'D:\\test');

    expect(plan.command).toBe(process.platform === 'win32' ? 'claude.exe' : 'claude');
    expect(plan.shell).toBe(false);
    expect(plan.cwd).toBe('D:\\test');
    expect(plan.args).toEqual([
      '--safe-mode',
      '-p',
      'test instruction',
      '--no-session-persistence',
      '--permission-mode',
      'bypassPermissions',
      '--setting-sources',
      'project'
    ]);
  });

  it('16b. spawns with shell=false and piped stdio', async () => {
    await adapter.execute(baseTask, 'D:\\test');

    const [, , spawnOptions] = mockSpawn.mock.calls[0];
    expect(spawnOptions.shell).toBe(false);
    expect(spawnOptions.stdio).toEqual(['pipe', 'pipe', 'pipe']);
  });

  it('15. no API-key fallback: Anthropic credentials are stripped from the child env', async () => {
    const saved = {
      key: process.env.ANTHROPIC_API_KEY,
      claudeKey: process.env.CLAUDE_API_KEY,
      baseUrl: process.env.ANTHROPIC_BASE_URL
    };
    process.env.ANTHROPIC_API_KEY = 'sk-should-not-leak';
    process.env.CLAUDE_API_KEY = 'claude-should-not-leak';
    process.env.ANTHROPIC_BASE_URL = 'https://should-not-leak.invalid';

    try {
      const plan = await adapter.prepareExecutionPlan(baseTask, 'D:\\test');
      expect(plan.env?.ANTHROPIC_API_KEY).toBeUndefined();
      expect(plan.env?.CLAUDE_API_KEY).toBeUndefined();
      expect(plan.env?.ANTHROPIC_BASE_URL).toBeUndefined();
    } finally {
      if (saved.key === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = saved.key;
      if (saved.claudeKey === undefined) delete process.env.CLAUDE_API_KEY;
      else process.env.CLAUDE_API_KEY = saved.claudeKey;
      if (saved.baseUrl === undefined) delete process.env.ANTHROPIC_BASE_URL;
      else process.env.ANTHROPIC_BASE_URL = saved.baseUrl;
    }
  });

  it('17. closes stdin with EOF so the CLI never waits for input', async () => {
    const child = makeMockChild({ autoClose: { code: 0 } });
    mockSpawn.mockReturnValue(child);

    await adapter.execute(baseTask, 'D:\\test');

    expect(child.stdinEnd).toHaveBeenCalledTimes(1);
  });

  it('rejects a task that tries to override the executable', () => {
    const validation = adapter.validateTask({ ...baseTask, executablePath: 'malicious.exe' });
    expect(validation.valid).toBe(false);
    expect(validation.reason).toContain('Security Violation');
  });

  it('rejects a task that tries to inject CLI flags', () => {
    const validation = adapter.validateTask({ ...baseTask, customFlags: ['--rm', '-rf', '/'] });
    expect(validation.valid).toBe(false);
    expect(validation.reason).toContain('Security Violation');
  });

  // ─── Terminal-state classification ─────────────────────────────────────

  it('1. exit code 0 => SUCCESS', async () => {
    mockSpawn.mockReturnValue(makeMockChild({ autoClose: { code: 0 } }));

    const result = await adapter.execute(baseTask, 'D:\\test');

    expect(result.status).toBe('SUCCESS');
    expect(result.exitCode).toBe(0);
    expect(result.terminalReason).toBe('EXIT_CODE_ZERO');
    expect(result.errors).toEqual([]);
  });

  it('2. non-zero exit => FAILED', async () => {
    mockSpawn.mockReturnValue(makeMockChild({ autoClose: { code: 1 } }));

    const result = await adapter.execute(baseTask, 'D:\\test');

    expect(result.status).toBe('FAILED');
    expect(result.status).not.toBe('SUCCESS');
    expect(result.exitCode).toBe(1);
    expect(result.terminalReason).toBe('NON_ZERO_EXIT_CODE');
  });

  it('3. null exit code without cancellation => FAILED, never coerced to 0', async () => {
    mockSpawn.mockReturnValue(makeMockChild({ autoClose: { code: null, signal: null } }));

    const result = await adapter.execute(baseTask, 'D:\\test');

    expect(result.status).toBe('FAILED');
    expect(result.status).not.toBe('SUCCESS');
    expect(result.exitCode).not.toBe(0);
    expect(result.terminalReason).toBe('NO_EXIT_CODE');
  });

  it('4. signal-only close (null exit + SIGKILL) => FAILED, never SUCCESS', async () => {
    mockSpawn.mockReturnValue(makeMockChild({ autoClose: { code: null, signal: 'SIGKILL' } }));

    const result = await adapter.execute(baseTask, 'D:\\test');

    expect(result.status).toBe('FAILED');
    expect(result.status).not.toBe('SUCCESS');
    expect(result.terminalReason).toBe('NO_EXIT_CODE');
    expect(result.terminalSignal).toBe('SIGKILL');
  });

  it('5. spawn error => FAILED', async () => {
    const child = makeMockChild();
    mockSpawn.mockReturnValue(child);

    const promise = adapter.execute(baseTask, 'D:\\test');
    await waitForHandler(child, 'error');
    child.emit('error', new Error('ENOENT: claude not found'));

    const result = await promise;
    expect(result.status).toBe('FAILED');
    expect(result.status).not.toBe('SUCCESS');
    expect(result.terminalReason).toBe('SPAWN_ERROR');
    expect(result.errors[0]).toContain('ENOENT');
  });

  it('6. timeout => TIMEOUT (never SUCCESS) and SIGKILL is actually sent', async () => {
    const child = makeMockChild({ killTriggersClose: { code: null, signal: 'SIGKILL' } });
    mockSpawn.mockReturnValue(child);

    const start = Date.now();
    const result = await adapter.execute(baseTask, 'D:\\test', { timeoutMs: 20 });
    const elapsed = Date.now() - start;

    expect(result.status).toBe('TIMEOUT');
    expect(result.status).not.toBe('SUCCESS');
    expect(result.terminalReason).toBe('TIMED_OUT');
    expect(child.kill).toHaveBeenCalledWith('SIGKILL');
    // Proves resolution came from the real terminal-event path, not a hang.
    expect(elapsed).toBeLessThan(4000);
  });

  it('7. cancellation => CANCELLED (never SUCCESS/FAILED)', async () => {
    const child = makeMockChild({ killTriggersClose: { code: null, signal: 'SIGTERM' } });
    mockSpawn.mockReturnValue(child);

    const promise = adapter.execute(baseTask, 'D:\\test', { timeoutMs: 180000 });
    await waitForHandler(child, 'close');

    const cancelled = await adapter.cancel(baseTask.runId);
    expect(cancelled).toBe(true);
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');

    const result = await promise;
    expect(result.status).toBe('CANCELLED');
    expect(result.status).not.toBe('SUCCESS');
    expect(result.status).not.toBe('FAILED');
    expect(result.terminalReason).toBe('CANCELLED_BY_OWNER');
  });

  it('8. cancellation followed by close(null, SIGTERM) => CANCELLED', async () => {
    const child = makeMockChild();
    mockSpawn.mockReturnValue(child);

    const promise = adapter.execute(baseTask, 'D:\\test', { timeoutMs: 180000 });
    await waitForHandler(child, 'close');

    await adapter.cancel(baseTask.runId);
    child.emit('close', null, 'SIGTERM');

    const result = await promise;
    expect(result.status).toBe('CANCELLED');
    expect(result.exitCode).toBe(-1);
    expect(result.terminalReason).toBe('CANCELLED_BY_OWNER');
  });

  it('9. cancellation then a later timeout => still CANCELLED (cancellation wins)', async () => {
    const child = makeMockChild();
    mockSpawn.mockReturnValue(child);

    const promise = adapter.execute(baseTask, 'D:\\test', { timeoutMs: 15 });
    await waitForHandler(child, 'close');

    await adapter.cancel(baseTask.runId);
    // Let the timeout timer actually fire before the terminal close arrives.
    await sleep(45);
    child.emit('close', null, 'SIGKILL');

    const result = await promise;
    expect(result.status).toBe('CANCELLED');
    expect(result.status).not.toBe('TIMEOUT');
    expect(result.terminalReason).toBe('CANCELLED_BY_OWNER');
  });

  it('10. timeout then a later close(0) => still TIMEOUT (exit 0 cannot rescue it)', async () => {
    const child = makeMockChild();
    mockSpawn.mockReturnValue(child);

    const promise = adapter.execute(baseTask, 'D:\\test', { timeoutMs: 15 });
    await waitForHandler(child, 'close');

    await sleep(45);
    child.emit('close', 0, null);

    const result = await promise;
    expect(result.status).toBe('TIMEOUT');
    expect(result.status).not.toBe('SUCCESS');
    expect(result.terminalReason).toBe('TIMED_OUT');
  });

  // ─── Single-finalization guarantee ─────────────────────────────────────

  it('11. a duplicate close event produces exactly one terminal result', async () => {
    const child = makeMockChild();
    mockSpawn.mockReturnValue(child);

    const promise = adapter.execute(baseTask, 'D:\\test', { timeoutMs: 180000 });
    await waitForHandler(child, 'close');

    child.emit('close', 0, null);
    child.emit('close', 1, null);
    child.emit('close', null, 'SIGKILL');

    const first = await promise;
    // The Promise resolved from the FIRST close only; later events cannot
    // downgrade or otherwise mutate the already-final result.
    expect(first.status).toBe('SUCCESS');
    expect(first.exitCode).toBe(0);
    expect(await promise).toBe(first);
  });

  it('12. error followed by close produces exactly one FAILED result', async () => {
    const child = makeMockChild();
    mockSpawn.mockReturnValue(child);

    const promise = adapter.execute(baseTask, 'D:\\test', { timeoutMs: 180000 });
    await waitForHandler(child, 'error');

    child.emit('error', new Error('spawn EACCES'));
    child.emit('close', 0, null);

    const result = await promise;
    expect(result.status).toBe('FAILED');
    expect(result.status).not.toBe('SUCCESS');
    expect(result.terminalReason).toBe('SPAWN_ERROR');
    expect(await promise).toBe(result);
  });

  it('12b. close followed by a late error keeps the original terminal result', async () => {
    const child = makeMockChild();
    mockSpawn.mockReturnValue(child);

    const promise = adapter.execute(baseTask, 'D:\\test', { timeoutMs: 180000 });
    await waitForHandler(child, 'error');

    child.emit('close', 2, null);
    child.emit('error', new Error('late error'));

    const result = await promise;
    expect(result.status).toBe('FAILED');
    expect(result.exitCode).toBe(2);
    expect(result.terminalReason).toBe('NON_ZERO_EXIT_CODE');
  });

  it('13. cancellation bookkeeping is released, so a later run with the same runId is unaffected', async () => {
    const cancelChild = makeMockChild({ killTriggersClose: { code: null, signal: 'SIGTERM' } });
    mockSpawn.mockReturnValue(cancelChild);

    const cancelledPromise = adapter.execute(baseTask, 'D:\\test', { timeoutMs: 180000 });
    await waitForHandler(cancelChild, 'close');
    await adapter.cancel(baseTask.runId);
    expect((await cancelledPromise).status).toBe('CANCELLED');

    // Repeated cancel for a run that no longer exists must be a no-op and must
    // not re-arm any cancellation state.
    expect(await adapter.cancel(baseTask.runId)).toBe(false);

    mockSpawn.mockReturnValue(makeMockChild({ autoClose: { code: 0 } }));
    const second = await adapter.execute(baseTask, 'D:\\test');
    expect(second.status).toBe('SUCCESS');
  });

  it('14. the timeout timer is cleared once the run is finalized', async () => {
    const child = makeMockChild({ autoClose: { code: 0 } });
    mockSpawn.mockReturnValue(child);

    const result = await adapter.execute(baseTask, 'D:\\test', { timeoutMs: 25 });
    expect(result.status).toBe('SUCCESS');
    expect(child.kill).not.toHaveBeenCalled();

    // Well past the timeout budget: a leaked timer would have fired kill() by now.
    await sleep(70);
    expect(child.kill).not.toHaveBeenCalled();
  });

  // ─── SUCCESS is not hardcoded ──────────────────────────────────────────

  it('18. SUCCESS is not hardcoded: only a strict exit code of 0 yields SUCCESS', async () => {
    const cases: Array<{ code: number | null; signal: string | null; expected: string }> = [
      { code: 0, signal: null, expected: 'SUCCESS' },
      { code: 1, signal: null, expected: 'FAILED' },
      { code: 2, signal: null, expected: 'FAILED' },
      { code: 127, signal: null, expected: 'FAILED' },
      { code: -1, signal: null, expected: 'FAILED' },
      { code: null, signal: null, expected: 'FAILED' },
      { code: null, signal: 'SIGKILL', expected: 'FAILED' },
      { code: null, signal: 'SIGTERM', expected: 'FAILED' }
    ];

    for (const testCase of cases) {
      const localAdapter = new ClaudeCodeWorkerAdapter();
      const spy = vi.spyOn(localAdapter as any, 'spawnProcess');
      spy.mockReturnValue(makeMockChild({ autoClose: { code: testCase.code, signal: testCase.signal } }));

      const result = await localAdapter.execute(baseTask, 'D:\\test');
      expect(
        result.status,
        `exitCode=${testCase.code} signal=${testCase.signal}`
      ).toBe(testCase.expected);
    }
  });

  it('18b. structured terminal diagnostics are emitted and carry no secrets', async () => {
    mockSpawn.mockReturnValue(makeMockChild({ autoClose: { code: 3, signal: null } }));

    const result = await adapter.execute(baseTask, 'D:\\test');

    expect(result.warnings).toContain('terminalReason=NON_ZERO_EXIT_CODE');
    expect(result.warnings).toContain('exitCode=3');
    expect(result.warnings).toContain('signal=null');
    expect(result.warnings).toContain('cancelRequested=false');
    expect(result.warnings).toContain('timedOut=false');
    const joined = result.warnings.join(' ');
    expect(joined).not.toMatch(/sk-|ANTHROPIC_API_KEY|CLAUDE_API_KEY/);
  });
});
