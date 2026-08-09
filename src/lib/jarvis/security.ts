// ─── JARVIS Agent Network — Security Hardening ───────────────
// Limit enforcement, allowlists, and ownership guards for the network layer.

import type { AgentDefinition, AgentRequest, ToolCapability } from './types';

export interface SecurityLimits {
  maxRunsPerHour: number;
  maxTasksPerRun: number;
  maxAgentsPerRun: number;
  maxRetriesPerTask: number;
  maxTimeoutMs: number;
  allowedToolRiskLevels: Array<'low' | 'medium' | 'high' | 'critical'>;
  forbiddenToolPatterns: string[];
  forbiddenActionPatterns: string[];
}

export const DEFAULT_SECURITY_LIMITS: SecurityLimits = {
  maxRunsPerHour: 100,
  maxTasksPerRun: 50,
  maxAgentsPerRun: 25,
  maxRetriesPerTask: 5,
  maxTimeoutMs: 600000,
  allowedToolRiskLevels: ['low', 'medium', 'high'],
  forbiddenToolPatterns: ['terminal.run', 'database.query', 'deployment.deploy'],
  forbiddenActionPatterns: [
    'delete_production_database',
    'force_push_git',
    'expose_secrets',
    'run_untrusted_binaries',
    'modify_production_env',
    'disable_authentication',
    'rm -rf',
    'drop table',
    'truncate table',
  ],
};

export interface AuthorizationContext {
  userId: string;
  workspaceId?: string;
  roles?: string[];
}

// ─── Limits ──────────────────────────────────────────────────

export function validateRunLimits(
  taskCount: number,
  agentCount: number,
  limits: Partial<SecurityLimits> = {}
): { ok: boolean; violations: string[] } {
  const effective = { ...DEFAULT_SECURITY_LIMITS, ...limits };
  const violations: string[] = [];

  if (taskCount > effective.maxTasksPerRun) {
    violations.push(`taskCount ${taskCount} exceeds max ${effective.maxTasksPerRun}`);
  }
  if (agentCount > effective.maxAgentsPerRun) {
    violations.push(`agentCount ${agentCount} exceeds max ${effective.maxAgentsPerRun}`);
  }

  return { ok: violations.length === 0, violations };
}

export function validateRequestLimits(
  request: AgentRequest,
  limits: Partial<SecurityLimits> = {}
): { ok: boolean; violations: string[] } {
  const effective = { ...DEFAULT_SECURITY_LIMITS, ...limits };
  const violations: string[] = [];

  if (request.timeoutMs > effective.maxTimeoutMs) {
    violations.push(`timeoutMs ${request.timeoutMs} exceeds max ${effective.maxTimeoutMs}`);
  }
  if (request.maxRetries > effective.maxRetriesPerTask) {
    violations.push(`maxRetries ${request.maxRetries} exceeds max ${effective.maxRetriesPerTask}`);
  }

  return { ok: violations.length === 0, violations };
}

// ─── Tool Allowlist ──────────────────────────────────────────

export function filterToolsByRisk(
  tools: ToolCapability[],
  allowedLevels: Array<'low' | 'medium' | 'high' | 'critical'> = DEFAULT_SECURITY_LIMITS.allowedToolRiskLevels
): ToolCapability[] {
  return tools.map((tool) => {
    const allowed = allowedLevels.includes(tool.riskLevel);
    return {
      ...tool,
      available: tool.available && allowed,
      unavailableReason: tool.available
        ? allowed
          ? undefined
          : `Risk level ${tool.riskLevel} not allowed`
        : tool.unavailableReason,
    };
  });
}

export function isToolAllowedForAgent(
  toolKey: string,
  agent: AgentDefinition,
  limits: Partial<SecurityLimits> = {}
): { allowed: boolean; reason?: string } {
  const effective = { ...DEFAULT_SECURITY_LIMITS, ...limits };

  if (effective.forbiddenToolPatterns.some((pattern) => toolKey.includes(pattern))) {
    return { allowed: false, reason: `Tool matches forbidden pattern: ${toolKey}` };
  }

  if (!agent.allowedTools.includes(toolKey) && !agent.capabilities.includes(toolKey)) {
    return { allowed: false, reason: `Tool ${toolKey} not in agent allowedTools or capabilities` };
  }

  if (agent.forbiddenActions.some((a) => toolKey.includes(a))) {
    return { allowed: false, reason: `Tool ${toolKey} matches agent forbidden action` };
  }

  return { allowed: true };
}

// ─── Action Validation ───────────────────────────────────────

export function validateCommandSafety(
  command: string,
  forbiddenPatterns: string[] = DEFAULT_SECURITY_LIMITS.forbiddenActionPatterns
): { safe: boolean; matchedPattern?: string } {
  const lower = command.toLowerCase();
  for (const pattern of forbiddenPatterns) {
    if (lower.includes(pattern.toLowerCase())) {
      return { safe: false, matchedPattern: pattern };
    }
  }
  return { safe: true };
}

// ─── Ownership ───────────────────────────────────────────────

export function canAccessRun(
  runOwnerId: string | null | undefined,
  context: AuthorizationContext
): boolean {
  if (!runOwnerId) return true; // Public / system runs
  return runOwnerId === context.userId;
}

export function requireOwnership(runOwnerId: string | null | undefined, context: AuthorizationContext): void {
  if (!canAccessRun(runOwnerId, context)) {
    throw new Error('Access denied: user does not own this run');
  }
}
