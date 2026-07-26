import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClaudeCodeWorkerAdapter } from '../adapters/claude-code';
import * as child_process from 'child_process';
import { TaskPayload } from '../types';

vi.mock('child_process');
vi.mock('fs');

describe('ClaudeCodeWorkerAdapter', () => {
  let adapter: ClaudeCodeWorkerAdapter;
  let mockSpawn: any;

  beforeEach(() => {
    adapter = new ClaudeCodeWorkerAdapter();
    mockSpawn = vi.spyOn(adapter as any, 'spawnProcess');
    
    // Mock child process returned by spawn
    mockSpawn.mockReturnValue({
      stdin: { end: vi.fn() },
      stdout: { on: vi.fn(), pipe: vi.fn() },
      stderr: { on: vi.fn(), pipe: vi.fn() },
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

  it('uses trusted executable and shell=false with proper args and stdio', async () => {
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
      expect(plan.command).toBe('claude.exe');
    } else {
      expect(plan.command).toBe('claude');
    }
    
    expect(plan.shell).toBe(false);
    expect(plan.cwd).toBe(workspaceRoot);
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

  it('spawns process with stdio array having pipe stdin', async () => {
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
    
    // stdio passed to spawnProcess should be ["ignore", "pipe", "pipe"]
    const spawnCallOptions = mockSpawn.mock.calls[0][2];
    expect(spawnCallOptions.stdio).toEqual(['pipe', 'pipe', 'pipe']);
    
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
