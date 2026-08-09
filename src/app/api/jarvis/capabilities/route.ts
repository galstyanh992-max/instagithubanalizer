import { err, ok, parseJson, safe } from '@/lib/api';
import { capabilityRegistry, createCapabilityRecord } from '@/lib/jarvis/platform/capability-registry';
import { compileCommands } from '@/lib/jarvis/platform/command-compiler';
import { requireJarvisOwner } from '@/lib/jarvis/owner-guard';
import { refreshPlatformDiscovery } from '@/lib/jarvis/platform/discovery';
import { CAPABILITY_KINDS } from '@/lib/jarvis/platform/types';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const capabilitySchema = z.object({
  id: z.string().min(2).max(100).regex(/^[a-z0-9:._-]+$/i),
  name: z.string().min(1).max(120),
  kind: z.enum(CAPABILITY_KINDS),
  category: z.string().min(1).max(80),
  description: z.string().max(500).default(''),
  capabilities: z.array(z.string().max(100)).max(100).default([]),
  source: z.enum(['manual', 'e2e-test']).default('manual'),
  repository: z.string().max(300).nullable().optional(),
  installed: z.boolean().default(true),
  enabled: z.boolean().default(true),
});
const patchSchema = z.object({ id: z.string().min(1), enabled: z.boolean() });

export const GET = safe(async () => {
  const accessError = await requireJarvisOwner();
  if (accessError) return accessError;
  await refreshPlatformDiscovery();
  const capabilities = await capabilityRegistry.list();
  return ok({
    capabilities,
    summary: await capabilityRegistry.summary(),
    commands: compileCommands(capabilities),
  });
});

export const POST = safe(async (request: Request) => {
  const accessError = await requireJarvisOwner();
  if (accessError) return accessError;
  const parsed = capabilitySchema.safeParse(await parseJson(request));
  if (!parsed.success) return err('Некорректная возможность', 400, { issues: parsed.error.flatten() });
  if ((parsed.data.repository ?? '').toLowerCase().includes('galstyanh992-max/instagithubanalizer')) {
    return err('Этот репозиторий исключён из внешнего каталога возможностей', 409);
  }
  const existing = await capabilityRegistry.get(parsed.data.id);
  if (existing && !['manual', 'e2e-test'].includes(existing.source)) {
    return err('Системную возможность нельзя заменить ручной регистрацией', 409);
  }
  const capability = await capabilityRegistry.upsert(createCapabilityRecord({
    ...parsed.data,
    repository: parsed.data.repository ?? null,
    health: parsed.data.installed ? 'HEALTHY' : 'MISSING',
  }));
  return ok({ capability }, { status: 201 });
});

export const PATCH = safe(async (request: Request) => {
  const accessError = await requireJarvisOwner();
  if (accessError) return accessError;
  const parsed = patchSchema.safeParse(await parseJson(request));
  if (!parsed.success) return err('Некорректное изменение возможности', 400, { issues: parsed.error.flatten() });
  return ok({ capability: await capabilityRegistry.setEnabled(parsed.data.id, parsed.data.enabled) });
});

export const DELETE = safe(async (request: Request) => {
  const accessError = await requireJarvisOwner();
  if (accessError) return accessError;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return err('Не указан id', 400);
  const capability = await capabilityRegistry.get(id);
  if (!capability) return err('Возможность не найдена', 404);
  if (!['manual', 'e2e-test'].includes(capability.source)) return err('Автоматически обнаруженную возможность нельзя удалить через API', 409);
  return ok({ removed: await capabilityRegistry.remove(id), id });
});
