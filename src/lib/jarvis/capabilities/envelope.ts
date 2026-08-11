// Shared, pure-data contract for the remote "capability command" protocol —
// the versioned envelope that lets a task created via the web control plane
// (Vercel) tell the HOME-PC daemon exactly what real local capability to
// invoke, with what arguments, and at what declared risk level.
//
// This file has zero local I/O (no fs/child_process/network) so it is safe
// to import from both the Next.js app (src/app/api/devices/[id]/commands)
// and the daemon (src/daemon/capabilities/**) — a single source of truth for
// the wire format instead of two hand-maintained copies. See
// docs/jarvis/remote-architecture.md for the full chain description.
//
// Wire format: AgentTask.title carries `CAPABILITY:<capability>:<operation>`
// (kept short and log-friendly, mirrors the existing NOOP/HEALTH_CHECK/
// WRITE_TEST_ARTIFACT/READ_METADATA mock-command convention already used by
// src/daemon/poller/index.ts), AgentTask.request carries the full envelope
// as a JSON string (the `request` column already existed in the schema,
// unused until now).

export const CAPABILITY_PROTOCOL_VERSION = 1 as const;

export type CapabilityId = 'system' | 'ollama' | 'filesystem' | 'mcp' | 'browser' | 'n8n';

export type OperationRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CapabilityCommandEnvelope {
  protocolVersion: typeof CAPABILITY_PROTOCOL_VERSION;
  capability: CapabilityId;
  operation: string;
  arguments?: Record<string, unknown>;
  requestId?: string;
  context?: {
    source?: string; // e.g. "chat", "manual-e2e"
    locale?: string;
  };
}

export interface CapabilityOperationDefinition {
  capability: CapabilityId;
  operation: string;
  description: string;
  riskLevel: OperationRiskLevel;
  // Whether this operation changes local machine state (starts a process,
  // opens a browser tab, runs a workflow) vs. pure read/introspection.
  mutates: boolean;
}

// The full, explicit allow-list of capability/operation pairs the daemon
// will execute. Anything not listed here is rejected before any adapter is
// touched — this is the "no remote raw shell / no six hard-coded brains,
// but also no unbounded surface" boundary. Risk levels feed directly into
// checkPermission() (src/lib/safety/permission-checker.ts) at dispatch time
// in the daemon; every operation below is deliberately scoped narrow enough
// (fixed safe URL, one fixture workflow id, one-level workspace-root listing,
// read-only introspection) to be genuinely LOW risk rather than merely
// labeled LOW.
export const CAPABILITY_OPERATIONS: CapabilityOperationDefinition[] = [
  { capability: 'system', operation: 'status', description: 'Реальное состояние системы JARVIS/HOME-PC', riskLevel: 'LOW', mutates: false },
  { capability: 'ollama', operation: 'health', description: 'Проверка доступности локального Ollama', riskLevel: 'LOW', mutates: false },
  { capability: 'ollama', operation: 'models', description: 'Список установленных моделей Ollama', riskLevel: 'LOW', mutates: false },
  { capability: 'filesystem', operation: 'list', description: 'Листинг корня рабочей папы JARVIS (один уровень)', riskLevel: 'LOW', mutates: false },
  { capability: 'mcp', operation: 'list', description: 'Статус подключённых MCP-серверов и их инструментов', riskLevel: 'LOW', mutates: false },
  { capability: 'browser', operation: 'open', description: 'Открыть безопасную тестовую страницу в браузере JARVIS', riskLevel: 'LOW', mutates: true },
  { capability: 'browser', operation: 'status', description: 'Статус текущей вкладки браузера JARVIS', riskLevel: 'LOW', mutates: false },
  { capability: 'browser', operation: 'stop', description: 'Закрыть текущую вкладку браузера JARVIS', riskLevel: 'LOW', mutates: true },
  { capability: 'n8n', operation: 'health', description: 'Текущее состояние n8n (запущен/остановлен), без изменений', riskLevel: 'LOW', mutates: false },
  { capability: 'n8n', operation: 'smoke', description: 'Запустить n8n, выполнить проверенный smoke-workflow, остановить n8n', riskLevel: 'LOW', mutates: true },
];

export function findCapabilityOperation(capability: string, operation: string): CapabilityOperationDefinition | undefined {
  return CAPABILITY_OPERATIONS.find((entry) => entry.capability === capability && entry.operation === operation);
}

export function buildCapabilityTitle(capability: CapabilityId, operation: string): string {
  return `CAPABILITY:${capability}:${operation}`;
}

const TITLE_RE = /^CAPABILITY:([a-z]+):([a-z_]+)$/;

export function parseCapabilityTitle(title: string): { capability: string; operation: string } | null {
  const match = TITLE_RE.exec(title.trim());
  if (!match) return null;
  return { capability: match[1], operation: match[2] };
}

export function buildCapabilityEnvelope(
  capability: CapabilityId,
  operation: string,
  args?: Record<string, unknown>,
  context?: CapabilityCommandEnvelope['context'],
): CapabilityCommandEnvelope {
  return {
    protocolVersion: CAPABILITY_PROTOCOL_VERSION,
    capability,
    operation,
    arguments: args,
    context,
  };
}
