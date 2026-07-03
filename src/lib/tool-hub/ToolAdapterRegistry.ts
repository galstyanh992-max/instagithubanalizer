// Agent OS - Tool Adapter Registry
// Resolves tool keys to adapter instances. Default adapters are loaded lazily
// so API route bundles do not trace filesystem/project tooling at import time.

import type { ToolAdapter } from './types';

type AdapterLoader = () => Promise<ToolAdapter>;
type AdapterModuleName = 'filesystem' | 'git' | 'project' | 'index';

interface DefaultAdapterRef {
  moduleName: AdapterModuleName;
  exportName: string;
}

const DEFAULT_ADAPTER_KEYS = [
  'filesystem.read',
  'filesystem.write',
  'filesystem.list',
  'filesystem.exists',
  'filesystem.search',
  'git.status',
  'git.diff',
  'git.branch',
  'git.log',
  'project.build',
  'project.typecheck',
  'project.lint',
  'project.test',
  'terminal.run',
  'browser.search',
  'database.query',
  'document.parse',
  'ocr.extract',
  'translation.translate',
  'rag.index',
  'rag.query',
  'deployment.deploy',
  'model.resolve',
  'notification.send',
  'browser_ai_provider',
] as const;

const DEFAULT_ADAPTER_REFS: Record<string, DefaultAdapterRef> = {
  'filesystem.read': { moduleName: 'filesystem', exportName: 'filesystemReadAdapter' },
  'filesystem.write': { moduleName: 'filesystem', exportName: 'filesystemWriteAdapter' },
  'filesystem.list': { moduleName: 'filesystem', exportName: 'filesystemListAdapter' },
  'filesystem.exists': { moduleName: 'filesystem', exportName: 'filesystemExistsAdapter' },
  'filesystem.search': { moduleName: 'filesystem', exportName: 'filesystemSearchAdapter' },
  'git.status': { moduleName: 'git', exportName: 'gitStatusAdapter' },
  'git.diff': { moduleName: 'git', exportName: 'gitDiffAdapter' },
  'git.branch': { moduleName: 'git', exportName: 'gitBranchAdapter' },
  'git.log': { moduleName: 'git', exportName: 'gitLogAdapter' },
  'project.build': { moduleName: 'project', exportName: 'projectBuildAdapter' },
  'project.typecheck': { moduleName: 'project', exportName: 'projectTypecheckAdapter' },
  'project.lint': { moduleName: 'project', exportName: 'projectLintAdapter' },
  'project.test': { moduleName: 'project', exportName: 'projectTestAdapter' },
  'terminal.run': { moduleName: 'index', exportName: 'terminalRunAdapter' },
  'browser.search': { moduleName: 'index', exportName: 'browserSearchAdapter' },
  'database.query': { moduleName: 'index', exportName: 'databaseQueryAdapter' },
  'document.parse': { moduleName: 'index', exportName: 'documentParseAdapter' },
  'ocr.extract': { moduleName: 'index', exportName: 'ocrExtractAdapter' },
  'translation.translate': { moduleName: 'index', exportName: 'translationTranslateAdapter' },
  'rag.index': { moduleName: 'index', exportName: 'ragIndexAdapter' },
  'rag.query': { moduleName: 'index', exportName: 'ragQueryAdapter' },
  'deployment.deploy': { moduleName: 'index', exportName: 'deploymentDeployAdapter' },
  'model.resolve': { moduleName: 'index', exportName: 'modelResolveAdapter' },
  'notification.send': { moduleName: 'index', exportName: 'notificationSendAdapter' },
  'browser_ai_provider': { moduleName: 'index', exportName: 'browserAiProviderAdapter' },
};

async function loadDefaultAdapter(ref: DefaultAdapterRef): Promise<ToolAdapter> {
  const modulePath = ref.moduleName === 'index' ? './adapters' : `./adapters/${ref.moduleName}`;
  const mod = await import(modulePath) as Record<string, unknown>;
  const adapter = mod[ref.exportName];
  if (!adapter || typeof adapter !== 'object') {
    throw new Error(`Adapter export not found: ${modulePath}.${ref.exportName}`);
  }
  return adapter as ToolAdapter;
}

class ToolAdapterRegistry {
  private static instance: ToolAdapterRegistry | null = null;
  private customAdapters: Map<string, ToolAdapter> = new Map();
  private defaultAdapterCache: Map<string, ToolAdapter> = new Map();

  private constructor() {}

  static getInstance(): ToolAdapterRegistry {
    if (!ToolAdapterRegistry.instance) {
      ToolAdapterRegistry.instance = new ToolAdapterRegistry();
    }
    return ToolAdapterRegistry.instance;
  }

  /**
   * Synchronous lookup for custom adapters only.
   * Use getAdapterAsync() for built-in adapters.
   */
  getAdapter(toolKey: string): ToolAdapter | null {
    return this.customAdapters.get(toolKey) ?? this.defaultAdapterCache.get(toolKey) ?? null;
  }

  async getAdapterAsync(toolKey: string): Promise<ToolAdapter | null> {
    const custom = this.customAdapters.get(toolKey);
    if (custom) return custom;

    const cached = this.defaultAdapterCache.get(toolKey);
    if (cached) return cached;

    const ref = DEFAULT_ADAPTER_REFS[toolKey];
    if (!ref) return null;

    const adapter = await loadDefaultAdapter(ref);
    this.defaultAdapterCache.set(toolKey, adapter);
    return adapter;
  }

  registerAdapter(adapter: ToolAdapter): void {
    this.customAdapters.set(adapter.key, adapter);
  }

  getRegisteredKeys(): string[] {
    const customKeys = Array.from(this.customAdapters.keys());
    return [...new Set([...DEFAULT_ADAPTER_KEYS, ...customKeys])];
  }

  hasAdapter(toolKey: string): boolean {
    return this.customAdapters.has(toolKey) || toolKey in DEFAULT_ADAPTER_REFS;
  }
}

export const toolAdapterRegistry = ToolAdapterRegistry.getInstance();
