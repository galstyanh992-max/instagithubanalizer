import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CapabilityRegistry, createCapabilityRecord } from './capability-registry';
import { CapabilityRouter } from './capability-router';
import { createProgramRecord, ProgramRegistry } from './program-registry';

describe('динамическая регистрация Dashboard', () => {
  it('регистрирует, отключает, включает и удаляет dummy без изменений frontend', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'jarvis-dashboard-e2e-'));
    try {
      const programs = new ProgramRegistry(join(directory, 'programs.json'));
      const capabilities = new CapabilityRegistry(join(directory, 'capabilities.json'));
      const router = new CapabilityRouter(() => capabilities.list());
      const id = 'e2e-dummy';

      await programs.upsert(createProgramRecord({ id, name: 'E2E Dummy', type: 'tool', category: 'TOOLS', description: 'Dynamic', source: 'e2e-test', installed: true, running: true, status: 'ONLINE', health: 'HEALTHY' }));
      await capabilities.upsert(createCapabilityRecord({ id, name: 'E2E Dummy', kind: 'tool', category: 'TOOLS', description: 'Dynamic', source: 'e2e-test', installed: true, health: 'HEALTHY', capabilities: ['e2e_action'] }));
      expect((await programs.list()).some((item) => item.id === id)).toBe(true);

      await capabilities.setEnabled(id, false);
      expect(await router.select({ required: ['e2e_action'] })).toBeNull();
      await capabilities.setEnabled(id, true);
      expect((await router.select({ required: ['e2e_action'] }))?.capability.id).toBe(id);

      await Promise.all([programs.remove(id), capabilities.remove(id)]);
      expect((await programs.list()).some((item) => item.id === id)).toBe(false);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
