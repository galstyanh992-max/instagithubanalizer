import { describe, it, expect } from 'vitest';
import {
  validateRunLimits,
  validateRequestLimits,
  filterToolsByRisk,
  isToolAllowedForAgent,
  validateCommandSafety,
  canAccessRun,
  DEFAULT_SECURITY_LIMITS,
} from './security';
import { jarvisAgentRegistry } from './agent-registry';

describe('security limits', () => {
  it('rejects too many tasks', () => {
    const result = validateRunLimits(1000, 5);
    expect(result.ok).toBe(false);
    expect(result.violations[0]).toMatch(/taskCount/);
  });

  it('accepts within limits', () => {
    const result = validateRunLimits(10, 5);
    expect(result.ok).toBe(true);
  });

  it('rejects excessive timeout', () => {
    const result = validateRequestLimits({
      runId: 'r1',
      taskId: 't1',
      agentId: 'a1',
      role: 'frontend_engineer',
      mission: 'test',
      confirmedContext: {},
      inputArtifacts: [],
      availableTools: [],
      allowedScope: [],
      forbiddenActions: [],
      expectedOutput: {},
      acceptanceCriteria: [],
      verificationMethod: 'self_check',
      exitCriteria: [],
      timeoutMs: 9999999,
      maxRetries: 1,
    });
    expect(result.ok).toBe(false);
  });
});

describe('tool filtering', () => {
  it('blocks critical tools by default', () => {
    const tools = [
      {
        key: 'safe.read',
        name: 'Safe Read',
        source: 'default' as const,
        category: 'filesystem',
        description: '',
        inputSchema: { type: 'object' as const, properties: {} },
        requiredPermission: 'read' as const,
        riskLevel: 'low' as const,
        requiresApproval: false,
        available: true,
        timeoutMs: 60000,
        retryPolicy: { maxRetries: 1, backoffMs: 500 },
      },
      {
        key: 'terminal.run',
        name: 'Terminal',
        source: 'default' as const,
        category: 'terminal',
        description: '',
        inputSchema: { type: 'object' as const, properties: {} },
        requiredPermission: 'write' as const,
        riskLevel: 'critical' as const,
        requiresApproval: true,
        available: true,
        timeoutMs: 60000,
        retryPolicy: { maxRetries: 1, backoffMs: 500 },
      },
    ];

    const filtered = filterToolsByRisk(tools);
    expect(filtered.find((t) => t.key === 'safe.read')?.available).toBe(true);
    expect(filtered.find((t) => t.key === 'terminal.run')?.available).toBe(false);
  });
});

describe('command safety', () => {
  it('flags destructive command patterns', () => {
    expect(validateCommandSafety('rm -rf /').safe).toBe(false);
    expect(validateCommandSafety('npm run typecheck').safe).toBe(true);
  });
});

describe('ownership', () => {
  it('allows owner access', () => {
    expect(canAccessRun('user-1', { userId: 'user-1' })).toBe(true);
  });

  it('denies non-owner access', () => {
    expect(canAccessRun('user-1', { userId: 'user-2' })).toBe(false);
  });
});
