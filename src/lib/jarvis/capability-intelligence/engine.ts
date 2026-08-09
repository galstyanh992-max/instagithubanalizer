import type { ToolCapability } from '../types';
import type { CapabilityRecord } from '../platform/types';
import { KNOWN_REPOSITORIES } from './catalog';
import { capabilityMatches, inferTaskCapabilities, normalizeCapabilities } from './ontology';
import type { CapabilityGap, RoutingCandidate, RoutingDecision } from './types';

const RISK = { low: 0, medium: 1, high: 2, critical: 3 } as const;

function availability(record: CapabilityRecord): CapabilityGap['availability'] {
  if (!record.installed || record.health === 'MISSING') return 'MISSING';
  if (!record.enabled) return 'AVAILABLE_BUT_DISABLED';
  if (record.health === 'UNHEALTHY') return 'UNSUITABLE';
  if (record.health === 'DEGRADED') return 'AVAILABLE_DEGRADED';
  if (!record.running && ['docker_service', 'automation'].includes(record.kind)) return 'AVAILABLE_ON_DEMAND';
  return 'AVAILABLE';
}

export function detectCapabilityGaps(required: string[], implementations: CapabilityRecord[]): CapabilityGap[] {
  return normalizeCapabilities(required).map((capability) => {
    const matches = implementations.filter((record) => [record.id, ...record.capabilities, ...record.best_for].some((offered) => capabilityMatches(capability, offered)));
    const states = matches.map(availability);
    const available = states.find((state) => state === 'AVAILABLE')
      ?? states.find((state) => state === 'AVAILABLE_ON_DEMAND')
      ?? states.find((state) => state === 'AVAILABLE_DEGRADED')
      ?? states.find((state) => state === 'AVAILABLE_BUT_DISABLED')
      ?? states.find((state) => state === 'UNSUITABLE')
      ?? 'MISSING';
    const candidates = available === 'MISSING'
      ? KNOWN_REPOSITORIES.filter((repository) => repository.capabilities.some((offered) => capabilityMatches(capability, offered)))
      : [];
    return {
      capability,
      availability: available,
      implementations: matches,
      candidates,
      reason: matches.length ? `${matches.length} existing implementation(s); best state ${available}` : `${candidates.length} catalog candidate(s); no automatic install`,
    };
  });
}

export function scoreRepositoryCandidates(capability: string) {
  return KNOWN_REPOSITORIES
    .map((repository) => {
      const taskFit = repository.capabilities.some((offered) => capabilityMatches(capability, offered)) ? 50 : 0;
      const security = repository.securityFindings.length === 0 ? 15 : -repository.securityFindings.length * 10;
      const license = repository.licensePolicy === 'ALLOW' ? 15 : repository.licensePolicy === 'REVIEW' ? 3 : -20;
      const architecture = repository.integrationMode === 'reference' ? 4 : 10;
      const compatibility = repository.requiresGpu ? -8 : 8;
      const score = taskFit + security + license + architecture + compatibility;
      return { repository, score, factors: { taskFit, security, license, architecture, compatibility } };
    })
    .filter((candidate) => candidate.factors.taskFit > 0)
    .sort((a, b) => b.score - a.score || a.repository.id.localeCompare(b.repository.id));
}

