import { WorkerAdapter } from './types';
import { env } from '@/lib/env';
import { AntigravityPilotAdapter } from './adapters/antigravity-bridge';

function isForbidden(): boolean {
  return env.JARVIS_RUNTIME_ROLE === 'web-control-plane';
}

export class WorkerRegistry {
  private adapters: Map<string, WorkerAdapter> = new Map();
  private localAdaptersReady: Promise<void> | null = null;

  constructor() {
    // AntigravityPilotAdapter is a manual-bridge adapter with no local
    // process execution of its own — safe to register eagerly.
    this.register(new AntigravityPilotAdapter());
  }

  public register(adapter: WorkerAdapter) {
    this.adapters.set(adapter.id, adapter);
  }

  /**
   * Codex CLI / Claude Code / Antigravity CLI adapters spawn local
   * processes — local-runtime only. Registration is deferred behind a
   * dynamic import so this module never statically pulls child_process
   * into a Vercel bundle, and fails closed (no adapters registered) on
   * web-control-plane. Callers that need these adapters (getAdapter/
   * getAllAdapters) must await this first.
   */
  public async ensureLocalWorkersRegistered(): Promise<void> {
    if (isForbidden()) return;
    if (!this.localAdaptersReady) {
      this.localAdaptersReady = (async () => {
        const [{ CodexWorkerAdapter }, { ClaudeCodeWorkerAdapter }, { AntigravityWorkerAdapter }] = await Promise.all([
          import('@/local-runtime/worker-registry/adapters/codex-cli'),
          import('@/local-runtime/worker-registry/adapters/claude-code'),
          import('@/local-runtime/worker-registry/adapters/antigravity-cli'),
        ]);
        this.register(new CodexWorkerAdapter());
        this.register(new ClaudeCodeWorkerAdapter());
        this.register(new AntigravityWorkerAdapter());
      })();
    }
    return this.localAdaptersReady;
  }

  public getAdapter(id: string): WorkerAdapter | undefined {
    return this.adapters.get(id);
  }

  public getAllAdapters(): WorkerAdapter[] {
    return Array.from(this.adapters.values());
  }
}

export const globalWorkerRegistry = new WorkerRegistry();
