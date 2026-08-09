import type { CapabilityRecord, ProgramRecord } from '../platform/types';

export function dashboardRealitySample(programs: ProgramRecord[], capabilities: CapabilityRecord[], sampleSize = 15) {
  const capabilityById = new Map(capabilities.map((record) => [record.id, record]));
  const sample = [...programs].sort((a, b) => a.id.localeCompare(b.id)).slice(0, Math.max(0, sampleSize));
  const records = sample.map((program) => {
    const capability = capabilityById.get(program.id);
    const matches = Boolean(
      capability
      && capability.enabled === program.enabled
      && capability.installed === program.installed
      && capability.health === program.health,
    );
    return { id: program.id, matches, programStatus: program.status, runtimeHealth: program.health, capabilityHealth: capability?.health ?? 'MISSING' };
  });
  return { matched: records.filter((record) => record.matches).length, checked: records.length, records };
}
