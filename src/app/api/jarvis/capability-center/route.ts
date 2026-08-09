import { z } from 'zod';
import { err, ok, parseJson, safe } from '@/lib/api';
import { requireJarvisOwner } from '@/lib/jarvis/owner-guard';
import { capabilityRegistry } from '@/lib/jarvis/platform/capability-registry';
import { programRegistry } from '@/lib/jarvis/platform/program-registry';
import { refreshPlatformDiscovery } from '@/lib/jarvis/platform/discovery';
import {
  KNOWN_REPOSITORIES,
  assessRepositoryFixture,
  detectCapabilityGaps,
  dashboardRealitySample,
  inferTaskCapabilities,
  normalizeCapabilities,
  repositoryKnowledgeSummary,
} from '@/lib/jarvis/capability-intelligence';

export const dynamic = 'force-dynamic';

const requestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('gap'), capabilities: z.array(z.string().min(1).max(120)).min(1).max(20) }),
  z.object({ action: z.literal('classify'), task: z.string().min(1).max(2_000) }),
  z.object({
    action: z.literal('assess'), repository: z.string().min(3).max(200), license: z.string().max(80).optional(),
    files: z.record(z.string().max(240), z.string().max(100_000)).refine((files) => Object.keys(files).length <= 50, 'Too many fixture files'),
  }),
]);

export const GET = safe(async () => {
  const accessError = await requireJarvisOwner();
  if (accessError) return accessError;
  await refreshPlatformDiscovery();
  const physical = await capabilityRegistry.list();
  const programs = await programRegistry.list();
  const generic = normalizeCapabilities(physical.flatMap((record) => record.capabilities));
  return ok({
    summary: {
      physicalCapabilityRecords: physical.length,
      genericCapabilityIdentifiers: generic.length,
      repositoryKnowledge: repositoryKnowledgeSummary(),
      automaticInstalls: 0,
      automaticActivations: 0,
      dashboardReality: dashboardRealitySample(programs, physical),
    },
    repositories: KNOWN_REPOSITORIES,
    ontology: generic,
    safeguards: {
      singleOrchestrator: 'JARVIS',
      existingCapabilitiesFirst: true,
      stagingRoot: '.jarvis/staging',
      autoInstallAllowed: false,
      autoActivationAllowed: false,
    },
  });
});

export const POST = safe(async (request: Request) => {
  const accessError = await requireJarvisOwner();
  if (accessError) return accessError;
  const parsed = requestSchema.safeParse(await parseJson(request));
  if (!parsed.success) return err('Invalid capability intelligence action', 400, { issues: parsed.error.flatten() });
  if (parsed.data.action === 'classify') return ok(inferTaskCapabilities(parsed.data.task));
  if (parsed.data.action === 'gap') return ok({ gaps: detectCapabilityGaps(parsed.data.capabilities, await capabilityRegistry.list()) });
  const assessment = assessRepositoryFixture(parsed.data);
  return ok({ assessment, stagingAllowed: false, reason: 'API assessments are previews; only scanner-attested complete snapshots may enter staging.' });
});
