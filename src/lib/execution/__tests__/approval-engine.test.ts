import { describe, it, expect, beforeAll } from 'vitest';
import { ApprovalEngine } from '../approval-engine';
import { ExecutionPlan, ExecutionStep } from '@/generated/prisma';

describe('ApprovalEngine (Phase 04 Integration)', () => {
  it('generates consistent fingerprints for the same plan', () => {
    const plan: ExecutionPlan = {
      id: 'plan_1',
      version: 1,
      ownerUserId: 'u1',
      taskId: 't1',
      runId: 'r1',
      deviceId: 'd1',
      workerType: 'system',
      capabilityIds: '["CAP_TEST"]',
      riskLevel: 'R1_LOW',
      workspaceRoot: '/test',
      limits: '{"cpu": 1}',
      fingerprint: '',
      expiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const steps: ExecutionStep[] = [
      {
        id: 'step_1',
        planId: 'plan_1',
        type: 'COMMAND',
        executableId: 'NPM_TYPECHECK',
        args: '["run", "typecheck"]',
        cwdRelative: '.',
        environmentProfile: 'MINIMAL',
        timeoutMs: 30000,
        expectedOutputs: '[]',
        dependencies: '[]',
        sequence: 1
      }
    ];

    const hash1 = ApprovalEngine.generateFingerprint(plan, steps);
    const hash2 = ApprovalEngine.generateFingerprint(plan, steps);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex length
  });

  it('generates different fingerprints for altered steps', () => {
    const plan: ExecutionPlan = {
      id: 'plan_1',
      version: 1,
      ownerUserId: 'u1',
      taskId: 't1',
      runId: 'r1',
      deviceId: 'd1',
      workerType: 'system',
      capabilityIds: '["CAP_TEST"]',
      riskLevel: 'R1_LOW',
      workspaceRoot: '/test',
      limits: '{"cpu": 1}',
      fingerprint: '',
      expiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const steps1: ExecutionStep[] = [
      {
        id: 'step_1',
        planId: 'plan_1',
        type: 'COMMAND',
        executableId: 'NPM_TYPECHECK',
        args: '["run", "typecheck"]',
        cwdRelative: '.',
        environmentProfile: 'MINIMAL',
        timeoutMs: 30000,
        expectedOutputs: '[]',
        dependencies: '[]',
        sequence: 1
      }
    ];

    const steps2 = [...steps1];
    steps2[0] = { ...steps2[0], args: '["run", "test"]' }; // Altered argument

    const hash1 = ApprovalEngine.generateFingerprint(plan, steps1);
    const hash2 = ApprovalEngine.generateFingerprint(plan, steps2);

    expect(hash1).not.toBe(hash2);
  });
});

