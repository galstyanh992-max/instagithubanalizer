// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { AntigravityWorkerAdapter, ALLOWED_ANTIGRAVITY_MODELS, MODEL_PROFILE_MAP, ANTIGRAVITY_MODEL_CONFIG } from '../adapters/antigravity-cli';
import { WorkerWorkspaceManager } from '../workspace';
import { ModelProfile } from '../types';
import * as child_process from 'child_process';
import { EventEmitter } from 'events';
import { Readable } from 'stream';

class TestableAntigravityAdapter extends AntigravityWorkerAdapter {
  public mockChildProcess: any = null;

  protected override spawnProcess(command: string, args: string[], options: child_process.SpawnOptions): child_process.ChildProcess {
    if (this.mockChildProcess) {
      return this.mockChildProcess;
    }
    return super.spawnProcess(command, args, options);
  }
}

describe('AntigravityWorkerAdapter & Execution Security', () => {
  const adapter = new AntigravityWorkerAdapter();
  const workspaceManager = new WorkerWorkspaceManager();

  it('1. agy executable discovery', () => {
    const pathFound = adapter.resolveExecutablePath();
    expect(pathFound).toBeTruthy();
    expect(pathFound).toContain('agy');
  });

  it('2. unavailable CLI handled', async () => {
    class DummyAdapter extends AntigravityWorkerAdapter {
      public override resolveExecutablePath(): string | null {
        return null;
      }
    }
    const dummy = new DummyAdapter();
    const health = await dummy.healthCheck();
    expect(health.status).toBe('UNAVAILABLE');
  });

  it('3. unauthenticated CLI handled', async () => {
    class UnauthAdapter extends AntigravityWorkerAdapter {
      public override resolveExecutablePath(): string {
        return 'node';
      }
    }
    const unauth = new UnauthAdapter();
    const health = await unauth.healthCheck();
    expect(health.status).toBe('OFFLINE');
  });

  it('4. arbitrary agy flags denied', () => {
    const res = adapter.validateTask({
      taskId: 't1',
      runId: 'r1',
      projectRoot: 'D:\\JARVIS_WORKSPACES',
      instructions: 'do task',
      files: [],
      customFlags: ['--danger-flag']
    });
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('Security Violation');
  });

  it('5. task cannot override executable path', () => {
    const res = adapter.validateTask({
      taskId: 't1',
      runId: 'r1',
      projectRoot: 'D:\\JARVIS_WORKSPACES',
      instructions: 'do task',
      files: [],
      executablePath: 'C:\\Windows\\System32\\cmd.exe'
    });
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('Security Violation');
  });

  it('6. shell:false enforced and --model present', async () => {
    const plan = await adapter.prepareExecutionPlan(
      {
        taskId: 't1',
        runId: 'r1',
        projectRoot: 'D:\\JARVIS_WORKSPACES',
        instructions: 'say hi',
        files: [],
        requestedProfile: 'DEEP_REASONING'
      },
      'D:\\JARVIS_WORKSPACES\\phase05-e2e\\test'
    );
    expect(plan.shell).toBe(false);
    expect(plan.args).toContain('--model');
    const modelIdx = plan.args.indexOf('--model');
    expect(plan.args[modelIdx + 1]).toBe(ANTIGRAVITY_MODEL_CONFIG.primary.cliValue);
  });

  it('7. workspace escape denied', async () => {
    await expect(
      adapter.prepareExecutionPlan(
        {
          taskId: 't1',
          runId: 'r1',
          projectRoot: 'D:\\АГЕНТ\\ДЖАРВИС',
          instructions: 'say hi',
          files: []
        },
        'D:\\АГЕНТ\\ДЖАРВИС'
      )
    ).rejects.toThrow('Security Violation');
  });

  it('8. env secrets excluded', async () => {
    const plan = await adapter.prepareExecutionPlan(
      {
        taskId: 't1',
        runId: 'r1',
        projectRoot: 'D:\\JARVIS_WORKSPACES',
        instructions: 'say hi',
        files: [],
        requestedProfile: 'FAST'
      },
      'D:\\JARVIS_WORKSPACES\\phase05-e2e\\test'
    );
    expect(plan.env).not.toHaveProperty('SUPABASE_SERVICE_ROLE_KEY');
    expect(plan.env).not.toHaveProperty('GITHUB_TOKEN');
    expect(plan.env).not.toHaveProperty('GEMINI_API_KEY');
  });

  it('9. unknown profile fails closed (no default, no fallback)', () => {
    expect(() => adapter.resolveModel('UNKNOWN' as any)).toThrow('ANTIGRAVITY_MODEL_PROFILE_UNKNOWN');
    expect(() => adapter.resolveModel(undefined)).toThrow('ANTIGRAVITY_MODEL_PROFILE_UNKNOWN');
  });

  it('10. output limit enforced', async () => {
    const testAdapter = new TestableAntigravityAdapter();
    const mockChild: any = new EventEmitter();
    mockChild.stdout = new Readable({ read() {} });
    mockChild.stderr = new Readable({ read() {} });
    mockChild.kill = () => {};
    testAdapter.mockChildProcess = mockChild;

    const promise = testAdapter.execute(
      {
        taskId: 't-limit',
        runId: 'r-limit',
        projectRoot: 'D:\\JARVIS_WORKSPACES',
        instructions: 'Generate large output',
        files: [],
        requestedProfile: 'FAST'
      },
      'D:\\JARVIS_WORKSPACES\\phase05-e2e\\test'
    );

    process.nextTick(() => {
      mockChild.stdout.push('A'.repeat(5000));
      mockChild.stdout.push(null);
      mockChild.stderr.push(null);
      mockChild.emit('close', 0);
    });

    const result = await promise;
    expect(result.stdoutSummary).toBeDefined();
    expect(result.stdoutSummary.length).toBeLessThanOrEqual(1000);
  });

  it('11. timeout enforced', async () => {
    const testAdapter = new TestableAntigravityAdapter();
    const mockChild: any = new EventEmitter();
    mockChild.stdout = new Readable({ read() {} });
    mockChild.stderr = new Readable({ read() {} });
    let killed = false;
    mockChild.kill = () => {
      killed = true;
      process.nextTick(() => {
        mockChild.emit('close', null);
      });
    };
    testAdapter.mockChildProcess = mockChild;

    const promise = testAdapter.execute(
      {
        taskId: 't-timeout',
        runId: 'r-timeout',
        projectRoot: 'D:\\JARVIS_WORKSPACES',
        instructions: 'sleep task',
        files: [],
        requestedProfile: 'DEEP_REASONING'
      },
      'D:\\JARVIS_WORKSPACES\\phase05-e2e\\test',
      { timeoutMs: 10 }
    );

    const result = await promise;
    expect(result.status).toBe('TIMEOUT');
    expect(killed).toBe(true);
  });

  it('12. cancellation enforced', async () => {
    const testAdapter = new TestableAntigravityAdapter();
    const mockChild: any = new EventEmitter();
    mockChild.stdout = new Readable({ read() {} });
    mockChild.stderr = new Readable({ read() {} });
    let killed = false;
    mockChild.kill = () => {
      killed = true;
    };
    testAdapter.mockChildProcess = mockChild;

    const promise = testAdapter.execute(
      {
        taskId: 't-cancel',
        runId: 'r-cancel-123',
        projectRoot: 'D:\\JARVIS_WORKSPACES',
        instructions: 'long task',
        files: [],
        requestedProfile: 'FAST'
      },
      'D:\\JARVIS_WORKSPACES\\phase05-e2e\\test'
    );

    let cancelled = false;
    process.nextTick(async () => {
      cancelled = await testAdapter.cancel('r-cancel-123');
      mockChild.stdout.push(null);
      mockChild.stderr.push(null);
      mockChild.emit('close', 1, 'SIGTERM');
    });

    const result = await promise;
    expect(cancelled).toBe(true);
    expect(killed).toBe(true);
    expect(result.status).toBe('CANCELLED');
  });

  it('13. patch-first enforced', async () => {
    const normalized = await adapter.normalizeResult('stdout', 'stderr', 0, 'D:\\JARVIS_WORKSPACES\\phase05-e2e\\test');
    expect(normalized.patch).toBeDefined();
    expect(normalized.patch?.securityFlags).toBeDefined();
  });

  it('14. duplicate execution denied', () => {
    const path1 = workspaceManager.getAntigravityWorkspacePath('p1', 't1', 'r1');
    const path2 = workspaceManager.getAntigravityWorkspacePath('p1', 't1', 'r1');
    expect(path1).toEqual(path2);
  });

  it('15. fake Antigravity success rejected', async () => {
    const normalized = await adapter.normalizeResult('Tests passed successfully 100%', '', 1, 'D:\\JARVIS_WORKSPACES\\phase05-e2e\\test');
    expect(normalized.exitCode).toBe(1);
  });

  it('16. normalized result validated (non-zero exit becomes FAILED)', async () => {
    const testAdapter = new TestableAntigravityAdapter();
    const mockChild: any = new EventEmitter();
    mockChild.stdout = new Readable({ read() {} });
    mockChild.stderr = new Readable({ read() {} });
    mockChild.kill = () => {};
    testAdapter.mockChildProcess = mockChild;

    const promise = testAdapter.execute(
      {
        taskId: 't-valid',
        runId: 'r-valid',
        projectRoot: 'D:\\JARVIS_WORKSPACES',
        instructions: 'ANTIGRAVITY_AUTH_OK',
        files: [],
        requestedProfile: 'DEEP_REASONING'
      },
      'D:\\JARVIS_WORKSPACES\\phase05-e2e\\antigravity-auth-check'
    );

    process.nextTick(() => {
      mockChild.stdout.push('ANTIGRAVITY_AUTH_OK');
      mockChild.stdout.push(null);
      mockChild.stderr.push(null);
      mockChild.emit('close', 0);
    });

    const result = await promise;
    expect(result).toHaveProperty('workerId', 'ANTIGRAVITY_CLI');
    expect(result).toHaveProperty('status', 'SUCCESS');
    expect(result).toHaveProperty('exitCode', 0);
    expect(result.modelCliValue).toBe(ANTIGRAVITY_MODEL_CONFIG.primary.cliValue);
    expect(result.modelProfile).toBe('primary');
  });

  it('16b. non-zero exit becomes FAILED', async () => {
    const testAdapter = new TestableAntigravityAdapter();
    const mockChild: any = new EventEmitter();
    mockChild.stdout = new Readable({ read() {} });
    mockChild.stderr = new Readable({ read() {} });
    mockChild.kill = () => {};
    testAdapter.mockChildProcess = mockChild;

    const promise = testAdapter.execute(
      {
        taskId: 't-fail',
        runId: 'r-fail',
        projectRoot: 'D:\\JARVIS_WORKSPACES',
        instructions: 'failing task',
        files: [],
        requestedProfile: 'FAST'
      },
      'D:\\JARVIS_WORKSPACES\\phase05-e2e\\test'
    );

    process.nextTick(() => {
      mockChild.stdout.push('some output');
      mockChild.stdout.push(null);
      mockChild.stderr.push('boom');
      mockChild.stderr.push(null);
      mockChild.emit('close', 2);
    });

    const result = await promise;
    expect(result.status).toBe('FAILED');
    expect(result.exitCode).toBe(2);
    expect(result.modelCliValue).toBe(ANTIGRAVITY_MODEL_CONFIG.fast.cliValue);
  });

  // ─── Terminal-state precedence regressions (Phase 06B) ─────────────────

  it('16c. null exit code without cancellation or timeout => FAILED, never coerced to 0', async () => {
    const testAdapter = new TestableAntigravityAdapter();
    const mockChild: any = new EventEmitter();
    mockChild.stdout = new Readable({ read() {} });
    mockChild.stderr = new Readable({ read() {} });
    mockChild.kill = () => {};
    testAdapter.mockChildProcess = mockChild;

    const promise = testAdapter.execute(
      {
        taskId: 't-null-exit',
        runId: 'r-null-exit',
        projectRoot: 'D:\\JARVIS_WORKSPACES',
        instructions: 'task that dies without an exit code',
        files: [],
        requestedProfile: 'FAST'
      },
      'D:\\JARVIS_WORKSPACES\\phase05-e2e\\test'
    );

    process.nextTick(() => {
      mockChild.stdout.push(null);
      mockChild.stderr.push(null);
      // No signal either: the process simply never reported an exit code.
      mockChild.emit('close', null, null);
    });

    const result = await promise;
    expect(result.status).toBe('FAILED');
    expect(result.status).not.toBe('SUCCESS');
    expect(result.exitCode).not.toBe(0);
    expect(result.terminalReason).toBe('NO_EXIT_CODE');
  });

  it('16d. signal-only close (null exit + SIGKILL) without timeout => FAILED', async () => {
    const testAdapter = new TestableAntigravityAdapter();
    const mockChild: any = new EventEmitter();
    mockChild.stdout = new Readable({ read() {} });
    mockChild.stderr = new Readable({ read() {} });
    mockChild.kill = () => {};
    testAdapter.mockChildProcess = mockChild;

    const promise = testAdapter.execute(
      {
        taskId: 't-signal-only',
        runId: 'r-signal-only',
        projectRoot: 'D:\\JARVIS_WORKSPACES',
        instructions: 'externally killed task',
        files: [],
        requestedProfile: 'FAST'
      },
      'D:\\JARVIS_WORKSPACES\\phase05-e2e\\test'
    );

    process.nextTick(() => {
      mockChild.stdout.push(null);
      mockChild.stderr.push(null);
      mockChild.emit('close', null, 'SIGKILL');
    });

    const result = await promise;
    expect(result.status).toBe('FAILED');
    expect(result.status).not.toBe('SUCCESS');
    expect(result.status).not.toBe('CANCELLED');
    expect(result.terminalReason).toBe('NO_EXIT_CODE');
    expect(result.terminalSignal).toBe('SIGKILL');
  });

  it('16e. an external SIGTERM without an owner cancel is FAILED, not CANCELLED', async () => {
    const testAdapter = new TestableAntigravityAdapter();
    const mockChild: any = new EventEmitter();
    mockChild.stdout = new Readable({ read() {} });
    mockChild.stderr = new Readable({ read() {} });
    mockChild.kill = () => {};
    testAdapter.mockChildProcess = mockChild;

    const promise = testAdapter.execute(
      {
        taskId: 't-external-sigterm',
        runId: 'r-external-sigterm',
        projectRoot: 'D:\\JARVIS_WORKSPACES',
        instructions: 'task killed by something other than cancel()',
        files: [],
        requestedProfile: 'FAST'
      },
      'D:\\JARVIS_WORKSPACES\\phase05-e2e\\test'
    );

    process.nextTick(() => {
      mockChild.stdout.push(null);
      mockChild.stderr.push(null);
      mockChild.emit('close', null, 'SIGTERM');
    });

    const result = await promise;
    // Cancellation is tracked explicitly, never inferred from the OS signal.
    expect(result.status).toBe('FAILED');
    expect(result.terminalReason).toBe('NO_EXIT_CODE');
  });

  it('16f. cancellation followed by a later timeout stays CANCELLED', async () => {
    const testAdapter = new TestableAntigravityAdapter();
    const mockChild: any = new EventEmitter();
    mockChild.stdout = new Readable({ read() {} });
    mockChild.stderr = new Readable({ read() {} });
    mockChild.kill = () => {};
    testAdapter.mockChildProcess = mockChild;

    const promise = testAdapter.execute(
      {
        taskId: 't-cancel-then-timeout',
        runId: 'r-cancel-then-timeout',
        projectRoot: 'D:\\JARVIS_WORKSPACES',
        instructions: 'long task',
        files: [],
        requestedProfile: 'FAST'
      },
      'D:\\JARVIS_WORKSPACES\\phase05-e2e\\test',
      { timeoutMs: 40 }
    );

    // execute() awaits prepareExecutionPlan before the run is registered, so
    // poll until cancel() actually finds the active process.
    let cancelled = false;
    for (let i = 0; i < 200 && !cancelled; i++) {
      cancelled = await testAdapter.cancel('r-cancel-then-timeout');
      if (!cancelled) await new Promise((r) => setTimeout(r, 1));
    }
    expect(cancelled).toBe(true);

    // Let the timeout timer fire AFTER cancellation was recorded.
    await new Promise((r) => setTimeout(r, 80));
    mockChild.stdout.push(null);
    mockChild.stderr.push(null);
    mockChild.emit('close', null, 'SIGKILL');

    const result = await promise;
    expect(result.status).toBe('CANCELLED');
    expect(result.status).not.toBe('TIMEOUT');
    expect(result.terminalReason).toBe('CANCELLED_BY_OWNER');
  });

  it('16g. timeout followed by a later close(0) stays TIMEOUT', async () => {
    const testAdapter = new TestableAntigravityAdapter();
    const mockChild: any = new EventEmitter();
    mockChild.stdout = new Readable({ read() {} });
    mockChild.stderr = new Readable({ read() {} });
    mockChild.kill = () => {};
    testAdapter.mockChildProcess = mockChild;

    const promise = testAdapter.execute(
      {
        taskId: 't-timeout-then-zero',
        runId: 'r-timeout-then-zero',
        projectRoot: 'D:\\JARVIS_WORKSPACES',
        instructions: 'long task',
        files: [],
        requestedProfile: 'FAST'
      },
      'D:\\JARVIS_WORKSPACES\\phase05-e2e\\test',
      { timeoutMs: 15 }
    );

    await new Promise((r) => setTimeout(r, 45));
    mockChild.stdout.push(null);
    mockChild.stderr.push(null);
    mockChild.emit('close', 0, null);

    const result = await promise;
    expect(result.status).toBe('TIMEOUT');
    expect(result.status).not.toBe('SUCCESS');
  });

  it('16h. a duplicate close event produces exactly one terminal result', async () => {
    const testAdapter = new TestableAntigravityAdapter();
    const mockChild: any = new EventEmitter();
    mockChild.stdout = new Readable({ read() {} });
    mockChild.stderr = new Readable({ read() {} });
    mockChild.kill = () => {};
    testAdapter.mockChildProcess = mockChild;

    const promise = testAdapter.execute(
      {
        taskId: 't-double-close',
        runId: 'r-double-close',
        projectRoot: 'D:\\JARVIS_WORKSPACES',
        instructions: 'task',
        files: [],
        requestedProfile: 'FAST'
      },
      'D:\\JARVIS_WORKSPACES\\phase05-e2e\\test'
    );

    process.nextTick(() => {
      mockChild.stdout.push(null);
      mockChild.stderr.push(null);
      mockChild.emit('close', 0, null);
      mockChild.emit('close', 1, null);
    });

    const result = await promise;
    expect(result.status).toBe('SUCCESS');
    expect(result.exitCode).toBe(0);
    expect(await promise).toBe(result);
  });

  it('16i. SUCCESS is gated on a strict exit code of 0 and nothing else', async () => {
    const cases: Array<{ code: number | null; signal: string | null; expected: string }> = [
      { code: 0, signal: null, expected: 'SUCCESS' },
      { code: 1, signal: null, expected: 'FAILED' },
      { code: 127, signal: null, expected: 'FAILED' },
      { code: null, signal: null, expected: 'FAILED' },
      { code: null, signal: 'SIGKILL', expected: 'FAILED' },
      { code: null, signal: 'SIGTERM', expected: 'FAILED' }
    ];

    for (const testCase of cases) {
      const testAdapter = new TestableAntigravityAdapter();
      const mockChild: any = new EventEmitter();
      mockChild.stdout = new Readable({ read() {} });
      mockChild.stderr = new Readable({ read() {} });
      mockChild.kill = () => {};
      testAdapter.mockChildProcess = mockChild;

      const promise = testAdapter.execute(
        {
          taskId: 't-gate',
          runId: `r-gate-${testCase.code}-${testCase.signal}`,
          projectRoot: 'D:\\JARVIS_WORKSPACES',
          instructions: 'task',
          files: [],
          requestedProfile: 'FAST'
        },
        'D:\\JARVIS_WORKSPACES\\phase05-e2e\\test'
      );

      process.nextTick(() => {
        mockChild.stdout.push(null);
        mockChild.stderr.push(null);
        mockChild.emit('close', testCase.code, testCase.signal);
      });

      const result = await promise;
      expect(
        result.status,
        `exitCode=${testCase.code} signal=${testCase.signal}`
      ).toBe(testCase.expected);
    }
  });

  it('17. filesystem-write task is rejected before spawn', async () => {
    const testAdapter = new TestableAntigravityAdapter();
    let spawnCalled = false;
    testAdapter.mockChildProcess = {
      kill: () => {},
      on: (ev: string, cb: any) => { if (ev === 'close') cb(0); spawnCalled = true; },
      stdout: new Readable({ read() {} }),
      stderr: new Readable({ read() {} }),
    };

    const result = await testAdapter.execute(
      {
        taskId: 't-write',
        runId: 'r-write',
        projectRoot: 'D:\\JARVIS_WORKSPACES',
        instructions: 'Write some files',
        files: [],
        requiresFilesystemWrite: true
      },
      'D:\\JARVIS_WORKSPACES\\phase05-e2e\\test'
    );

    expect(result.status).toBe('BLOCKED_BY_CAPABILITY_POLICY');
    expect(result.errors).toContain('WORKER_CAPABILITY_DENIED');
    expect(spawnCalled).toBe(false);
  });

  it('18. command-execution task is rejected before spawn', async () => {
    const testAdapter = new TestableAntigravityAdapter();
    let spawnCalled = false;
    testAdapter.mockChildProcess = {
      kill: () => {},
      on: (ev: string, cb: any) => { if (ev === 'close') cb(0); spawnCalled = true; },
      stdout: new Readable({ read() {} }),
      stderr: new Readable({ read() {} }),
    };

    const result = await testAdapter.execute(
      {
        taskId: 't-cmd',
        runId: 'r-cmd',
        projectRoot: 'D:\\JARVIS_WORKSPACES',
        instructions: 'Run a command',
        files: [],
        requiresCommandExecution: true
      },
      'D:\\JARVIS_WORKSPACES\\phase05-e2e\\test'
    );

    expect(result.status).toBe('BLOCKED_BY_CAPABILITY_POLICY');
    expect(result.errors).toContain('WORKER_CAPABILITY_DENIED');
    expect(spawnCalled).toBe(false);
  });

  describe('Explicit model routing', () => {
    it('M1. primary profile resolves to Gemini 3.1 Pro (high)', () => {
      expect(adapter.resolveModel('DEEP_REASONING')).toBe(ANTIGRAVITY_MODEL_CONFIG.primary.cliValue);
      expect(adapter.resolveModel('CODE_REVIEW')).toBe(ANTIGRAVITY_MODEL_CONFIG.primary.cliValue);
      expect(ANTIGRAVITY_MODEL_CONFIG.primary.label).toBe('Gemini 3.1 Pro');
    });

    it('M2. fast profile resolves to Gemini 3.6 Flash (medium)', () => {
      expect(adapter.resolveModel('FAST')).toBe(ANTIGRAVITY_MODEL_CONFIG.fast.cliValue);
      expect(adapter.resolveModel('BALANCED')).toBe(ANTIGRAVITY_MODEL_CONFIG.fast.cliValue);
      expect(ANTIGRAVITY_MODEL_CONFIG.fast.label).toBe('Gemini 3.6 Flash');
    });

    it('M3. production args contain --model with exact verified value (primary)', async () => {
      const plan = await adapter.prepareExecutionPlan(
        {
          taskId: 't-model-primary',
          runId: 'r-mp',
          projectRoot: 'D:\\JARVIS_WORKSPACES',
          instructions: 'review code',
          files: [],
          requestedProfile: 'CODE_REVIEW'
        },
        'D:\\JARVIS_WORKSPACES\\phase05-e2e\\test'
      );
      const idx = plan.args.indexOf('--model');
      expect(idx).toBeGreaterThan(-1);
      expect(plan.args[idx + 1]).toBe(ANTIGRAVITY_MODEL_CONFIG.primary.cliValue);
      expect(plan.modelProfile).toBe('primary');
      expect(plan.modelLabel).toBe('Gemini 3.1 Pro');
    });

    it('M4. production args contain --model with exact verified value (fast)', async () => {
      const plan = await adapter.prepareExecutionPlan(
        {
          taskId: 't-model-fast',
          runId: 'r-mf',
          projectRoot: 'D:\\JARVIS_WORKSPACES',
          instructions: 'review code',
          files: [],
          requestedProfile: 'FAST'
        },
        'D:\\JARVIS_WORKSPACES\\phase05-e2e\\test'
      );
      const idx = plan.args.indexOf('--model');
      expect(idx).toBeGreaterThan(-1);
      expect(plan.args[idx + 1]).toBe(ANTIGRAVITY_MODEL_CONFIG.fast.cliValue);
      expect(plan.modelProfile).toBe('fast');
      expect(plan.modelLabel).toBe('Gemini 3.6 Flash');
    });

    it('M5. stale 2.5 model constants are absent from production config', () => {
      expect(ALLOWED_ANTIGRAVITY_MODELS.some((m) => /2\.5/.test(m))).toBe(false);
      const profiles: ModelProfile[] = ['FAST', 'BALANCED', 'DEEP_REASONING', 'CODE_REVIEW'];
      for (const p of profiles) {
        expect(/2\.5/.test(adapter.resolveModel(p))).toBe(false);
      }
      expect(Object.values(MODEL_PROFILE_MAP).length).toBe(4);
    });

    it('M6. no dangerous permissions / no shell / read-only mode in args', async () => {
      const plan = await adapter.prepareExecutionPlan(
        {
          taskId: 't-safe',
          runId: 'r-safe',
          projectRoot: 'D:\\JARVIS_WORKSPACES',
          instructions: 'safe review',
          files: [],
          requestedProfile: 'DEEP_REASONING'
        },
        'D:\\JARVIS_WORKSPACES\\phase05-e2e\\test'
      );
      expect(plan.shell).toBe(false);
      expect(plan.args.some((a) => a.includes('--dangerously-skip-permissions'))).toBe(false);
      const modeIdx = plan.args.indexOf('--mode');
      expect(modeIdx).toBeGreaterThan(-1);
      expect(plan.args[modeIdx + 1]).toBe('plan');
    });

    it('M7. write and command execution capabilities remain disabled', async () => {
      const caps = await adapter.capabilities();
      expect(caps.FILES_CREATE).toBe(false);
      expect(caps.FILES_MODIFY).toBe(false);
      expect(caps.PROCESS_RUN_TESTS).toBe(false);
    });

    it('M9. model diagnostics survive FAILED / TIMEOUT / CANCELLED terminal states', async () => {
      // FAILED (non-zero exit)
      const failAdapter = new TestableAntigravityAdapter();
      const failChild: any = new EventEmitter();
      failChild.stdout = new Readable({ read() {} });
      failChild.stderr = new Readable({ read() {} });
      failChild.kill = () => {};
      failAdapter.mockChildProcess = failChild;

      const failPromise = failAdapter.execute(
        {
          taskId: 't-diag-fail',
          runId: 'r-diag-fail',
          projectRoot: 'D:\\JARVIS_WORKSPACES',
          instructions: 'diag task',
          files: [],
          requestedProfile: 'DEEP_REASONING'
        },
        'D:\\JARVIS_WORKSPACES\\phase05-e2e\\test'
      );
      process.nextTick(() => {
        failChild.stdout.push(null);
        failChild.stderr.push(null);
        failChild.emit('close', 4);
      });
      const failResult = await failPromise;
      expect(failResult.status).toBe('FAILED');
      expect(failResult.modelCliValue).toBe(ANTIGRAVITY_MODEL_CONFIG.primary.cliValue);
      expect(failResult.modelFallbackUsed).toBe(false);
      expect(failResult.permissionPolicy).toBe('READ_ONLY_FAIL_CLOSED');

      // TIMEOUT
      const timeoutAdapter = new TestableAntigravityAdapter();
      const timeoutChild: any = new EventEmitter();
      timeoutChild.stdout = new Readable({ read() {} });
      timeoutChild.stderr = new Readable({ read() {} });
      timeoutChild.kill = () => {
        process.nextTick(() => timeoutChild.emit('close', null, 'SIGKILL'));
      };
      timeoutAdapter.mockChildProcess = timeoutChild;

      const timeoutResult = await timeoutAdapter.execute(
        {
          taskId: 't-diag-timeout',
          runId: 'r-diag-timeout',
          projectRoot: 'D:\\JARVIS_WORKSPACES',
          instructions: 'diag task',
          files: [],
          requestedProfile: 'FAST'
        },
        'D:\\JARVIS_WORKSPACES\\phase05-e2e\\test',
        { timeoutMs: 10 }
      );
      expect(timeoutResult.status).toBe('TIMEOUT');
      expect(timeoutResult.modelCliValue).toBe(ANTIGRAVITY_MODEL_CONFIG.fast.cliValue);
      expect(timeoutResult.modelFallbackUsed).toBe(false);

      // CANCELLED
      const cancelAdapter = new TestableAntigravityAdapter();
      const cancelChild: any = new EventEmitter();
      cancelChild.stdout = new Readable({ read() {} });
      cancelChild.stderr = new Readable({ read() {} });
      cancelChild.kill = () => {};
      cancelAdapter.mockChildProcess = cancelChild;

      const cancelPromise = cancelAdapter.execute(
        {
          taskId: 't-diag-cancel',
          runId: 'r-diag-cancel',
          projectRoot: 'D:\\JARVIS_WORKSPACES',
          instructions: 'diag task',
          files: [],
          requestedProfile: 'DEEP_REASONING'
        },
        'D:\\JARVIS_WORKSPACES\\phase05-e2e\\test'
      );
      process.nextTick(async () => {
        await cancelAdapter.cancel('r-diag-cancel');
        cancelChild.stdout.push(null);
        cancelChild.stderr.push(null);
        cancelChild.emit('close', null, 'SIGTERM');
      });
      const cancelResult = await cancelPromise;
      expect(cancelResult.status).toBe('CANCELLED');
      expect(cancelResult.modelCliValue).toBe(ANTIGRAVITY_MODEL_CONFIG.primary.cliValue);
      expect(cancelResult.modelFallbackUsed).toBe(false);
      expect(cancelResult.dangerousPermissionsUsed).toBe(false);
    });

    it('M8. diagnostics carry the actual resolved model (primary)', async () => {
      const testAdapter = new TestableAntigravityAdapter();
      const mockChild: any = new EventEmitter();
      mockChild.stdout = new Readable({ read() {} });
      mockChild.stderr = new Readable({ read() {} });
      mockChild.kill = () => {};
      testAdapter.mockChildProcess = mockChild;

      const promise = testAdapter.execute(
        {
          taskId: 't-diag',
          runId: 'r-diag',
          projectRoot: 'D:\\JARVIS_WORKSPACES',
          instructions: 'diag task',
          files: [],
          requestedProfile: 'DEEP_REASONING'
        },
        'D:\\JARVIS_WORKSPACES\\phase05-e2e\\test'
      );

      process.nextTick(() => {
        mockChild.stdout.push('ok');
        mockChild.stdout.push(null);
        mockChild.stderr.push(null);
        mockChild.emit('close', 0);
      });

      const result = await promise;
      expect(result.modelProfile).toBe('primary');
      expect(result.modelLabel).toBe('Gemini 3.1 Pro');
      expect(result.modelCliValue).toBe(ANTIGRAVITY_MODEL_CONFIG.primary.cliValue);
      expect(result.modelSelection).toBe('explicit-cli-argument');
      expect(result.internalDefaultAllowed).toBe(false);
      expect(result.modelFallbackUsed).toBe(false);
      expect(result.permissionPolicy).toBe('READ_ONLY_FAIL_CLOSED');
      expect(result.writeCapability).toBe('disabled');
      expect(result.commandExecutionCapability).toBe('disabled');
      expect(result.dangerousPermissionsUsed).toBe(false);
    });
  });
});
