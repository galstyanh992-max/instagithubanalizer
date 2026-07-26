import { WorkerAdapter } from './types';
import { CodexWorkerAdapter } from './adapters/codex-cli';
import { ClaudeCodeWorkerAdapter } from './adapters/claude-code';
import { AntigravityWorkerAdapter } from './adapters/antigravity-cli';
import { AntigravityPilotAdapter } from './adapters/antigravity-bridge';

export class WorkerRegistry {
  private adapters: Map<string, WorkerAdapter> = new Map();

  constructor() {
    this.register(new CodexWorkerAdapter());
    this.register(new ClaudeCodeWorkerAdapter());
    this.register(new AntigravityWorkerAdapter());
    this.register(new AntigravityPilotAdapter());
  }

  public register(adapter: WorkerAdapter) {
    this.adapters.set(adapter.id, adapter);
  }

  public getAdapter(id: string): WorkerAdapter | undefined {
    return this.adapters.get(id);
  }

  public getAllAdapters(): WorkerAdapter[] {
    return Array.from(this.adapters.values());
  }
}

export const globalWorkerRegistry = new WorkerRegistry();
