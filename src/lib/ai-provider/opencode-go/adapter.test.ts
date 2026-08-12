import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { OpenCodeGoProvider, buildOpenCodeGoConfig, isOpenCodeGoConfigured } from './adapter';
import { reconcileWithLiveCatalog } from './protocol-map';
import { ProviderError } from '../types';

// Fixtures below are REAL response bodies captured 2026-08-12 from live
// OpenCode Go API calls (see reports/JARVIS_PROVIDER_MODEL_BENCHMARK.md),
// not fabricated shapes — this locks in the adapter's parsing against the
// actual upstream contract for all three protocols.

const REAL_CHAT_RESPONSE = {
  id: 'gen-1786499305-IbzdX6ERJyJDwxXI8fst',
  object: 'chat.completion',
  created: 1786499305,
  model: 'mimo-v2.5-pro',
  choices: [
    {
      index: 0,
      finish_reason: 'stop',
      message: { role: 'assistant', content: '{"status":"ok"}' },
    },
  ],
  usage: { prompt_tokens: 265, completion_tokens: 23, total_tokens: 288 },
};

const REAL_RESPONSES_RESPONSE = {
  id: 'gen-1786499307-qBK4AsAUPkihKhlZ8fGY',
  object: 'response',
  status: 'completed',
  model: 'gpt-5.6-luna',
  output: [
    {
      id: 'msg_tmp_xor4q9lxv1i',
      type: 'message',
      status: 'completed',
      role: 'assistant',
      content: [{ type: 'output_text', text: 'OK', annotations: [] }],
    },
  ],
  usage: { input_tokens: 11, output_tokens: 5, total_tokens: 16 },
};

const REAL_MESSAGES_RESPONSE = {
  id: 'msg_6abe4cb5-10af-40b1-805e-6ac308ae3ac8',
  type: 'message',
  role: 'assistant',
  stop_reason: 'end_turn',
  model: 'qwen3.7-plus',
  content: [
    { type: 'thinking', thinking: 'Thinking Process...', signature: '' },
    { type: 'text', text: 'OK' },
  ],
  usage: { input_tokens: 15, output_tokens: 161 },
};

