import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createProgramRecord, ProgramRegistry } from './program-registry';

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function registry(): Promise<ProgramRegistry> {
  const directory = await mkdtemp(join(tmpdir(), 'jarvis-program-registry-'));
  directories.push(directory);
  return new ProgramRegistry(join(directory, 'programs.json'));
}

describe('ProgramRegistry', () => {
  it('сохраняет состояние и статистику между экземплярами', async () => {
    const first = await registry();
    const path = (first as unknown as { store: { storagePath: string } }).store.storagePath;
    await first.upsert(createProgramRecord({ id: 'demo', name: 'Demo', type: 'tool', category: 'TOOLS', description: 'Test', installed: true }));
    await first.setEnabled('demo', false);
    await first.recordExecution('demo', true);

    const second = new ProgramRegistry(path);
    const restored = await second.get('demo');
    expect(restored).toMatchObject({ enabled: false, task_count: 1, success_count: 1, success_rate: 100 });
  });

  it('не удаляет исчезнувшую программу, а помечает MISSING', async () => {
    const target = await registry();
    await target.mergeDiscovery([createProgramRecord({ id: 'temporary', name: 'Temporary', type: 'tool', category: 'TOOLS', description: '', installed: true })]);
    await target.mergeDiscovery([]);
    expect(await target.get('temporary')).toMatchObject({ installed: false, running: false, status: 'MISSING', health: 'MISSING' });
  });

  it('reconciles a recreated Docker container by its unique discovery name', async () => {
    const target = await registry();
    await target.mergeDiscovery([createProgramRecord({
      id: 'docker:old-id', name: 'jarvis-runtime', type: 'docker_service', category: 'DOCKER SERVICES',
      description: 'Old container', installed: true, source: 'docker-discovery',
    })]);

    const records = await target.mergeDiscovery([createProgramRecord({
      id: 'docker:new-id', name: 'JARVIS-RUNTIME', type: 'docker_service', category: 'DOCKER SERVICES',
      description: 'Recreated container', installed: true, source: 'docker-discovery',
    })]);

    expect(records.map((record) => record.id)).toEqual(['docker:new-id']);
  });
});
