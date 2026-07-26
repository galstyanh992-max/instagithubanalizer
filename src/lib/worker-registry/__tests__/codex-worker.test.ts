import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CodexWorkerAdapter } from '../adapters/codex-cli';
import * as child_process from 'child_process';
import { TaskPayload } from '../types';

vi.mock('child_process');
vi.mock('fs');

describe('CodexWorkerAdapter', () => {
  let adapter: CodexWorkerAdapter;
  let mockSpawn: any;

  beforeEach(() => {
    adapter = new CodexWorkerAdapter();
    mockSpawn = vi.spyOn(adapter as any, 'spawnProcess');
    
    // Mock child process returned by spawn
    mockSpawn.mockReturnValue({
      stdin: { end: vi.fn() },
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
        if (event === 'close') {
          setTimeout(() => cb(0), 10);
        }
      }),
      kill: vi.fn()
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uses trusted executable and shell=false', async () => {
    const task: TaskPayload = {
      taskId: 'test-1',
      runId: 'run-1',
      projectRoot: 'D:\\test',
      files: [],
      instructions: 'test instruction'
    };
    const workspaceRoot = 'D:\\test';
    
    const plan = await adapter.prepareExecutionPlan(task, workspaceRoot);
    
    if (process.platform === 'win32') {
      expect(plan.command).toBe('node');
      expect(plan.args[0]).toMatch(/codex\.js$/);
    } else {
      expect(plan.command).toBe('codex');
    }
    expect(plan.shell).toBe(false);
    expect(plan.cwd).toBe(workspaceRoot);
    expect(Array.isArray(plan.args)).toBe(true);
  });

  it('rejects task with custom executable', async () => {
    const task: TaskPayload = {
      taskId: 'test-1',
      runId: 'run-1',
      projectRoot: 'D:\\test',
      files: [],
      instructions: 'test',
      executablePath: 'malicious.exe'
    };
    const validation = adapter.validateTask(task);
    expect(validation.valid).toBe(false);
    expect(validation.reason).toContain('Security Violation');
  });

  it('rejects task with custom flags', async () => {
    const task: TaskPayload = {
      taskId: 'test-1',
      runId: 'run-1',
      projectRoot: 'D:\\test',
      files: [],
      instructions: 'test',
      customFlags: ['--rm', '-rf', '/']
    };
    const validation = adapter.validateTask(task);
    expect(validation.valid).toBe(false);
    expect(validation.reason).toContain('Security Violation');
  });

  it('closes stdin and returns SUCCESS on exit 0', async () => {
    const task: TaskPayload = {
      taskId: 'test-1',
      runId: 'run-1',
      projectRoot: 'D:\\test',
      files: [],
      instructions: 'test'
    };
    
    const mockStdinEnd = vi.fn();
    mockSpawn.mockReturnValue({
      stdin: { end: mockStdinEnd },
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
        if (event === 'close') {
          setTimeout(() => cb(0), 10);
        }
      }),
      kill: vi.fn()
    });

    const result = await adapter.execute(task, 'D:\\test');
    
    expect(mockStdinEnd).toHaveBeenCalled();
    expect(result.status).toBe('SUCCESS');
    expect(result.exitCode).toBe(0);
  });

  it('returns FAILED on non-zero exit', async () => {
    const task: TaskPayload = {
      taskId: 'test-1',
      runId: 'run-1',
      projectRoot: 'D:\\test',
      files: [],
      instructions: 'test'
    };
    
    mockSpawn.mockReturnValue({
      stdin: { end: vi.fn() },
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
        if (event === 'close') {
          setTimeout(() => cb(1), 10);
        }
      }),
      kill: vi.fn()
    });

    const result = await adapter.execute(task, 'D:\\test');
    
    expect(result.status).toBe('FAILED');
    expect(result.exitCode).toBe(1);
  });
});
