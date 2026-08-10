import { err, ok, parseJson, safe } from '@/lib/api';
import { env } from '@/lib/env';
import { ollamaAdapter } from '@/lib/jarvis/platform/ollama-adapter';
import { requireJarvisOwner } from '@/lib/jarvis/owner-guard';
import { programRegistry } from '@/lib/jarvis/platform/program-registry';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const schema = z.object({
  action: z.enum(['health', 'list_models', 'test_inference', 'benchmark', 'chat', 'test_stream', 'test_json', 'test_classification']),
  model: z.string().min(1).max(200).optional(),
  prompt: z.string().min(1).max(20_000).optional(),
  cold: z.boolean().optional(),
});

// ollamaAdapter is a lazy proxy (src/lib/jarvis/platform/ollama-adapter.ts)
// that already fails closed in web-control-plane mode without touching the
// network. This explicit check is a second, route-level layer: a Vercel
// deployment should never even attempt to query its own loopback address.
export const GET = safe(async () => {
  if (env.JARVIS_RUNTIME_ROLE === 'web-control-plane') {
    return err('Ollama runs on the local JARVIS runtime only.', 501);
  }
  const accessError = await requireJarvisOwner();
  if (accessError) return accessError;
  const [health, version, models, metrics] = await Promise.all([
    ollamaAdapter.health(),
    ollamaAdapter.version(),
    ollamaAdapter.models().catch(() => []),
    ollamaAdapter.metrics(),
  ]);
  const configuration = (await ollamaAdapter.configuration()) as { endpoint?: string };
  return ok({ endpoint: configuration.endpoint ?? 'local', health, version, models, metrics });
});

export const POST = safe(async (request: Request) => {
  if (env.JARVIS_RUNTIME_ROLE === 'web-control-plane') {
    return err('Ollama runs on the local JARVIS runtime only.', 501);
  }
  const accessError = await requireJarvisOwner();
  if (accessError) return accessError;
  const parsed = schema.safeParse(await parseJson(request));
  if (!parsed.success) return err('Некорректное действие Ollama', 400, { issues: parsed.error.flatten() });
  const result = await ollamaAdapter.execute({
    action: parsed.data.action,
    input: { model: parsed.data.model, prompt: parsed.data.prompt, cold: parsed.data.cold },
  });
  const program = await programRegistry.get('ollama-local');
  if (program) await programRegistry.recordExecution('ollama-local', result.ok, result.error?.message);
  return ok({ result }, { status: result.ok ? 200 : 503 });
});
