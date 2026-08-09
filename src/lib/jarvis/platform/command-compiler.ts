import type { CapabilityRecord } from './types';

export interface CompiledCommand {
  command: string;
  capabilityId: string;
  description: string;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9а-яё._-]+/giu, '-').replace(/^-|-$/g, '');
}

export function compileCommands(capabilities: CapabilityRecord[]): CompiledCommand[] {
  const seen = new Set<string>();
  const commands: CompiledCommand[] = [];
  for (const capability of capabilities.filter((item) => item.enabled && item.installed)) {
    const operations = capability.capabilities.length > 0 ? capability.capabilities : [capability.id];
    for (const operation of operations) {
      const command = `/${slug(capability.kind)} ${slug(operation)}`;
      if (seen.has(command)) continue;
      seen.add(command);
      commands.push({ command, capabilityId: capability.id, description: capability.description });
    }
  }
  return commands.sort((a, b) => a.command.localeCompare(b.command));
}
