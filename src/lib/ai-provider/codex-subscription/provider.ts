import { db } from '@/lib/db';
import { eventBus } from '@/lib/event-bus';
import { EventTypes } from '@/lib/types/events';
import { CodexAppServerClient } from './app-server-client';
import { validateCodexWorkingDirectory } from './path-policy';
import { CodexProcessRunner } from './process-runner';
import { redactCodexText } from './redaction';
import {
  CODEX_SUBSCRIPTION_PROVIDER_ID,
  CodexProviderError,
  type CodexModel,
  type CodexNormalizedEvent,
  type CodexProviderAvailability,
  type CodexSubscriptionProviderContract,
  type CodexThread,
  type CodexThreadOptions,
  type CodexTurn,
} from './types';

type JsonObject = Record<string, unknown>;

const MAX_EVENTS = 500;
const MAX_MODELS = 1_000;

export class CodexSubscriptionProvider implements CodexSubscriptionProviderContract {
  readonly id = CODEX_SUBSCRIPTION_PROVIDER_ID;
  private readonly runner: CodexProcessRunner;
  private readonly client: CodexAppServerClient;
  private readonly events: CodexNormalizedEvent[] = [];
  private authenticating = false;
  private cliVersion?: string;

  constructor(runner = new CodexProcessRunner()) {
    this.runner = runner;
    this.client = new CodexAppServerClient(runner, (event) => this.recordEvent(event));
  }

  async getAvailability(): Promise<CodexProviderAvailability> {
    const executable = await this.runner.findExecutable();
    if (!executable) return this.availability('NOT_INSTALLED', false, false, false, 'Official Codex CLI is not installed.');

    const version = await this.runner.run(['--version']);
    this.cliVersion = version.exitCode === 0 ? version.stdout.trim() : undefined;
    if (this.authenticating) {
      return this.availability('AUTHENTICATING', true, false, this.client.isReady(), 'Official Codex login is in progress.');
    }

    const auth = await this.runner.run(['login', 'status']);
    const authenticated = auth.exitCode === 0 && /\blogged in\b/i.test(auth.stdout + auth.stderr);
    if (!authenticated) {
      return this.availability('AUTH_REQUIRED', true, false, false, 'Sign in with the official Codex CLI to use the ChatGPT subscription.');
    }
    return this.availability(
      this.client.isReady() ? 'READY' : 'INSTALLED',
      true,
      true,
      this.client.isReady(),
      this.client.isReady() ? 'Codex app-server is ready.' : 'Codex CLI is authenticated; app-server has not been started.',
    );
  }

  getAuthStatus(): Promise<CodexProviderAvailability> {
    return this.getAvailability();
  }

  async login(): Promise<CodexProviderAvailability> {
    const current = await this.getAvailability();
    if (!current.installed || current.authenticated) return current;
    if (this.authenticating) return current;

    this.authenticating = true;
    const child = await this.runner.spawn(['login']);
    child.stdout.resume();
    child.stderr.resume();
    child.once('close', () => {
      this.authenticating = false;
    });
    child.once('error', () => {
      this.authenticating = false;
    });
    return this.availability('AUTHENTICATING', true, false, false, 'Official Codex sign-in was opened on this local machine.');
  }

  async logout(): Promise<CodexProviderAvailability> {
    this.client.stop();
    const result = await this.runner.run(['logout']);
    this.authenticating = false;
    if (result.exitCode !== 0) {
      throw new CodexProviderError('PROCESS_FAILED', 'Official Codex logout failed.');
    }
    return this.availability('AUTH_REQUIRED', true, false, false, 'Signed out of the official Codex CLI.');
  }

  async listModels(): Promise<CodexModel[]> {
    await this.assertAuthenticated();
    const models: CodexModel[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < 20; page++) {
      const result = await this.client.request('model/list', { cursor, limit: 100, includeHidden: false });
      const data = Array.isArray(result.data) ? result.data : [];
      for (const raw of data) {
        if (models.length >= MAX_MODELS) break;
        const model = parseModel(raw);
        if (model) models.push(model);
      }
      cursor = typeof result.nextCursor === 'string' ? result.nextCursor : null;
      if (!cursor || models.length >= MAX_MODELS) break;
    }
    if (models.length === 0) throw new CodexProviderError('MODEL_UNAVAILABLE', 'Codex returned no available subscription models.');
    return models;
  }

  async getCapabilities(): Promise<Record<string, boolean>> {
    const status = await this.getAvailability();
    return {
      officialCli: status.installed,
      chatgptSubscriptionAuth: status.authenticated,
      dynamicModels: true,
      threads: true,
      resumableThreads: true,
      streamingEvents: true,
      cancellation: true,
      approvals: true,
      localRepositoryCwd: true,
    };
  }

