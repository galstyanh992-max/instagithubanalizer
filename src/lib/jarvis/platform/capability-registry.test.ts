import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CapabilityRegistry, createCapabilityRecord } from './capability-registry';

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function registry(): Promise<CapabilityRegistry> {
  const directory = await mkdtemp(join(tmpdir(), 'jarvis-capability-registry-'));
  directories.push(directory);
  return new CapabilityRegistry(join(directory, 'capabilities.json'));
}

describe('CapabilityRegistry', () => {
  it('reconciles the capability record of a recreated Docker container', async () => {
    const target = await registry();
    await target.mergeDiscovery([createCapabilityRecord({
      id: 'docker:old-id', name: 'jarvis-runtime', kind: 'docker_service', category: 'DOCKER SERVICES',
      description: 'Old container', installed: true, source: 'docker-discovery',
    })]);

    const records = await target.mergeDiscovery([createCapabilityRecord({
      id: 'docker:new-id', name: 'JARVIS-RUNTIME', kind: 'docker_service', category: 'DOCKER SERVICES',
      description: 'Recreated container', installed: true, source: 'docker-discovery',
    })]);

    expect(records.map((record) => record.id)).toEqual(['docker:new-id']);
  });
});
