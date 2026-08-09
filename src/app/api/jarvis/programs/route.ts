import { err, ok, parseJson, safe } from '@/lib/api';
import { runtimeAdapterRegistry } from '@/lib/jarvis/platform/adapter-registry';
import { requireJarvisOwner } from '@/lib/jarvis/owner-guard';
import { capabilityRegistry } from '@/lib/jarvis/platform/capability-registry';
import { refreshPlatformDiscovery } from '@/lib/jarvis/platform/discovery';
import { createProgramRecord, programRegistry } from '@/lib/jarvis/platform/program-registry';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const registerSchema = z.object({
  action: z.literal('register'),
  program: z.object({
    id: z.string().min(2).max(100).regex(/^[a-z0-9:._-]+$/i),
    name: z.string().min(1).max(120),
    type: z.string().min(1).max(80),
    category: z.string().min(1).max(80),
    description: z.string().max(500).default(''),
    repository: z.string().max(300).nullable().optional(),
    capabilities: z.array(z.string().max(100)).max(100).default([]),
    source: z.enum(['manual', 'e2e-test']).default('manual'),
  }),
});
const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('refresh') }),
  z.object({ action: z.literal('test'), id: z.string().min(1) }),
  z.object({ action: z.enum(['start','stop','restart','logs','configuration']), id: z.string().min(1) }),
  z.object({ action: z.literal('execute'), id: z.string().min(1), adapterAction: z.string().min(1).max(100), input: z.record(z.string(), z.unknown()).optional() }),
  registerSchema,
]);
const patchSchema = z.object({ id: z.string().min(1), enabled: z.boolean() });

export const GET = safe(async () => {
  const accessError = await requireJarvisOwner();
  if (accessError) return accessError;
  const { programs } = await refreshPlatformDiscovery();
  const summary = await programRegistry.summary();
  return ok({ programs: programs.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)), summary, refreshedAt: new Date().toISOString() });
});

export const POST = safe(async (request: Request) => {
  const accessError = await requireJarvisOwner();
  if (accessError) return accessError;
  const parsed = actionSchema.safeParse(await parseJson(request));
  if (!parsed.success) return err('Некорректное действие реестра программ', 400, { issues: parsed.error.flatten() });

  if (parsed.data.action === 'refresh') {
    const result = await refreshPlatformDiscovery(true);
    return ok({ ...result, summary: await programRegistry.summary() });
  }

  if (parsed.data.action === 'register') {
    const repository = parsed.data.program.repository?.toLowerCase() ?? '';
    if (repository.includes('galstyanh992-max/instagithubanalizer')) {
      return err('Этот репозиторий исключён из внешнего каталога возможностей', 409);
    }
    const existing = await programRegistry.get(parsed.data.program.id);
    if (existing && !['manual', 'e2e-test'].includes(existing.source)) {
      return err('Системную запись нельзя заменить ручной регистрацией', 409);
    }
    const record = await programRegistry.upsert(createProgramRecord({
      ...parsed.data.program,
      repository: parsed.data.program.repository ?? null,
      installed: true,
      running: true,
      status: 'ONLINE',
      health: 'HEALTHY',
      health_message: 'Зарегистрировано вручную',
      last_seen: new Date().toISOString(),
    }));
    return ok({ program: record }, { status: 201 });
  }

  const program = await programRegistry.get(parsed.data.id);
  if (!program) return err('Программа не найдена', 404);
  const adapter = runtimeAdapterRegistry.get(program.id);
  const lifecycleAction = parsed.data.action;
  if (lifecycleAction === 'execute' && !program.enabled) {
    return err('Программа отключена; выполнение capability запрещено', 409);
  }
  const result = adapter
    ? lifecycleAction === 'start' && adapter.start ? await adapter.start()
      : lifecycleAction === 'stop' && adapter.stop ? await adapter.stop()
      : lifecycleAction === 'restart' && adapter.restart ? await adapter.restart()
      : lifecycleAction === 'execute' ? await adapter.execute({ action:parsed.data.adapterAction, input:parsed.data.input })
      : await adapter.execute({ action:lifecycleAction === 'test' ? 'health' : lifecycleAction })
    : { ok: program.installed && program.health !== 'UNHEALTHY' && program.health !== 'MISSING', output: { health: program.health }, durationMs: 0 };
  await programRegistry.recordExecution(program.id, result.ok, result.ok ? undefined : result.error?.message);
  return ok({ id: program.id, result, program: await programRegistry.get(program.id) });
});

export const PATCH = safe(async (request: Request) => {
  const accessError = await requireJarvisOwner();
  if (accessError) return accessError;
  const parsed = patchSchema.safeParse(await parseJson(request));
  if (!parsed.success) return err('Некорректное изменение программы', 400, { issues: parsed.error.flatten() });
  const program = await programRegistry.setEnabled(parsed.data.id, parsed.data.enabled);
  const capability = await capabilityRegistry.get(parsed.data.id);
  if (capability) await capabilityRegistry.setEnabled(parsed.data.id, parsed.data.enabled);
  return ok({ program });
});

export const DELETE = safe(async (request: Request) => {
  const accessError = await requireJarvisOwner();
  if (accessError) return accessError;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return err('Не указан id', 400);
  const program = await programRegistry.get(id);
  if (!program) return err('Программа не найдена', 404);
  if (!['manual', 'e2e-test'].includes(program.source)) return err('Автоматически обнаруженную программу нельзя удалить через API', 409);
  await Promise.all([programRegistry.remove(id), capabilityRegistry.remove(id)]);
  return ok({ removed: true, id });
});
