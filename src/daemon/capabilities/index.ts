// Registers all real daemon capability executors into the shared registry.
// Import this module once (src/daemon/poller/index.ts does) before any
// CAPABILITY: task is dispatched.
import { DaemonCapabilityRegistry } from './registry';
import { systemStatusExecutor } from './system-status';
import { ollamaExecutor } from './ollama';
import { filesystemExecutor } from './filesystem';
import { mcpExecutor } from './mcp';
import { browserExecutor } from './browser';
import { n8nExecutor } from './n8n';

DaemonCapabilityRegistry.register(systemStatusExecutor);
DaemonCapabilityRegistry.register(ollamaExecutor);
DaemonCapabilityRegistry.register(filesystemExecutor);
DaemonCapabilityRegistry.register(mcpExecutor);
DaemonCapabilityRegistry.register(browserExecutor);
DaemonCapabilityRegistry.register(n8nExecutor);

export { DaemonCapabilityRegistry };