  async startThread(options: CodexThreadOptions): Promise<CodexThread> {
    await this.assertAuthenticated();
    const cwd = await validateCodexWorkingDirectory(options.cwd);
    if (options.model) await this.assertModel(options.model, options.reasoningEffort);
    const result = await this.client.request('thread/start', {
      cwd,
      ...(options.model ? { model: options.model } : {}),
      sandbox: options.sandbox ?? 'workspace-write',
      approvalPolicy: 'on-request',
      approvalsReviewer: 'user',
      experimentalRawEvents: false,
    });
    const thread = objectField(result, 'thread');
    const threadId = stringField(thread, 'id');
    if (!threadId) throw new CodexProviderError('PROCESS_FAILED', 'Codex did not return a thread ID.');
    const created: CodexThread = {
      threadId,
      cwd: stringField(result, 'cwd') ?? cwd,
      model: stringField(result, 'model') ?? options.model ?? '',
      reasoningEffort: stringField(result, 'reasoningEffort') ?? options.reasoningEffort,
    };
    await this.persistSession(created, 'READY');
    return created;
  }

  async resumeThread(threadId: string, options: Partial<CodexThreadOptions> = {}): Promise<CodexThread> {
    await this.assertAuthenticated();
    const cwd = options.cwd ? await validateCodexWorkingDirectory(options.cwd) : undefined;
    if (options.model) await this.assertModel(options.model, options.reasoningEffort);
    const result = await this.client.request('thread/resume', {
      threadId,
      ...(cwd ? { cwd } : {}),
      ...(options.model ? { model: options.model } : {}),
      ...(options.sandbox ? { sandbox: options.sandbox } : {}),
      approvalPolicy: 'on-request',
      approvalsReviewer: 'user',
    });
    const thread = objectField(result, 'thread');
    const resumed: CodexThread = {
      threadId: stringField(thread, 'id') ?? threadId,
      cwd: stringField(result, 'cwd') ?? cwd ?? '',
      model: stringField(result, 'model') ?? options.model ?? '',
      reasoningEffort: stringField(result, 'reasoningEffort') ?? options.reasoningEffort,
    };
    await this.persistSession(resumed, 'READY');
    return resumed;
  }

