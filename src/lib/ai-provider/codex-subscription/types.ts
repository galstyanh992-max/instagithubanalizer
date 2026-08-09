export const CODEX_SUBSCRIPTION_PROVIDER_ID = 'codex-chatgpt-subscription' as const;

export type CodexProviderStatus =
  | 'NOT_INSTALLED'
  | 'INSTALLED'
  | 'AUTH_REQUIRED'
  | 'AUTHENTICATING'
  | 'READY'
  | 'BLOCKED'
  | 'PROCESS_FAILED'
  | 'MODEL_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'PERMISSION_DENIED';

export type CodexNormalizedEventType =
  | 'THREAD_STARTED'
  | 'TURN_STARTED'
  | 'ITEM_STARTED'
  | 'ITEM_DELTA'
  | 'ITEM_COMPLETED'
  | 'APPROVAL_REQUIRED'
  | 'TURN_COMPLETED'
  | 'TURN_FAILED'
  | 'TURN_INTERRUPTED'
  | 'PROCESS_TERMINATED';

export interface CodexProviderAvailability {
  providerId: typeof CODEX_SUBSCRIPTION_PROVIDER_ID;
  status: CodexProviderStatus;
  installed: boolean;
  authenticated: boolean;
  appServerReady: boolean;
  cliVersion?: string;
  failureCode?: string;
  message: string;
}

export interface CodexModel {
  id: string;
  model: string;
  displayName: string;
  description: string;
  isDefault: boolean;
  hidden: boolean;
  defaultReasoningEffort: string;
  supportedReasoningEfforts: Array<{
    reasoningEffort: string;
    description: string;
  }>;
  inputModalities: string[];
  serviceTiers: Array<{ id: string; name: string; description: string }>;
}

export interface CodexThreadOptions {
  cwd: string;
  model?: string;
  reasoningEffort?: string;
  sandbox?: 'read-only' | 'workspace-write';
}

export interface CodexThread {
  threadId: string;
  cwd: string;
  model: string;
  reasoningEffort?: string;
}

export interface CodexTurn {
  threadId: string;
  turnId: string;
  status: string;
}

export interface CodexNormalizedEvent {
  sequence: number;
  type: CodexNormalizedEventType;
  threadId?: string;
  turnId?: string;
  itemId?: string;
  itemType?: string;
  textDelta?: string;
  status?: string;
  failureCode?: string;
  message?: string;
  approval?: {
    requestId: string | number;
    method: string;
    reason?: string;
  };
  timestamp: number;
}

export interface CodexSubscriptionProviderContract {
  readonly id: typeof CODEX_SUBSCRIPTION_PROVIDER_ID;
  getAvailability(): Promise<CodexProviderAvailability>;
  getAuthStatus(): Promise<CodexProviderAvailability>;
  login(): Promise<CodexProviderAvailability>;
  logout(): Promise<CodexProviderAvailability>;
  listModels(): Promise<CodexModel[]>;
  getCapabilities(): Promise<Record<string, boolean>>;
  startThread(options: CodexThreadOptions): Promise<CodexThread>;
  resumeThread(threadId: string, options?: Partial<CodexThreadOptions>): Promise<CodexThread>;
  startTurn(threadId: string, prompt: string, options?: { model?: string; reasoningEffort?: string }): Promise<CodexTurn>;
  cancelTurn(threadId: string, turnId: string): Promise<void>;
  getHealth(): Promise<CodexProviderAvailability>;
}

export class CodexProviderError extends Error {
  constructor(
    public readonly code: CodexProviderStatus | string,
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = 'CodexProviderError';
  }
}
