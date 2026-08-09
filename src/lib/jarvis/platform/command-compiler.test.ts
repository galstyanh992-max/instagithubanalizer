import { describe, expect, it } from 'vitest';
import { createCapabilityRecord } from './capability-registry';
import { compileCommands } from './command-compiler';

describe('command compiler', () => {
  it('генерирует команды только из включённых установленных возможностей', () => {
    const commands = compileCommands([
      createCapabilityRecord({ id: 'browser', name: 'Browser', kind: 'browser', category: 'BROWSERS', description: '', installed: true, capabilities: ['research'] }),
      createCapabilityRecord({ id: 'off', name: 'Off', kind: 'tool', category: 'TOOLS', description: '', installed: true, enabled: false, capabilities: ['hidden'] }),
    ]);
    expect(commands).toEqual([{ command: '/browser research', capabilityId: 'browser', description: '' }]);
  });
});
