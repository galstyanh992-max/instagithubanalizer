import { err, ok, parseJson, safe } from '@/lib/api';
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

export const GET = safe(async () => {
  const accessError = await requireJarvisOwner();
  if (accessError) return accessError;
  const [health, version, models, metrics] = await Promise.all([
    ollamaAdapter.health(),
    ollamaAdapter.version(),
    ollamaAdapter.models().catch(() => []),
    ollamaAdapter.metrics(),
  ]);
  return ok({ endpoint: 'http://127.0.0.1:11434', health, version, models, metrics });
});

export const POST = safe(async (request: Request) => {
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
