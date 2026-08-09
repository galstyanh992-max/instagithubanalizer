export const CAPABILITY_KINDS = [
  'provider', 'model', 'agent', 'skill', 'tool', 'mcp_server', 'mcp_tool',
  'plugin', 'browser', 'crawler', 'document_processor', 'voice', 'stt', 'tts',
  'media', 'filesystem', 'terminal', 'git', 'code_intelligence',
  'docker_service', 'automation', 'social', 'communication', 'system',
  'messaging', 'calls', 'video', 'design', 'monitoring', 'document_archive',
  'edge_ai', 'mobile', 'deployment', 'security_tool', 'trading_research',
] as const;

export type CapabilityKind = (typeof CAPABILITY_KINDS)[number];
export type HealthState = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN' | 'MISSING';
export type ProgramStatus =
  | 'DISCOVERED' | 'NOT_INSTALLED' | 'INSTALLING' | 'INSTALLED' | 'CONFIGURED' | 'READY' | 'RUNNING'
  | 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'BLOCKED'
  | 'STOPPED' | 'DISABLED' | 'MISSING' | 'QUARANTINED' | 'UNKNOWN';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type TrustLevel = 'internal' | 'verified' | 'community' | 'untrusted';
export type CostClass = 'free' | 'local' | 'subscription' | 'metered' | 'unknown';
export type LatencyClass = 'instant' | 'fast' | 'standard' | 'slow' | 'unknown';

export interface JsonSchema {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

export interface CapabilityRecord {
  id: string;
  name: string;
  kind: CapabilityKind;
  category: string;
  description: string;
  capabilities: string[];
  best_for: string[];
  not_for: string[];
  inputs: JsonSchema;
  outputs: JsonSchema;
  side_effects: string[];
  requirements: string[];
  compatible_os: string[];
  cpu_requirement: string;
  gpu_requirement: string;
  ram_requirement: string;
  dependencies: string[];
  compatible_agents: string[];
  compatible_providers: string[];
  risk: RiskLevel;
  trust_level: TrustLevel;
  installed: boolean;
  enabled: boolean;
  running: boolean;
  health: HealthState;
  version: string | null;
  source: string;
  repository: string | null;
  adapter: string;
  priority: number;
  cost_class: CostClass;
  latency_class: LatencyClass;
  success_rate: number;
  task_count: number;
  success_count: number;
  failure_count: number;
  last_used: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface OllamaModelDetails {
  name: string;
  size: number | null;
  parameter_size: string | null;
  quantization: string | null;
  loaded: boolean;
  estimated_ram: number | null;
  current_ram: number | null;
  context: number | null;
  recommended_use: string[];
}

export interface ProgramRecord {
  id: string;
  name: string;
  type: string;
  category: string;
  description: string;
  repository: string | null;
  source: string;
  installed: boolean;
  enabled: boolean;
  running: boolean;
  status: ProgramStatus;
  health: HealthState;
  health_message: string;
  version: string | null;
  available_version: string | null;
  install_path: string | null;
  executable: string | null;
  command: string | null;
  endpoint: string | null;
  port: number | null;
  pid: number | null;
  docker_container_id: string | null;
  docker_image: string | null;
  capabilities: string[];
  dependencies: string[];
  cpu_usage: number | null;
  ram_usage: number | null;
  disk_usage: number | null;
  last_seen: string | null;
  last_started: string | null;
  last_stopped: string | null;
  last_used: string | null;
  task_count: number;
  success_count: number;
  failure_count: number;
  success_rate: number;
  error: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RegistrySnapshot<T> {
  schemaVersion: 1;
  updatedAt: string;
  records: T[];
}

export interface RegistrySummary {
  total: number;
  installed: number;
  enabled: number;
  running: number;
  healthy: number;
  missing: number;
  byCategory: Record<string, number>;
}
