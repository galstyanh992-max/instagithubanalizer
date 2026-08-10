// Real-machine smoke test: proves the relocated local-runtime
// implementations still function (not merely "compiles") when running in
// the default local-full-dev role — i.e. NOT web-control-plane. Does not
// mock @/lib/env, so this exercises the genuine dynamic-import path into
// src/local-runtime/**. A given external tool may not be installed/
// authenticated on this machine; the assertions tolerate that by only
// requiring a real, non-forbidden response shape (never the
// LOCAL_EXECUTION_FORBIDDEN sentinel), not success of the tool itself.
import { describe, expect, it } from 'vitest';

describe('runtime boundary: local-runtime still works outside web-control-plane', () => {
  it('Ollama adapter reaches the real local-runtime implementation', async () => {
    const { ollamaAdapter } = await import('@/lib/jarvis/platform/ollama-adapter');
    const health = await ollamaAdapter.health();
    // Real health check ran (HEALTHY if Ollama is running, UNHEALTHY/DEGRADED
    // if not installed/reachable on this machine) — never the forbidden sentinel.
    expect(health.message).not.toContain('LOCAL_EXECUTION_FORBIDDEN');
    console.log('[smoke] ollamaAdapter.health():', health.state, health.message);
  });

  it('Codex subscription provider reaches the real local-runtime implementation', async () => {
    const { codexSubscriptionProvider } = await import('@/lib/ai-provider/codex-subscription');
    const availability = await codexSubscriptionProvider.getAvailability();
    expect(availability.failureCode).not.toBe('LOCAL_EXECUTION_FORBIDDEN');
    console.log('[smoke] codexSubscriptionProvider.getAvailability():', availability.status, availability.message);
  });

  it('Document router reaches the real local-runtime adapters', async () => {
    const { documentRouter } = await import('@/lib/document-router');
    const states = await documentRouter.status();
    // Real adapter list (opendataloader/docling) returned, not the
    // forbidden empty array — length > 0 proves adapters were resolved.
    expect(states.length).toBeGreaterThan(0);
    console.log('[smoke] documentRouter.status():', JSON.stringify(states));
  });

  it('Platform discovery reaches the real local-runtime discovery engine', async () => {
    const { refreshPlatformDiscovery } = await import('@/lib/jarvis/platform/discovery');
    const result = await refreshPlatformDiscovery(true);
    // Real discovery always finds at least the jarvis-core internal program.
    expect(result.programs.some((program) => program.id === 'jarvis-core')).toBe(true);
    console.log('[smoke] refreshPlatformDiscovery(): programs=', result.programs.length, 'capabilities=', result.capabilities.length);
  }, 30_000);

  it('MCP init is reachable from the real local-runtime module', async () => {
    const { initializeMcpTools } = await import('@/local-runtime/mcp/init');
    await expect(initializeMcpTools()).resolves.toBeUndefined();
    console.log('[smoke] initializeMcpTools() completed without throwing.');
  }, 60_000);

  it('Built-in terminal/git tools reach the real local-runtime execution', async () => {
    const { gitStatusTool } = await import('@/lib/tools');
    const result = await gitStatusTool.execute({
      agentId: 'smoke', agentRole: 'test', toolCallId: 'call-1', functionName: 'git.status', args: {},
    });
    expect(result.error).not.toBe('LOCAL_EXECUTION_FORBIDDEN');
    console.log('[smoke] gitStatusTool.execute():', result.success, result.content.slice(0, 200));
  });
});
