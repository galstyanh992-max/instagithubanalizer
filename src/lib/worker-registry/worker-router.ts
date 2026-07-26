import { WorkerRegistry } from './index';
import { WorkerAdapter } from './types';

export type TaskCategory = 'IMPLEMENT_FEATURE' | 'CODE_REVIEW' | 'DEEP_CODE_AUDIT';

export interface RouteRequest {
  category: TaskCategory;
  authorWorkerId?: string;
  explicitOwnerSelection?: string;
  requestedCapabilities?: string[];
  requiresFilesystemWrite?: boolean;
  requiresCommandExecution?: boolean;
}

export interface RouteResult {
  selectedWorker: WorkerAdapter;
  role: 'PRIMARY' | 'FALLBACK' | 'EXPLICIT_SELECTION';
  reason: string;
}

export class WorkerCapabilityError extends Error {
  public status = 'WORKER_CAPABILITY_DENIED';
  constructor(
    public requestedWorker: string,
    public requiredCapability: string,
    public policy: string,
    public safeAlternatives: string[]
  ) {
    super('WORKER_CAPABILITY_DENIED');
  }
}

export class WorkerRouter {
  constructor(private registry: WorkerRegistry) {}

  public async route(req: RouteRequest): Promise<RouteResult> {
    const codex = this.registry.getAdapter('codex_cli');
    const claude = this.registry.getAdapter('claude_code');
    const antigravity = this.registry.getAdapter('ANTIGRAVITY_CLI');

    if (req.category === 'IMPLEMENT_FEATURE') {
      // Primary CODEX, fallback CLAUDE_CODE, optional ANTIGRAVITY_CLI
      if (codex) {
        const h = await codex.healthCheck();
        if (h.status === 'ONLINE') {
          return { selectedWorker: codex, role: 'PRIMARY', reason: 'CODEX selected as primary for IMPLEMENT_FEATURE' };
        }
      }

      if (claude) {
        const h = await claude.healthCheck();
        if (h.status === 'ONLINE') {
          return { selectedWorker: claude, role: 'FALLBACK', reason: 'CLAUDE_CODE selected as fallback for IMPLEMENT_FEATURE' };
        }
      }

      if (antigravity && !req.requiresFilesystemWrite && !req.requiresCommandExecution) {
        const h = await antigravity.healthCheck();
        if (h.status === 'ONLINE') {
          return { selectedWorker: antigravity, role: 'FALLBACK', reason: 'ANTIGRAVITY_CLI selected as optional for IMPLEMENT_FEATURE' };
        }
      }

      throw new Error('No available workers for IMPLEMENT_FEATURE');
    }

    if (req.category === 'CODE_REVIEW') {
      // Reviewer worker must differ from task author worker
      const candidates = [codex, claude, antigravity].filter(w => w !== undefined) as WorkerAdapter[];

      for (const worker of candidates) {
        if (worker.id !== req.authorWorkerId) {
          // Deny Antigravity if mutation is needed
          if (worker.id === 'ANTIGRAVITY_CLI' && (req.requiresFilesystemWrite || req.requiresCommandExecution)) {
            continue;
          }
          const h = await worker.healthCheck();
          if (h.status === 'ONLINE') {
            return {
              selectedWorker: worker,
              role: 'PRIMARY',
              reason: `Selected reviewer worker ${worker.id} distinct from author ${req.authorWorkerId}`
            };
          }
        }
      }
      throw new Error(`No reviewer worker available distinct from author ${req.authorWorkerId}`);
    }

    if (req.category === 'DEEP_CODE_AUDIT') {
      // ANTIGRAVITY_CLI permitted on explicit owner selection
      if (req.explicitOwnerSelection === 'ANTIGRAVITY_CLI' && antigravity) {
        if (req.requiresFilesystemWrite || req.requiresCommandExecution) {
          throw new WorkerCapabilityError(
            'ANTIGRAVITY',
            req.requiresFilesystemWrite ? 'FILESYSTEM_WRITE' : 'COMMAND_EXECUTION',
            'READ_ONLY_FAIL_CLOSED',
            ['CODEX', 'CLAUDE_CODE']
          );
        }

        const h = await antigravity.healthCheck();
        if (h.status === 'ONLINE') {
          return {
            selectedWorker: antigravity,
            role: 'EXPLICIT_SELECTION',
            reason: 'ANTIGRAVITY_CLI explicitly selected by owner for DEEP_CODE_AUDIT'
          };
        } else {
          throw new Error(`ANTIGRAVITY_CLI selected by owner but health check failed: ${h.errorMessage}`);
        }
      }

      if (claude) {
        const h = await claude.healthCheck();
        if (h.status === 'ONLINE') {
          return { selectedWorker: claude, role: 'PRIMARY', reason: 'CLAUDE_CODE selected for DEEP_CODE_AUDIT' };
        }
      }

      if (codex) {
        const h = await codex.healthCheck();
        if (h.status === 'ONLINE') {
          return { selectedWorker: codex, role: 'FALLBACK', reason: 'CODEX selected for DEEP_CODE_AUDIT' };
        }
      }
    }

    throw new Error(`Unable to route task category ${req.category}`);
  }
}
