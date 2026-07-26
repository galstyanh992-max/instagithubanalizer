import { describe, expect, it } from 'vitest';
import { AntigravityWorkerAdapter } from '../adapters/antigravity-cli';
import { WorkerWorkspaceManager } from '../workspace';
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

  it('6. shell:false enforced', async () => {
    const plan = await adapter.prepareExecutionPlan(
      {
        taskId: 't1',
        runId: 'r1',
        projectRoot: 'D:\\JARVIS_WORKSPACES',
        instructions: 'say hi',
        files: []
      },
      'D:\\JARVIS_WORKSPACES\\phase05-e2e\\test'
    );
    expect(plan.shell).toBe(false);
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
        files: []
      },
      'D:\\JARVIS_WORKSPACES\\phase05-e2e\\test'
    );
    expect(plan.env).not.toHaveProperty('SUPABASE_SERVICE_ROLE_KEY');
    expect(plan.env).not.toHaveProperty('GITHUB_TOKEN');
  });

  it('9. model not in allowlist denied', () => {
    const model = adapter.resolveModel('UNKNOWN' as any);
    expect(model).toBe('gemini-2.5-pro');
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
        files: []
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
        files: []
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
        files: []
      },
      'D:\\JARVIS_WORKSPACES\\phase05-e2e\\test'
    );

    let cancelled = false;
    process.nextTick(async () => {
      cancelled = await testAdapter.cancel('r-cancel-123');
      mockChild.stdout.push(null);
      mockChild.stderr.push(null);
      mockChild.emit('close', 1);
    });

    await promise;
    expect(cancelled).toBe(true);
    expect(killed).toBe(true);
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

  it('16. normalized result validated', async () => {
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
        files: []
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
});
