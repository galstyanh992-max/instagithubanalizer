import type { CapabilityRecord } from './types';

export interface CapabilitySelectionRequest {
  required: string[];
  preferredKind?: CapabilityRecord['kind'];
  agentId?: string;
  providerId?: string;
  preferLocal?: boolean;
  requirePrivacy?: boolean;
  maximumRisk?: CapabilityRecord['risk'];
}

export interface CapabilityScore {
  capability: CapabilityRecord;
  total: number;
  factors: {
    task_fit: number;
    specialization: number;
    availability: number;
    health: number;
    reliability: number;
    historical_success: number;
    latency: number;
    cost: number;
    privacy: number;
    locality: number;
    resource_usage: number;
    risk: number;
    compatibility: number;
  };
}

const RISK = { low: 0, medium: 1, high: 2, critical: 3 } as const;

function overlap(required: string[], offered: string[]): number {
  if (required.length === 0) return 1;
  const normalized = new Set(offered.map((value) => value.toLowerCase()));
  return required.filter((value) => normalized.has(value.toLowerCase())).length / required.length;
}

export function scoreCapability(capability: CapabilityRecord, request: CapabilitySelectionRequest): CapabilityScore {
  const fit = overlap(request.required, [capability.id, ...capability.capabilities, ...capability.best_for]);
  const factors = {
    task_fit: fit * 35,
    specialization: request.preferredKind === capability.kind ? 10 : 0,
    availability: capability.installed && capability.enabled ? 14 : -100,
    health: capability.health === 'HEALTHY' ? 10 : capability.health === 'DEGRADED' ? 3 : -20,
    reliability: capability.success_rate > 0 ? (capability.success_rate / 100) * 8 : 4,
    historical_success: Math.min(capability.success_count, 10) * 0.4,
    latency: capability.latency_class === 'instant' ? 5 : capability.latency_class === 'fast' ? 3 : capability.latency_class === 'slow' ? -3 : 0,
    cost: capability.cost_class === 'free' || capability.cost_class === 'local' ? 4 : capability.cost_class === 'metered' ? -4 : 0,
    privacy: request.requirePrivacy && capability.cost_class === 'local' ? 7 : 0,
    locality: request.preferLocal && capability.cost_class === 'local' ? 5 : 0,
    resource_usage: capability.cpu_requirement === 'high' || capability.ram_requirement === 'high' ? -4 : 0,
    risk: RISK[capability.risk] * -4,
    compatibility: (
      (!request.agentId || capability.compatible_agents.length === 0 || capability.compatible_agents.includes(request.agentId))
      && (!request.providerId || capability.compatible_providers.length === 0 || capability.compatible_providers.includes(request.providerId))
    ) ? 8 : -100,
  };
  const maximumRisk = request.maximumRisk ?? 'critical';
  const blockedByRisk = RISK[capability.risk] > RISK[maximumRisk];
  const total = blockedByRisk ? -Infinity : Object.values(factors).reduce((sum, value) => sum + value, 0);
  return { capability, total, factors };
}

export function rankCapabilities(capabilities: CapabilityRecord[], request: CapabilitySelectionRequest): CapabilityScore[] {
  return capabilities
    .filter((capability) => capability.enabled && capability.installed && capability.health !== 'MISSING' && capability.health !== 'UNHEALTHY')
    .map((capability) => scoreCapability(capability, request))
    .filter((result) => Number.isFinite(result.total) && result.factors.task_fit > 0)
    .sort((a, b) => b.total - a.total || b.capability.priority - a.capability.priority || a.capability.id.localeCompare(b.capability.id));
}

export class CapabilityRouter {
  constructor(private readonly getCapabilities: () => Promise<CapabilityRecord[]>) {}

  async select(request: CapabilitySelectionRequest, excluded = new Set<string>()): Promise<CapabilityScore | null> {
    const ranked = rankCapabilities(await this.getCapabilities(), request);
    return ranked.find((candidate) => !excluded.has(candidate.capability.id)) ?? null;
  }

  async executeWithFallback<T>(options: {
    request: CapabilitySelectionRequest;
    execute: (capability: CapabilityRecord) => Promise<T>;
    maxAttempts?: number;
  }): Promise<{ result: T; selected: string; attempts: Array<{ capabilityId: string; error?: string }> }> {
    const excluded = new Set<string>();
    const attempts: Array<{ capabilityId: string; error?: string }> = [];
    const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
    let lastError: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const selected = await this.select(options.request, excluded);
      if (!selected) break;
      excluded.add(selected.capability.id);
      try {
        const result = await options.execute(selected.capability);
        attempts.push({ capabilityId: selected.capability.id });
        return { result, selected: selected.capability.id, attempts };
      } catch (error) {
        lastError = error;
        attempts.push({ capabilityId: selected.capability.id, error: error instanceof Error ? error.message : String(error) });
      }
    }
    throw new Error(`Все подходящие возможности завершились ошибкой: ${lastError instanceof Error ? lastError.message : String(lastError ?? 'кандидаты не найдены')}`);
  }
}
