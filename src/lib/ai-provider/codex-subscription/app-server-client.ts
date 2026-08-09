import readline from 'node:readline';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { CodexProcessRunner } from './process-runner';
import { CodexProviderError, type CodexNormalizedEvent } from './types';
import { redactCodexText, sanitizeCodexValue } from './redaction';

type JsonObject = Record<string, unknown>;
type PendingRequest = {
  resolve: (value: JsonObject) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export class CodexAppServerClient {
  private child: ChildProcessWithoutNullStreams | null = null;
  private pending = new Map<number, PendingRequest>();
  private approvalRequests = new Map<string | number, { method: string; params: JsonObject }>();
  private requestId = 0;
  private sequence = 0;
  private initialized = false;
  private starting: Promise<void> | null = null;
  private stderr = '';

  constructor(
    private readonly runner: CodexProcessRunner,
    private readonly onEvent: (event: CodexNormalizedEvent) => void,
  ) {}

  isReady(): boolean {
    return this.initialized && this.child !== null && !this.child.killed;
  }

  async start(): Promise<void> {
    if (this.isReady()) return;
    if (this.starting) return this.starting;
    this.starting = this.startInternal().finally(() => {
      this.starting = null;
    });
    return this.starting;
  }

  private async startInternal(): Promise<void> {
    const child = await this.runner.spawn(['app-server', '--stdio']);
    this.child = child;
    this.stderr = '';

    const lines = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
    lines.on('line', (line) => this.handleLine(line));
    child.stderr.on('data', (chunk: Buffer) => {
      this.stderr = redactCodexText((this.stderr + chunk.toString('utf8')).slice(-8_000), 8_000);
    });
    child.once('error', (error) => this.handleTermination(`App-server failed to start: ${error.message}`));
    child.once('close', (code, signal) => this.handleTermination(`App-server exited (${code ?? 'unknown'}/${signal ?? 'none'}).`));

    try {
      await this.request('initialize', {
        clientInfo: { name: 'jarvis', title: 'JARVIS', version: '0.2.0' },
        capabilities: { experimentalApi: true },
      }, 15_000);
      this.notify('initialized', {});
      this.initialized = true;
    } catch (error) {
      this.stop();
      throw error;
    }
  }

  async request(method: string, params: JsonObject, timeoutMs = 30_000): Promise<JsonObject> {
    if (method !== 'initialize') await this.start();
    if (!this.child?.stdin.writable) throw new CodexProviderError('PROCESS_FAILED', 'Codex app-server is not writable.', true);
    if (this.pending.size >= 100) throw new CodexProviderError('RATE_LIMITED', 'Too many pending Codex app-server requests.', true);

    const id = ++this.requestId;
    return new Promise<JsonObject>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new CodexProviderError('PROCESS_FAILED', `${method} timed out.`, true));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.write({ id, method, params });
    });
  }

  notify(method: string, params: JsonObject): void {
    this.write({ method, params });
  }

  private write(message: JsonObject): void {
    if (!this.child?.stdin.writable) throw new CodexProviderError('PROCESS_FAILED', 'Codex app-server is not running.', true);
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  private handleLine(line: string): void {
    if (line.length > 1_000_000) {
      this.handleTermination('App-server emitted an oversized protocol line.');
      this.stop();
      return;
    }

    let message: JsonObject;
    try {
      message = JSON.parse(line) as JsonObject;
    } catch {
      return;
    }

    const id = message.id;
    if ((typeof id === 'number' || typeof id === 'string') && ('result' in message || 'error' in message)) {
      const numericId = typeof id === 'number' ? id : Number(id);
      const pending = this.pending.get(numericId);
      if (!pending) return;
      clearTimeout(pending.timer);
      this.pending.delete(numericId);
      if (message.error) {
        const safe = sanitizeCodexValue(message.error) as JsonObject;
        pending.reject(this.protocolError(safe));
      } else {
        pending.resolve((message.result as JsonObject | undefined) ?? {});
      }
      return;
    }

    const method = typeof message.method === 'string' ? message.method : '';
    const params = (message.params && typeof message.params === 'object' ? message.params : {}) as JsonObject;
    if ((typeof id === 'number' || typeof id === 'string') && method) {
      if (this.approvalRequests.size < 100) this.approvalRequests.set(id, { method, params });
      this.onEvent(this.normalizeApproval(id, method, params));
      return;
    }
    if (method) this.onEvent(this.normalizeNotification(method, params));
  }

  private protocolError(error: JsonObject): CodexProviderError {
    const message = redactCodexText(typeof error.message === 'string' ? error.message : 'Codex app-server request failed.');
    const lower = message.toLowerCase();
    if (lower.includes('rate') && lower.includes('limit')) return new CodexProviderError('RATE_LIMITED', message, true);
    if (lower.includes('model') && (lower.includes('not found') || lower.includes('unavailable'))) {
      return new CodexProviderError('MODEL_UNAVAILABLE', message);
    }
    if (lower.includes('permission') || lower.includes('denied')) return new CodexProviderError('PERMISSION_DENIED', message);
    return new CodexProviderError('PROCESS_FAILED', message, true);
  }

  private normalizeApproval(id: string | number, method: string, params: JsonObject): CodexNormalizedEvent {
    const reason = typeof params.reason === 'string'
      ? redactCodexText(params.reason, 500)
      : typeof params.command === 'string'
        ? 'Codex requested approval for a command.'
        : 'Codex requested user approval.';
    return {
      sequence: ++this.sequence,
      type: 'APPROVAL_REQUIRED',
      threadId: stringField(params, 'threadId'),
      turnId: stringField(params, 'turnId'),
      itemId: stringField(params, 'itemId'),
      approval: { requestId: id, method, reason },
      timestamp: Date.now(),
    };
  }

  private normalizeNotification(method: string, params: JsonObject): CodexNormalizedEvent {
    const mapping: Record<string, CodexNormalizedEvent['type']> = {
      'thread/started': 'THREAD_STARTED',
      'turn/started': 'TURN_STARTED',
      'item/started': 'ITEM_STARTED',
      'item/agentMessage/delta': 'ITEM_DELTA',
      'item/reasoning/textDelta': 'ITEM_DELTA',
      'item/completed': 'ITEM_COMPLETED',
      'turn/completed': 'TURN_COMPLETED',
    };
    let type = mapping[method] ?? (method.includes('delta') ? 'ITEM_DELTA' : 'ITEM_COMPLETED');
    const turn = objectField(params, 'turn');
    const status = stringField(turn, 'status') ?? stringField(params, 'status');
    if (method === 'turn/completed' && status === 'failed') type = 'TURN_FAILED';
    if (method === 'turn/completed' && status === 'interrupted') type = 'TURN_INTERRUPTED';
    const item = objectField(params, 'item');
    return {
      sequence: ++this.sequence,
      type,
      threadId: stringField(params, 'threadId') ?? stringField(objectField(params, 'thread'), 'id'),
      turnId: stringField(params, 'turnId') ?? stringField(turn, 'id'),
      itemId: stringField(params, 'itemId') ?? stringField(item, 'id'),
      itemType: stringField(item, 'type'),
      textDelta: redactCodexText(stringField(params, 'delta') ?? '', 20_000) || undefined,
      status,
      message: type === 'TURN_FAILED' ? redactCodexText(stringField(objectField(turn, 'error'), 'message') ?? 'Turn failed.') : undefined,
      timestamp: Date.now(),
    };
  }

  private handleTermination(message: string): void {
    if (!this.child && !this.initialized) return;
    this.child = null;
    this.initialized = false;
    const detail = this.stderr ? `${message} ${this.stderr}` : message;
    const error = new CodexProviderError('PROCESS_FAILED', redactCodexText(detail), true);
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
    this.onEvent({
      sequence: ++this.sequence,
      type: 'PROCESS_TERMINATED',
      failureCode: 'PROCESS_FAILED',
      message: error.message,
      timestamp: Date.now(),
    });
  }

  stop(): void {
    const child = this.child;
    this.child = null;
    this.initialized = false;
    if (child && !child.killed) child.kill();
  }
}

function objectField(value: JsonObject, key: string): JsonObject {
  const child = value[key];
  return child && typeof child === 'object' && !Array.isArray(child) ? child as JsonObject : {};
}

function stringField(value: JsonObject, key: string): string | undefined {
  return typeof value[key] === 'string' ? value[key] as string : undefined;
}
