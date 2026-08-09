import { describe, it, expect, beforeAll } from 'vitest';
import { ProcessRunner } from '../process-runner';
import { DaemonRegistry } from '../registry';
import path from 'path';

describe('ProcessRunner (Phase 04 Security Requirements)', () => {
  beforeAll(() => {
    // Ensure we have a mock executable for tests
    DaemonRegistry.register({
      id: 'TEST_ECHO',
      resolvedPath: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
      allowedArguments: [/\/c/, /echo/, /-c/],
      allowedCwdRoots: [process.cwd()],
      environmentProfile: 'MINIMAL',
      maxRuntime: 5000
    });
  });

  it('enforces shell: false and strictly blocks shell injection attempts', async () => {
    const isWindows = process.platform === 'win32';
    // We try to inject an execution of a secondary command using shell characters
    const args = isWindows 
      ? ['/c', 'echo "Hello" && echo "HACKED"']
      : ['-c', 'echo "Hello" && echo "HACKED"'];

    try {
      await ProcessRunner.executeSafe({
        executableId: 'TEST_ECHO',
        resolvedPath: isWindows ? 'cmd.exe' : '/bin/sh',
        args: args,
        cwd: process.cwd(),
        environmentProfile: 'MINIMAL',
        timeoutMs: 5000
      });
      // The validator should throw BEFORE executing
      expect(true).toBe(false); 
    } catch (e: any) {
      expect(e.message).toMatch(/Disallowed shell character detected/);
    }
  });

  it('runs valid processes successfully and isolates environment', async () => {
    const isWindows = process.platform === 'win32';
    // Valid arguments with NO shell metacharacters
    const args = isWindows 
      ? ['/c', 'echo Hello']
      : ['-c', 'echo Hello'];

    const result = await ProcessRunner.executeSafe({
      executableId: 'TEST_ECHO',
      resolvedPath: isWindows ? 'cmd.exe' : '/bin/sh',
      args: args,
      cwd: process.cwd(),
      environmentProfile: 'MINIMAL',
      timeoutMs: 5000
    });

    expect(result.status).toBe('succeeded');
    expect(result.stdout).toContain('Hello');
  });

  it('terminates process on timeout', async () => {
    const isWindows = process.platform === 'win32';
    const result = await ProcessRunner.executeSafe({
      executableId: 'TEST_SLEEP',
      resolvedPath: isWindows ? 'ping' : 'sleep',
      args: isWindows ? ['127.0.0.1', '-n', '10'] : ['10'],
      cwd: process.cwd(),
      environmentProfile: 'MINIMAL',
      timeoutMs: 100 // Force immediate timeout
    });

    expect(result.status).toBe('timeout');
    expect(result.exitCode).toBeNull();
  });
});