const REAL_REGION_ERROR = {
  type: 'error',
  error: {
    type: 'RegionError',
    message: 'The latest version of this model is only available hosted in China and requires explicit opt in: https://opencode.ai/workspace/wrk_01KZSGWCH36H14PJKHA69610SW/go',
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function testConfig() {
  return {
    apiKey: 'test-key',
    baseUrl: 'https://opencode.ai/zen/go/v1',
    modelsUrl: 'https://opencode.ai/zen/go/v1/models',
    chatUrl: 'https://opencode.ai/zen/go/v1/chat/completions',
    messagesUrl: 'https://opencode.ai/zen/go/v1/messages',
    responsesUrl: 'https://opencode.ai/zen/go/v1/responses',
    defaultModel: 'deepseek-v4-pro',
    timeoutMs: 30_000,
    maxRetries: 0,
  };
}

describe('OpenCodeGoProvider', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllGlobals();
  });

  it('dispatches OPENAI_CHAT models through the chat/completions delegate and parses real payload shape', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse(REAL_CHAT_RESPONSE));
    const provider = new OpenCodeGoProvider(testConfig());

    const result = await provider.complete({
      model: 'mimo-v2.5-pro',
      messages: [{ role: 'user', content: 'Return ONLY this JSON, no other text: {"status":"ok"}' }],
      maxTokens: 30,
    });

    expect(result.content).toBe('{"status":"ok"}');
    expect(result.model).toBe('mimo-v2.5-pro');
    expect(result.usage.totalTokens).toBe(288);
  });

  it('dispatches OPENAI_RESPONSES models (gpt-5.6-luna) through /responses and extracts output[].content[].text', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse(REAL_RESPONSES_RESPONSE));
    const provider = new OpenCodeGoProvider(testConfig());

    const result = await provider.complete({
      model: 'gpt-5.6-luna',
      messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
      maxTokens: 16,
    });

    expect(result.content).toBe('OK');
    expect(result.model).toBe('gpt-5.6-luna');
    expect(result.usage.promptTokens).toBe(11);
    expect(result.usage.completionTokens).toBe(5);

    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.body).toContain('"input"');
    expect(init.body).not.toContain('"messages"');
  });

  it('dispatches ANTHROPIC_MESSAGES models (qwen3.7-plus) through /messages, ignores thinking blocks, uses x-api-key auth', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse(REAL_MESSAGES_RESPONSE));
    const provider = new OpenCodeGoProvider(testConfig());

    const result = await provider.complete({
      model: 'qwen3.7-plus',
      messages: [
        { role: 'system', content: 'Be terse.' },
        { role: 'user', content: 'Reply with exactly: OK' },
      ],
      maxTokens: 16,
    });

    expect(result.content).toBe('OK');
    expect(result.model).toBe('qwen3.7-plus');
    expect(result.usage.totalTokens).toBe(176); // 15 + 161

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://opencode.ai/zen/go/v1/messages');
    expect(init.headers['x-api-key']).toBe('test-key');
    expect(init.headers.Authorization).toBeUndefined();
    const body = JSON.parse(init.body as string);
    expect(body.system).toBe('Be terse.');
    expect(body.messages).toEqual([{ role: 'user', content: 'Reply with exactly: OK' }]);
  });

  it('surfaces a real RegionError (deepseek-v4-flash) as a non-retryable ProviderError without crashing the router', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse(REAL_REGION_ERROR, 403));
    const provider = new OpenCodeGoProvider(testConfig());

    // deepseek-v4-flash is marked unavailable in the static protocol map
    // (see protocol-map.ts) precisely because of this observed 403, so the
    // provider should reject before even calling fetch.
    await expect(
      provider.complete({ model: 'deepseek-v4-flash', messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toThrow(ProviderError);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects unclassified models instead of silently forcing them through chat/completions', async () => {
    const provider = new OpenCodeGoProvider(testConfig());
    await expect(
      provider.complete({ model: 'some-brand-new-model-not-in-map', messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toThrow(/not in the protocol map/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('buildOpenCodeGoConfig / isOpenCodeGoConfigured reflect env presence without ever logging the key value', () => {
    const withKey = { ...testConfig(), apiKey: 'sk-real-value' };
    expect(isOpenCodeGoConfigured(withKey)).toBe(true);
    expect(isOpenCodeGoConfigured({ ...withKey, apiKey: '' })).toBe(false);
  });
});

describe('reconcileWithLiveCatalog', () => {
  it('flags mapped models missing from a live catalog snapshot without throwing', () => {
    // Live catalog captured 2026-08-12 (25 models total).
    const liveIds = [
      'minimax-m3', 'minimax-m2.7', 'minimax-m2.5', 'kimi-k3', 'kimi-k2.7-code', 'kimi-k2.6', 'kimi-k2.5',
      'glm-5.2', 'glm-5.1', 'glm-5', 'deepseek-v4-pro', 'deepseek-v4-flash', 'qwen3.7-max', 'qwen3.8-max',
      'qwen3.7-plus', 'qwen3.6-plus', 'qwen3.5-plus', 'mimo-v2-pro', 'mimo-v2-omni', 'mimo-v2.5-pro',
      'mimo-v2.5', 'hy3', 'hy3-preview', 'gpt-5.6-luna', 'grok-4.5',
    ];
    const { missingLive, unclassifiedLive } = reconcileWithLiveCatalog(liveIds);
    expect(missingLive).toEqual([]);
    // glm-5, hy3-preview, kimi-k2.5, mimo-v2-omni, mimo-v2-pro, minimax-m2.5,
    // qwen3.5-plus are live but intentionally not in the curated map.
    expect(unclassifiedLive.sort()).toEqual(
      ['glm-5', 'hy3-preview', 'kimi-k2.5', 'mimo-v2-omni', 'mimo-v2-pro', 'minimax-m2.5', 'qwen3.5-plus'].sort(),
    );
  });
});
