import type { JarvisRuntimeAdapter } from './adapter-contract';
import { ollamaAdapter } from './ollama-adapter';
import { externalToolAdapters } from './external-tool-adapters';
import { phaseBServiceAdapters } from '@/lib/jarvis/phase-b/service-adapter';

export class RuntimeAdapterRegistry {
  private adapters = new Map<string, JarvisRuntimeAdapter>();

  register(adapter: JarvisRuntimeAdapter): void {
    const metadata = adapter.metadata();
    if (metadata instanceof Promise) throw new Error('Асинхронные metadata() нельзя регистрировать синхронно');
    this.adapters.set(metadata.id, adapter);
  }

  get(id: string): JarvisRuntimeAdapter | undefined { return this.adapters.get(id); }
  has(id: string): boolean { return this.adapters.has(id); }
  list(): JarvisRuntimeAdapter[] { return Array.from(this.adapters.values()); }
}

const globalAdapters = globalThis as typeof globalThis & { __jarvisRuntimeAdapters?: RuntimeAdapterRegistry };
export const runtimeAdapterRegistry = globalAdapters.__jarvisRuntimeAdapters ??= new RuntimeAdapterRegistry();
if (!runtimeAdapterRegistry.has('ollama-local')) runtimeAdapterRegistry.register(ollamaAdapter);
for (const adapter of externalToolAdapters) {
  const metadata = adapter.metadata();
  if (!(metadata instanceof Promise) && !runtimeAdapterRegistry.has(metadata.id)) runtimeAdapterRegistry.register(adapter);
}
for (const adapter of phaseBServiceAdapters) {
  const metadata = adapter.metadata();
  if (!runtimeAdapterRegistry.has(metadata.id)) runtimeAdapterRegistry.register(adapter);
}