  async startTurn(
    threadId: string,
    prompt: string,
    options: { model?: string; reasoningEffort?: string } = {},
  ): Promise<CodexTurn> {
    await this.assertAuthenticated();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || cleanPrompt.length > 200_000) {
      throw new CodexProviderError('BLOCKED', 'Codex turn prompt must contain 1–200000 characters.');
    }
    if (options.model) await this.assertModel(options.model, options.reasoningEffort);
    const result = await this.client.request('turn/start', {
      threadId,
      input: [{ type: 'text', text: cleanPrompt }],
      ...(options.model ? { model: options.model } : {}),
      ...(options.reasoningEffort ? { effort: options.reasoningEffort } : {}),
      approvalPolicy: 'on-request',
      approvalsReviewer: 'user',
    });
    const turn = objectField(result, 'turn');
    const turnId = stringField(turn, 'id');
    if (!turnId) throw new CodexProviderError('PROCESS_FAILED', 'Codex did not return a turn ID.');
    await this.updateTurn(threadId, turnId, stringField(turn, 'status') ?? 'inProgress');
    return { threadId, turnId, status: stringField(turn, 'status') ?? 'inProgress' };
  }

  async cancelTurn(threadId: string, turnId: string): Promise<void> {
    await this.client.request('turn/interrupt', { threadId, turnId });
    await this.updateTurn(threadId, null, 'TURN_INTERRUPTED');
  }

  async getHealth(): Promise<CodexProviderAvailability> {
    const status = await this.getAvailability();
    if (!status.authenticated) return status;
    try {
      await this.client.start();
      return this.availability('READY', true, true, true, 'Official Codex app-server handshake succeeded.');
    } catch (error) {
      return this.availability(
        'PROCESS_FAILED',
        true,
        true,
        false,
        error instanceof Error ? redactCodexText(error.message) : 'Codex app-server failed.',
        'APP_SERVER_START_FAILED',
      );
    }
  }

  getEvents(afterSequence = 0, threadId?: string): CodexNormalizedEvent[] {
    return this.events.filter((event) => event.sequence > afterSequence && (!threadId || event.threadId === threadId));
  }

  private async assertAuthenticated(): Promise<void> {
    const status = await this.getAvailability();
    if (!status.installed) throw new CodexProviderError('NOT_INSTALLED', status.message);
    if (!status.authenticated) throw new CodexProviderError('AUTH_REQUIRED', status.message);
  }

  private async assertModel(modelId: string, effort?: string): Promise<void> {
    const models = await this.listModels();
    const model = models.find((item) => item.id === modelId || item.model === modelId);
    if (!model) throw new CodexProviderError('MODEL_UNAVAILABLE', 'The requested model is not in the current Codex subscription model catalog.');
    if (effort && !model.supportedReasoningEfforts.some((item) => item.reasoningEffort === effort)) {
      throw new CodexProviderError('MODEL_UNAVAILABLE', 'The requested reasoning effort is not supported by this model.');
    }
  }

  private availability(
    status: CodexProviderAvailability['status'],
    installed: boolean,
    authenticated: boolean,
    appServerReady: boolean,
    message: string,
    failureCode?: string,
  ): CodexProviderAvailability {
    return {
      providerId: this.id,
      status,
      installed,
      authenticated,
      appServerReady,
      cliVersion: this.cliVersion,
      failureCode,
      message,
    };
  }

  private recordEvent(event: CodexNormalizedEvent): void {
    this.events.push(event);
    if (this.events.length > MAX_EVENTS) this.events.splice(0, this.events.length - MAX_EVENTS);
    void eventBus.emit(EventTypes.CODEX_PROVIDER_EVENT, {
      providerId: this.id,
      sequence: event.sequence,
      eventType: event.type,
      threadId: event.threadId,
      turnId: event.turnId,
      itemId: event.itemId,
      status: event.status,
      failureCode: event.failureCode,
      timestamp: event.timestamp,
      source: 'codex-subscription-provider',
    });
    if (event.threadId) {
      void this.updateTurn(event.threadId, event.turnId ?? null, event.type, event.message);
    }
  }

  private async persistSession(thread: CodexThread, status: string): Promise<void> {
    try {
      await db.codexProviderSession.upsert({
        where: { threadId: thread.threadId },
        create: {
          providerId: this.id,
          cliVersion: this.cliVersion,
          authStatus: 'AUTHENTICATED',
          status,
          threadId: thread.threadId,
          model: thread.model,
          reasoningEffort: thread.reasoningEffort,
          cwd: thread.cwd,
        },
        update: {
          cliVersion: this.cliVersion,
          authStatus: 'AUTHENTICATED',
          status,
          model: thread.model,
          reasoningEffort: thread.reasoningEffort,
          cwd: thread.cwd,
          failureSummary: null,
        },
      });
    } catch {
      // A pending local migration must not turn a live Codex process into a false failure.
    }
  }

  private async updateTurn(threadId: string, turnId: string | null, status: string, failure?: string): Promise<void> {
    try {
      await db.codexProviderSession.update({
        where: { threadId },
        data: {
          activeTurnId: status === 'TURN_COMPLETED' || status === 'TURN_FAILED' || status === 'TURN_INTERRUPTED' ? null : turnId,
          status,
          lastEvent: status,
          failureSummary: failure ? redactCodexText(failure, 1_000) : undefined,
        },
      });
    } catch {
      // See persistSession: persistence readiness is reported separately from process health.
    }
  }
}

function parseModel(raw: unknown): CodexModel | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as JsonObject;
  const id = stringField(value, 'id');
  const model = stringField(value, 'model');
  if (!id || !model) return null;
  return {
    id,
    model,
    displayName: stringField(value, 'displayName') ?? model,
    description: stringField(value, 'description') ?? '',
    isDefault: value.isDefault === true,
    hidden: value.hidden === true,
    defaultReasoningEffort: stringField(value, 'defaultReasoningEffort') ?? '',
    supportedReasoningEfforts: Array.isArray(value.supportedReasoningEfforts)
      ? value.supportedReasoningEfforts.flatMap((item) => {
          if (!item || typeof item !== 'object') return [];
          const option = item as JsonObject;
          const reasoningEffort = stringField(option, 'reasoningEffort');
          return reasoningEffort ? [{ reasoningEffort, description: stringField(option, 'description') ?? '' }] : [];
        })
      : [],
    inputModalities: Array.isArray(value.inputModalities) ? value.inputModalities.filter((item): item is string => typeof item === 'string') : [],
    serviceTiers: Array.isArray(value.serviceTiers)
      ? value.serviceTiers.flatMap((item) => {
          if (!item || typeof item !== 'object') return [];
          const tier = item as JsonObject;
          const tierId = stringField(tier, 'id');
          return tierId ? [{ id: tierId, name: stringField(tier, 'name') ?? tierId, description: stringField(tier, 'description') ?? '' }] : [];
        })
      : [],
  };
}

function objectField(value: JsonObject, key: string): JsonObject {
  const child = value[key];
  return child && typeof child === 'object' && !Array.isArray(child) ? child as JsonObject : {};
}

function stringField(value: JsonObject, key: string): string | undefined {
  return typeof value[key] === 'string' ? value[key] as string : undefined;
}
