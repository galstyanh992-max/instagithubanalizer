// Unit tests for the Codex chat bridge adapter.
// We test the adapter in isolation (rather than the full initProviders
// pipeline) because initProviders also resolves a default provider, which is
// unrelated to the Codex bridge and needs unrelated fixtures to be present.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { codexSubscriptionProvider } from '../index';

// env stub: bridge enabled
vi.mock('@/lib/env', () => ({
  env: {
    JARVIS_CODEX_CHAT_ENABLED: 'true',
    JARVIS_CODEX_CHAT_CWD: 'D:\\АГЕНТ\\ДЖАРВИС',
    JARVIS_CODEX_AS_HEAVY: 'true',
  },
}));

describe('CodexChatAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('reports availability based on Codex CLI install + auth state', async () => {
    const { CodexChatAdapter } = await import('../adapter');
    const adapter = new CodexChatAdapter();

    const ready = vi.spyOn(codexSubscriptionProvider, 'getAvailability').mockResolvedValue({
      providerId: 'codex-chatgpt-subscription',
      status: 'READY',
      installed: true,
      authenticated: true,
      appServerReady: true,
      message: 'ready',
    });
    expect(await adapter.isAvailable()).toBe(true);
    expect(adapter.id).toBe('codex-chatgpt-subscription');
    ready.mockRestore();
  });

  it('is unavailable when Codex is not authenticated', async () => {
    const { CodexChatAdapter } = await import('../adapter');
    const adapter = new CodexChatAdapter();

    vi.spyOn(codexSubscriptionProvider, 'getAvailability').mockResolvedValue({
      providerId: 'codex-chatgpt-subscription',
      status: 'AUTH_REQUIRED',
      installed: true,
      authenticated: false,
      appServerReady: false,
      message: 'sign in',
    });
    expect(await adapter.isAvailable()).toBe(false);
  });

  it('returns collected agentMessage deltas as content when the turn completes', async () => {
    const { CodexChatAdapter } = await import('../adapter');
    const adapter = new CodexChatAdapter();

    // Simulate the event timeline: the turn starts, two text deltas stream in,
    // then the turn completes.
    const events = [
      { sequence: 1, type: 'THREAD_STARTED', timestamp: 0 },
      { sequence: 2, type: 'TURN_STARTED', turnId: 't1', timestamp: 0 },
      { sequence: 3, type: 'ITEM_DELTA', threadId: 'th1', turnId: 't1', textDelta: 'Hello, ', timestamp: 0 },
      { sequence: 4, type: 'ITEM_DELTA', threadId: 'th1', turnId: 't1', textDelta: 'world!', timestamp: 0 },
      { sequence: 5, type: 'TURN_COMPLETED', threadId: 'th1', turnId: 't1', timestamp: 0 },
    ] as const;

    vi.spyOn(codexSubscriptionProvider, 'getAvailability').mockResolvedValue({
      providerId: 'codex-chatgpt-subscription',
      status: 'READY',
      installed: true,
      authenticated: true,
      appServerReady: true,
      message: 'ready',
    });
    vi.spyOn(codexSubscriptionProvider, 'startThread').mockResolvedValue({
      threadId: 'th1',
      cwd: 'D:\\АГЕНТ\\ДЖАРВИС',
      model: 'gpt-5',
    });
    vi.spyOn(codexSubscriptionProvider, 'startTurn').mockResolvedValue({
      threadId: 'th1',
      turnId: 't1',
      status: 'inProgress',
    });
    // Simulate progressive event emission: each poll returns only events newer
    // than the adapter's cursor. Batches: [] (cursor capture) → [delta 1] →
    // [delta 2] → [completed]. The adapter advances its cursor internally.
    const batches = [
      [],
      [events[2]],              // ITEM_DELTA "Hello, "
      [events[3]],              // ITEM_DELTA "world!"
      [events[4]],              // TURN_COMPLETED
    ];
    let pollCall = 0;
    vi.spyOn(codexSubscriptionProvider, 'getEvents').mockImplementation(() => {
      const batch = batches[Math.min(pollCall, batches.length - 1)];
      pollCall += 1;
      return batch as never;
    });

    const response = await adapter.complete({
      model: 'gpt-5',
      messages: [
        { role: 'system', content: 'be brief' },
        { role: 'user', content: 'hi' },
      ],
    });

    expect(response.content).toBe('Hello, world!');
    expect(response.finishReason).toBe('stop');
    expect(response.metadata?.provider).toBe('codex-chatgpt-subscription');
  });
});
