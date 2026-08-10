// Proves that on JARVIS_RUNTIME_ROLE=web-control-plane, every local-runtime
// proxy in the shared tree fails closed (LOCAL_EXECUTION_FORBIDDEN or an
// equivalent honest empty/forbidden state) instead of reaching a local
// resource. Covers: filesystem, terminal, Ollama, Codex, MCP (via platform
// discovery), documents, Docker (Phase B), external CLI tools, and worker
// registry. See docs/jarvis/remote-architecture.md.
import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/env', () => ({
  env: {
    JARVIS_RUNTIME_ROLE: 'web-control-plane',
  },
}));

const ctx = (functionName: string) => ({
  agentId: 'test-agent',
  agentRole: 'test',
  toolCallId: 'call-1',
  functionName,
  args: {},
});

describe('runtime boundary: fail-closed on web-control-plane', () => {
  it('Ollama adapter never reaches the local server', async () => {
    const { ollamaAdapter } = await import('@/lib/jarvis/platform/ollama-adapter');
    const health = await ollamaAdapter.health();
    expect(health.state).toBe('UNKNOWN');
    expect(health.message).toContain('LOCAL_EXECUTION_FORBIDDEN');
    expect(await ollamaAdapter.models()).toEqual([]);
    await expect(ollamaAdapter.chat({ model: 'x', messages: [] } as never)).rejects.toThrow('LOCAL_EXECUTION_FORBIDDEN');
  });

  it('Codex subscription provider never spawns the local CLI', async () => {
    const { codexSubscriptionProvider } = await import('@/lib/ai-provider/codex-subscription');
    const availability = await codexSubscriptionProvider.getAvailability();
    expect(availability.installed).toBe(false);
    expect(availability.failureCode).toBe('LOCAL_EXECUTION_FORBIDDEN');
    await expect(
      codexSubscriptionProvider.startThread({ cwd: '.', sandbox: 'read-only' }),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(codexSubscriptionProvider.getEvents()).toEqual([]);
  });

  it('Document router never invokes a local parser', async () => {
    const { documentRouter } = await import('@/lib/document-router');
    expect(await documentRouter.status()).toEqual([]);
    await expect(documentRouter.convert('doc.pdf')).rejects.toThrow('LOCAL_EXECUTION_FORBIDDEN');
  });

  it('Platform discovery never runs local PATH/MCP/Docker discovery', async () => {
    const { refreshPlatformDiscovery } = await import('@/lib/jarvis/platform/discovery');
    // Must resolve to a (possibly empty) persisted projection, never throw,
    // and never attempt to import the local-runtime discovery module.
    const result = await refreshPlatformDiscovery(true);
    expect(Array.isArray(result.programs)).toBe(true);
    expect(Array.isArray(result.capabilities)).toBe(true);
  });

  it('Built-in terminal/git/build/lint tools refuse to execute', async () => {
    const { terminalExecTool, gitStatusTool, projectBuildTool, projectTypecheckTool, projectLintTool } = await import('@/lib/tools');
    const terminalResult = await terminalExecTool.execute({ ...ctx('terminal.exec'), args: { command: 'echo hi' } });
    expect(terminalResult.success).toBe(false);
    expect(terminalResult.error).toBe('LOCAL_EXECUTION_FORBIDDEN');

    for (const tool of [gitStatusTool, projectBuildTool, projectTypecheckTool, projectLintTool]) {
      const result = await tool.execute(ctx(tool.id));
      expect(result.success).toBe(false);
      expect(result.error).toBe('LOCAL_EXECUTION_FORBIDDEN');
    }
  });

  it('Terminal exec API route refuses on web-control-plane', async () => {
    const { POST } = await import('@/app/api/terminal/exec/route');
    const response = await POST(new NextRequest('http://localhost/api/terminal/exec', {
      method: 'POST',
      headers: { host: 'localhost', 'content-type': 'application/json' },
      body: JSON.stringify({ command: 'echo hi' }),
    }));
    expect(response.status).toBe(501);
  });

  it('Files list API route refuses on web-control-plane', async () => {
    const { GET } = await import('@/app/api/files/list/route');
    const response = await GET(new NextRequest('http://localhost/api/files/list', {
      headers: { host: 'localhost' },
    }));
    expect(response.status).toBe(501);
  });

  it('Phase B Docker service manager never shells out to docker', async () => {
    const { phaseBDockerServiceManager } = await import('@/lib/jarvis/phase-b/docker-service-manager');
    const state = await phaseBDockerServiceManager.state('n8n');
    expect(state.installed).toBe(false);
    expect(state.status).toContain('LOCAL_EXECUTION_FORBIDDEN');
    expect(await phaseBDockerServiceManager.available()).toBe(false);
  });

  it('External CLI tool adapters (yt-dlp, repomix, etc.) never execFile', async () => {
    const { externalToolAdapters } = await import('@/lib/jarvis/platform/external-tool-adapters');
    const ytDlp = externalToolAdapters.find((adapter) => {
      const metadata = adapter.metadata();
      return !(metadata instanceof Promise) && metadata.id === 'yt-dlp';
    });
    expect(ytDlp).toBeDefined();
    const health = await ytDlp!.health();
    expect(health.message).toContain('LOCAL_EXECUTION_FORBIDDEN');
    expect(await ytDlp!.version()).toBeNull();
  });

  it('Worker registry never registers local CLI worker adapters', async () => {
    const { globalWorkerRegistry } = await import('@/lib/worker-registry');
    await globalWorkerRegistry.ensureLocalWorkersRegistered();
    const ids = globalWorkerRegistry.getAllAdapters().map((adapter) => adapter.id);
    expect(ids).not.toContain('codex_cli');
    expect(ids).not.toContain('claude_code');
    expect(ids).not.toContain('ANTIGRAVITY_CLI');
  });
});
