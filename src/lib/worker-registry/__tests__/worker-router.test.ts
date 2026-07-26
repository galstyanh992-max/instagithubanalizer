import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkerRouter, RouteRequest } from '../worker-router';
import { WorkerRegistry } from '../index';
import { WorkerAdapter, WorkerHealth } from '../types';

describe('WorkerRouter', () => {
  let registry: WorkerRegistry;
  let router: WorkerRouter;
  let codexMock: any;
  let claudeMock: any;
  let agyMock: any;

  beforeEach(() => {
    codexMock = {
      id: 'codex_cli',
      healthCheck: vi.fn().mockResolvedValue({ status: 'ONLINE' })
    };
    claudeMock = {
      id: 'claude_code',
      healthCheck: vi.fn().mockResolvedValue({ status: 'ONLINE' })
    };
    agyMock = {
      id: 'ANTIGRAVITY_CLI',
      healthCheck: vi.fn().mockResolvedValue({ status: 'ONLINE' })
    };

    registry = {
      getAdapter: vi.fn((id: string) => {
        if (id === 'codex_cli') return codexMock;
        if (id === 'claude_code') return claudeMock;
        if (id === 'ANTIGRAVITY_CLI') return agyMock;
        return undefined;
      })
    } as any;

    router = new WorkerRouter(registry);
  });

  describe('Routing capabilities enforcement', () => {
    it('allows automatic routing to Antigravity for read-only review', async () => {
      // Simulate codex/claude offline to force fallback to agy
      codexMock.healthCheck.mockResolvedValue({ status: 'OFFLINE' });
      claudeMock.healthCheck.mockResolvedValue({ status: 'OFFLINE' });

      const req: RouteRequest = {
        category: 'IMPLEMENT_FEATURE',
        requiresFilesystemWrite: false,
        requiresCommandExecution: false
      };

      const result = await router.route(req);
      expect(result.selectedWorker.id).toBe('ANTIGRAVITY_CLI');
    });

    it('does not select Antigravity for automatic routing when requiresFilesystemWrite=true', async () => {
      codexMock.healthCheck.mockResolvedValue({ status: 'OFFLINE' });
      claudeMock.healthCheck.mockResolvedValue({ status: 'OFFLINE' });

      const req: RouteRequest = {
        category: 'IMPLEMENT_FEATURE',
        requiresFilesystemWrite: true
      };

      await expect(router.route(req)).rejects.toThrow('No available workers for IMPLEMENT_FEATURE');
    });

    it('returns WORKER_CAPABILITY_DENIED explicitly if owner selects Antigravity for mutation task', async () => {
      const req: RouteRequest = {
        category: 'DEEP_CODE_AUDIT',
        explicitOwnerSelection: 'ANTIGRAVITY_CLI',
        requiresFilesystemWrite: true
      };

      try {
        await router.route(req);
        expect.fail('Should have thrown WORKER_CAPABILITY_DENIED');
      } catch (err: any) {
        expect(err.status).toBe('WORKER_CAPABILITY_DENIED');
        expect(err.requestedWorker).toBe('ANTIGRAVITY');
        expect(err.requiredCapability).toBe('FILESYSTEM_WRITE');
        expect(err.policy).toBe('READ_ONLY_FAIL_CLOSED');
        expect(err.safeAlternatives).toEqual(['CODEX', 'CLAUDE_CODE']);
      }
    });
  });
});
