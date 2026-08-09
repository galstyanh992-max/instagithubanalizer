import { afterEach, describe, expect, it, vi } from 'vitest';
import { OllamaAdapter } from './ollama-adapter';

afterEach(() => vi.restoreAllMocks());

describe('OllamaAdapter', () => {
  it('читает официальные tags/ps/version endpoints', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/api/tags')) return Response.json({ models: [{ name: 'qwen:latest', size: 1000, details: { parameter_size: '7B', quantization_level: 'Q4_K_M', family: 'qwen' } }] });
      if (url.endsWith('/api/ps')) return Response.json({ models: [{ name: 'qwen:latest', size: 800, context_length: 4096 }] });
      if (url.endsWith('/api/version')) return Response.json({ version: '1.2.3' });
      throw new Error(`unexpected ${url}`);
    });
    const adapter = new OllamaAdapter();
    expect(await adapter.version()).toBe('1.2.3');
    expect(await adapter.health()).toMatchObject({ state: 'HEALTHY' });
    expect(await adapter.models()).toEqual([expect.objectContaining({ name: 'qwen:latest', loaded: true, parameter_size: '7B', context: 4096 })]);
  });

  it('возвращает структурированную ошибку вместо заглушки', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const result = await new OllamaAdapter().execute({ action: 'list_models' });
    expect(result).toMatchObject({ ok: false, error: { code: 'OLLAMA_ACTION_FAILED', retryable: true } });
  });

  it('выполняет реальный chat-контракт и структурированную классификацию', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/api/tags')) return Response.json({ models: [{ name: 'phi4-mini:latest', size: 1 }] });
      if (url.endsWith('/api/ps')) return Response.json({ models: [] });
      if (url.endsWith('/api/chat')) {
        const body = JSON.parse(String(init?.body)) as { format?: unknown };
        return Response.json(body.format
          ? { model: 'phi4-mini:latest', message: { content: '{"label":"positive"}' }, eval_count: 2, eval_duration: 100_000_000, done: true }
          : { model: 'phi4-mini:latest', message: { content: 'OK' }, eval_count: 1, eval_duration: 50_000_000, done: true });
      }
      throw new Error(`unexpected ${url}`);
    });
    const adapter = new OllamaAdapter();
    await expect(adapter.execute({ action: 'chat', input: { prompt: 'hello' } })).resolves.toMatchObject({ ok: true });
    await expect(adapter.execute({ action: 'test_classification' })).resolves.toMatchObject({
      ok: true,
      output: { result: { label: 'positive' } },
    });
  });

  it('читает NDJSON-поток и фиксирует первый токен', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/api/tags')) return Response.json({ models: [{ name: 'phi4-mini:latest', size: 1 }] });
      if (url.endsWith('/api/ps')) return Response.json({ models: [] });
      if (url.endsWith('/api/chat')) {
        return new Response('{"message":{"content":"O"}}\n{"message":{"content":"K"},"done":true}\n');
      }
      throw new Error(`unexpected ${url}`);
    });
    await expect(new OllamaAdapter().execute({ action: 'test_stream' })).resolves.toMatchObject({
      ok: true,
      output: { response: 'OK', chunks: ['O', 'K'] },
    });
  });
});
