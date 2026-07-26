import { globalWorkerRegistry } from './index';
import { WorkerHealth, ModelProfile, WorkerResult } from './types';

export interface WorkerUIItem {
  id: string;
  displayName: string;
  installed: boolean;
  version: string;
  authenticated: boolean;
  available: boolean;
  mode: string;
  selectedModelProfile: ModelProfile;
  currentTask: string | null;
  lastResult: WorkerResult | null;
}

export class WorkersUIManager {
  public async getWorkerStates(): Promise<WorkerUIItem[]> {
    const adapters = globalWorkerRegistry.getAllAdapters();
    const states: WorkerUIItem[] = [];

    for (const adapter of adapters) {
      let health: WorkerHealth = { status: 'OFFLINE' };
      try {
        health = await adapter.healthCheck();
      } catch {
        health = { status: 'OFFLINE' };
      }

      const installed = health.status !== 'UNAVAILABLE';
      const authenticated = health.status === 'ONLINE';
      const available = health.status === 'ONLINE';

      let mode = 'STANDALONE_CLI';
      if (adapter.id === 'ANTIGRAVITY_CLI') {
        mode = 'OFFICIAL_HEADLESS';
      } else if (adapter.id === 'antigravity_pilot') {
        mode = 'MANUAL_BRIDGE';
      }

      states.push({
        id: adapter.id,
        displayName: adapter.displayName,
        installed,
        version: health.version || 'unknown',
        authenticated,
        available,
        mode,
        selectedModelProfile: 'BALANCED',
        currentTask: null,
        lastResult: null
      });
    }

    return states;
  }
}
