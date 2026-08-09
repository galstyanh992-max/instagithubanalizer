import type { CapabilityRecord, RiskLevel } from '../platform/types';

export const REPOSITORY_STATES = [
  'DISCOVERED', 'UNVERIFIED', 'SCANNING', 'VERIFIED', 'REFERENCE_ONLY', 'CANDIDATE',
  'STAGED', 'TESTING', 'APPROVED', 'ENABLED', 'DISABLED', 'REJECTED', 'QUARANTINED',
  'DEPRECATED', 'MISSING',
] as const;

export type RepositoryState = (typeof REPOSITORY_STATES)[number];
export type CapabilityAvailability =
  | 'AVAILABLE'
  | 'AVAILABLE_DEGRADED'
  | 'AVAILABLE_BUT_DISABLED'
  | 'AVAILABLE_ON_DEMAND'
  | 'MISSING'
  | 'UNSUITABLE';

export interface RepositoryKnowledgeRecord {
  id: string;
  name: string;
  repository: string;
  url: string;
  description: string;
  lifecycle: RepositoryState;
  tier: 'C1' | 'C2' | 'DISCOVERY';
  capabilities: string[];
  integrationMode: 'adapter' | 'mcp' | 'cli' | 'api' | 'reference';
  license: string;
  licensePolicy: 'ALLOW' | 'REVIEW' | 'BLOCK' | 'UNKNOWN';
  trust: 'verified' | 'community' | 'untrusted';
  localFirst: boolean;
  requiresDocker: boolean;
  requiresGpu: boolean;
  hasInstallScripts: boolean;
  securityFindings: string[];
  compatibilityNotes: string[];
  sourceCommit: string | null;
  artifactDigest: string | null;
  lastVerifiedAt: string | null;
  autoInstallAllowed: false;
  autoActivationAllowed: false;
}

export interface CapabilityGap {
  capability: string;
  availability: CapabilityAvailability;
  implementations: CapabilityRecord[];
  candidates: RepositoryKnowledgeRecord[];
  reason: string;
}

export interface ExecutionFeedback {
  id: string;
  capabilityId: string;
  taskClass: string;
  success: boolean;
  durationMs: number;
  failureClass?: 'timeout' | 'unavailable' | 'rate_limit' | 'invalid_output' | 'policy' | 'runtime' | 'unknown';
  occurredAt: string;
  // Deliberately operational-only. Raw prompts, outputs, credentials and PII are forbidden.
  metadata?: Record<string, string | number | boolean | null>;
}

export interface RoutingCandidate {
  id: string;
  kind: 'tool' | 'agent' | 'skill' | 'provider';
  capabilities: string[];
  specialization?: string[];
  available: boolean;
  enabled: boolean;
  healthy: boolean;
  onDemand?: boolean;
  local?: boolean;
  privacy?: number;
  latency?: number;
  cost?: number;
  resourceUsage?: number;
  risk?: RiskLevel;
  compatibility?: number;
  historicalSuccess?: number;
}

export interface RoutingDecision {
  selected: RoutingCandidate | null;
  ranked: Array<{
    candidate: RoutingCandidate;
    score: number;
    factors: Record<string, number>;
    explanation: string[];
  }>;
  requiredCapabilities: string[];
  fallbackChain: string[];
}

export interface RepositoryFixture {
  repository: string;
  license?: string;
  files: Record<string, string>;
  sourceCommit?: string;
  snapshotDigest?: string;
  provenance?: 'scanner';
  complete?: boolean;
}

export interface CuratorAssessment {
  repository: string;
  verdict: 'CANDIDATE' | 'REFERENCE_ONLY' | 'QUARANTINED' | 'REJECTED';
  licensePolicy: RepositoryKnowledgeRecord['licensePolicy'];
  risk: RiskLevel;
  findings: string[];
  inspectedFiles: string[];
  sourceCommit: string | null;
  snapshotDigest: string;
  snapshotComplete: boolean;
  installAllowed: false;
  activationAllowed: false;
}
