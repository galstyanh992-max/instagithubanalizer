import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { CodexAppServerClient } from '../app-server-client';
import { CodexProcessRunner } from '../process-runner';
import type { CodexNormalizedEvent } from '../types';

class ScriptedRunner extends CodexProcessRunner {
  readonly child = createChild();

  override async spawn(): Promise<ChildProcessWithoutNullStreams> {
    let input = '';
    this.child.stdin.on('data', (chunk) => {
      input += chunk.toString();
      while (input.includes('\n')) {
        const newline = input.indexOf('\n');
        const message = JSON.parse(input.slice(0, newline)) as { id?: number; method: string };
        input = input.slice(newline + 1);
        if (message.id) {
          (this.child.stdout as PassThrough).write(`${JSON.stringify({
            id: message.id,
            result: message.method === 'model/list' ? { data: [{ id: 'dynamic', model: 'dynamic' }] } : {},
          })}\n`);
        }
      }
    });
    return this.child;
  }
}

describe('Codex app-server protocol client', () => {
  it('handshakes, correlates requests, and normalizes streamed messages', async () => {
    const runner = new ScriptedRunner();
    const events: CodexNormalizedEvent[] = [];
    const client = new CodexAppServerClient(runner, (event) => events.push(event));

    await client.start();
    expect(client.isReady()).toBe(true);
    await expect(client.request('model/list', {})).resolves.toEqual({
      data: [{ id: 'dynamic', model: 'dynamic' }],
    });

    (runner.child.stdout as PassThrough).write(`${JSON.stringify({
      method: 'item/agentMessage/delta',
      params: { threadId: 'thread-1', turnId: 'turn-1', itemId: 'item-1', delta: 'hello' },
    })}\n`);
    (runner.child.stdout as PassThrough).write(`${JSON.stringify({
      id: 99,
      method: 'item/commandExecution/requestApproval',
      params: { threadId: 'thread-1', turnId: 'turn-1', itemId: 'item-2', command: 'npm test' },
    })}\n`);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(events).toContainEqual(expect.objectContaining({ type: 'ITEM_DELTA', textDelta: 'hello' }));
    expect(events).toContainEqual(expect.objectContaining({ type: 'APPROVAL_REQUIRED' }));
    client.stop();
  });
});

function createChild(): ChildProcessWithoutNullStreams {
  const emitter = new EventEmitter() as EventEmitter & {
    stdin: PassThrough;
    stdout: PassThrough;
    stderr: PassThrough;
    killed: boolean;
    kill: () => boolean;
  };
  emitter.stdin = new PassThrough();
  emitter.stdout = new PassThrough();
  emitter.stderr = new PassThrough();
  emitter.killed = false;
  emitter.kill = () => {
    emitter.killed = true;
    emitter.emit('close', 0, null);
    return true;
  };
  return emitter as unknown as ChildProcessWithoutNullStreams;
}