export function selectRoutingCandidate(required: string[], candidates: RoutingCandidate[], options: {
  preferLocal?: boolean; requirePrivacy?: boolean; maximumRisk?: keyof typeof RISK; excluded?: Set<string>;
} = {}): RoutingDecision {
  const normalized = normalizeCapabilities(required);
  const maxRisk = options.maximumRisk ?? 'critical';
  const ranked = candidates.map((candidate) => {
    const fitCount = normalized.filter((need) => candidate.capabilities.some((offered) => capabilityMatches(need, offered))).length;
    const fit = normalized.length ? fitCount / normalized.length : 1;
    const factors = {
      task_fit: fit * 40,
      specialization: (candidate.specialization ?? []).some((item) => normalized.some((need) => capabilityMatches(need, item))) ? 10 : 0,
      availability: candidate.available && candidate.enabled ? 12 : candidate.onDemand && candidate.enabled ? 6 : -100,
      health: candidate.healthy ? 8 : -20,
      historical_success: (candidate.historicalSuccess ?? 0.5) * 10,
      latency: -(candidate.latency ?? 0) * 4,
      cost: -(candidate.cost ?? 0) * 4,
      privacy: options.requirePrivacy ? (candidate.privacy ?? (candidate.local ? 1 : 0)) * 7 : 0,
      locality: options.preferLocal && candidate.local ? 6 : 0,
      resource_usage: -(candidate.resourceUsage ?? 0) * 3,
      risk: -RISK[candidate.risk ?? 'low'] * 5,
      compatibility: (candidate.compatibility ?? 1) * 8,
    };
    const blocked = RISK[candidate.risk ?? 'low'] > RISK[maxRisk] || options.excluded?.has(candidate.id);
    const score = blocked || fit === 0 ? -Infinity : Object.values(factors).reduce((sum, value) => sum + value, 0);
    const explanation = Object.entries(factors).filter(([, value]) => value !== 0).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).map(([name, value]) => `${name}=${value.toFixed(1)}`);
    return { candidate, score, factors, explanation };
  }).filter((item) => Number.isFinite(item.score)).sort((a, b) => b.score - a.score || a.candidate.id.localeCompare(b.candidate.id));
  return { selected: ranked[0]?.candidate ?? null, ranked, requiredCapabilities: normalized, fallbackChain: ranked.map((item) => item.candidate.id) };
}

export function routeTask(task: string, candidates: RoutingCandidate[]): RoutingDecision & { taskClass: string } {
  const inferred = inferTaskCapabilities(task);
  return { ...selectRoutingCandidate(inferred.capabilities, candidates), taskClass: inferred.taskClass };
}

export function selectTools(required: string[], candidates: RoutingCandidate[], options: Parameters<typeof selectRoutingCandidate>[2] = {}) {
  return selectRoutingCandidate(required, candidates.filter((candidate) => candidate.kind === 'tool'), options);
}

export function selectAgents(required: string[], candidates: RoutingCandidate[], options: Parameters<typeof selectRoutingCandidate>[2] = {}) {
  return selectRoutingCandidate(required, candidates.filter((candidate) => candidate.kind === 'agent'), options);
}

export function selectSkills(required: string[], candidates: RoutingCandidate[], options: Parameters<typeof selectRoutingCandidate>[2] = {}) {
  return selectRoutingCandidate(required, candidates.filter((candidate) => candidate.kind === 'skill'), options);
}

export function selectProviders(required: string[], candidates: RoutingCandidate[], options: Parameters<typeof selectRoutingCandidate>[2] = {}) {
  return selectRoutingCandidate(required, candidates.filter((candidate) => candidate.kind === 'provider'), options);
}

export function reduceToolContext(tools: ToolCapability[], required: string[], maximum = 8): ToolCapability[] {
  const normalized = normalizeCapabilities(required);
  return tools
    .map((tool) => ({ tool, score: normalized.reduce((score, need) => score + ([tool.key, tool.name, tool.description].some((value) => capabilityMatches(need, value) || value.toLowerCase().includes(need.split('.').at(-1) ?? need)) ? 1 : 0), 0) }))
    .filter((item) => item.tool.available && item.score > 0)
    .sort((a, b) => b.score - a.score || a.tool.key.localeCompare(b.tool.key))
    .slice(0, maximum)
    .map((item) => item.tool);
}

export async function executeFallback<T>(decision: RoutingDecision, execute: (candidate: RoutingCandidate) => Promise<T>, maxAttempts = 3) {
  const attempts: Array<{ candidateId: string; ok: boolean; error?: string }> = [];
  for (const candidate of decision.ranked.slice(0, Math.max(1, maxAttempts)).map((item) => item.candidate)) {
    try {
      const result = await execute(candidate);
      attempts.push({ candidateId: candidate.id, ok: true });
      return { result, selected: candidate.id, attempts };
    } catch (error) {
      attempts.push({ candidateId: candidate.id, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }
  throw new Error(`All capability implementations failed: ${attempts.map((attempt) => attempt.candidateId).join(', ') || 'none available'}`);
}
