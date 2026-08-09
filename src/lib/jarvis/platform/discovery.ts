import { execFile } from 'node:child_process';
import { access, readdir, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative } from 'node:path';
import { promisify } from 'node:util';
import { jarvisAgentRegistry } from '@/lib/jarvis/agent-registry';
import { skillRegistry } from '@/lib/skills/registry';
import { toolAdapterRegistry } from '@/lib/tool-hub/ToolAdapterRegistry';
import { mcpClientManager } from '@/lib/mcp/McpClientManager';
import { initializeMcpTools } from '@/lib/mcp/init';
import { listConfiguredProviderIds } from '@/lib/ai-provider/providers';
import { toolRegistry } from '@/lib/tools/registry';
import { capabilityRegistry, createCapabilityRecord } from './capability-registry';
import { createProgramRecord, programRegistry } from './program-registry';
import { ollamaAdapter } from './ollama-adapter';
import { runtimeAdapterRegistry } from './adapter-registry';
import type { CapabilityKind, CapabilityRecord, ProgramRecord } from './types';

const execFileAsync = promisify(execFile);

interface CommandDefinition {
  id: string;
  name: string;
  executable: string;
  versionArgs: string[];
  type: string;
  category: string;
  description: string;
  capabilities: string[];
  repository?: string;
}

const COMMANDS: CommandDefinition[] = [
  { id: 'node', name: 'Node.js', executable: 'node', versionArgs: ['--version'], type: 'runtime', category: 'SYSTEM', description: 'Среда выполнения JavaScript', capabilities: ['javascript', 'typescript', 'services'], repository: 'nodejs/node' },
  { id: 'python', name: 'Python', executable: 'python', versionArgs: ['--version'], type: 'runtime', category: 'SYSTEM', description: 'Среда выполнения Python', capabilities: ['python', 'document_processing', 'automation'], repository: 'python/cpython' },
  { id: 'git', name: 'Git', executable: 'git', versionArgs: ['--version'], type: 'vcs', category: 'CODE INTELLIGENCE', description: 'Контроль версий и история проекта', capabilities: ['git', 'diff', 'history'], repository: 'git/git' },
  { id: 'docker', name: 'Docker', executable: 'docker', versionArgs: ['--version'], type: 'container_runtime', category: 'DOCKER SERVICES', description: 'Изолированные сервисы и контейнеры', capabilities: ['containers', 'images', 'services'], repository: 'docker/cli' },
  { id: 'ollama-local', name: 'Ollama Local', executable: 'ollama', versionArgs: ['--version'], type: 'ai_runtime', category: 'LOCAL AI', description: 'Локальные модели Ollama', capabilities: ['local_ai', 'chat', 'completion', 'embeddings', 'model_management'], repository: 'ollama/ollama' },
  { id: 'codex-cli', name: 'Codex CLI', executable: 'codex', versionArgs: ['--version'], type: 'subscription_worker', category: 'AGENTS', description: 'Подчинённый рабочий Codex через официальную локальную программу', capabilities: ['coding', 'analysis', 'repository_tasks'] },
  { id: 'claude-code', name: 'Claude Code', executable: 'claude', versionArgs: ['--version'], type: 'subscription_worker', category: 'AGENTS', description: 'Подчинённый рабочий Claude Code через официальную локальную программу', capabilities: ['coding', 'analysis', 'repository_tasks'] },
  { id: 'antigravity', name: 'Antigravity', executable: 'antigravity', versionArgs: ['--version'], type: 'subscription_worker', category: 'AGENTS', description: 'Подчинённый рабочий Antigravity', capabilities: ['coding', 'agent_worker'] },
  { id: 'opencode', name: 'OpenCode', executable: 'opencode', versionArgs: ['--version'], type: 'coding_agent', category: 'AGENTS', description: 'Локальный агент программирования OpenCode', capabilities: ['coding', 'agent_worker'] },
];

const TRUSTED_EXECUTABLE_PATHS: Record<string, RegExp[]> = {
  node: [/\\program files\\nodejs\\node\.exe$/i],
  python: [/\\appdata\\local\\(?:programs\\python\\python\d+|python\\bin|microsoft\\windowsapps)\\python\.exe$/i],
  git: [/\\program files\\git\\(?:cmd|mingw64\\bin)\\git\.exe$/i],
  docker: [/[a-z]:\\docker\\docker\\resources\\bin\\docker(?:\.exe)?$/i, /\\program files\\docker\\docker\\resources\\bin\\docker(?:\.exe)?$/i],
  ollama: [/\\appdata\\local\\programs\\ollama\\ollama\.exe$/i],
  codex: [/\\\.vscode\\extensions\\openai\.chatgpt-[^\\]+\\bin\\[^\\]+\\codex\.exe$/i, /\\appdata\\roaming\\npm\\codex\.(?:cmd|ps1)$/i],
  claude: [/\\\.local\\bin\\claude\.exe$/i, /\\appdata\\roaming\\npm\\claude\.(?:cmd|ps1)$/i],
  antigravity: [/\\appdata\\local\\programs\\antigravity\\bin\\antigravity(?:\.exe|\.cmd|\.ps1)?$/i, /[a-z]:\\antigravity ide\\bin\\antigravity(?:\.exe|\.cmd|\.ps1)?$/i],
  opencode: [/\\appdata\\roaming\\npm\\opencode\.(?:cmd|ps1)$/i, /\\\.local\\bin\\opencode\.exe$/i],
};

function isTrustedExecutable(name: string, candidate: string): boolean {
  if (!isAbsolute(candidate)) return false;
  const workspaceRelative = relative(process.cwd(), candidate);
  if (workspaceRelative === '' || (!workspaceRelative.startsWith('..') && !isAbsolute(workspaceRelative))) return false;
  return (TRUSTED_EXECUTABLE_PATHS[name.toLowerCase()] ?? []).some((pattern) => pattern.test(candidate));
}

async function findExecutable(name: string): Promise<string | null> {
  const finder = process.platform === 'win32' ? 'where.exe' : 'which';
  try {
    const { stdout } = await execFileAsync(finder, [name], { timeout: 3_000, windowsHide: true });
    const rawPaths = stdout.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    const paths: string[] = [];
    for (const item of rawPaths) {
      try {
        const canonical = await realpath(item);
        if (isTrustedExecutable(name, canonical)) paths.push(canonical);
      } catch { /* ignore missing or untrusted PATH entries */ }
    }
    if (process.platform === 'win32') {
      return paths.find((item) => /\.exe$/i.test(item))
        ?? paths.find((item) => /\.ps1$/i.test(item))
        ?? paths.find((item) => /\.(?:cmd|bat)$/i.test(item))
        ?? paths.find((item) => !item.toLowerCase().endsWith('.ps1'))
        ?? paths[0]
        ?? null;
    }
    return paths[0] ?? null;
  } catch { return null; }
}

async function commandVersion(executable: string, args: string[]): Promise<{ version: string | null; error: string | null }> {
  try {
    const usesPowerShellScript = process.platform === 'win32' && /\.ps1$/i.test(executable);
    const usesCommandShim = process.platform === 'win32' && /\.(?:cmd|bat)$/i.test(executable);
    // PowerShell receives executable paths as data, never interpolated into script text.
    // Prefer the discovered .ps1 npm shim because -File avoids command-shell parsing.
    const command = usesPowerShellScript || usesCommandShim ? 'powershell.exe' : executable;
    const commandArgs = usesPowerShellScript
      ? ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', executable, ...args]
      : usesCommandShim
      ? ['-NoProfile', '-NonInteractive', '-Command', '& $env:JARVIS_DISCOVERY_EXECUTABLE @((ConvertFrom-Json $env:JARVIS_DISCOVERY_ARGS_JSON))']
      : args;
    const { stdout, stderr } = await execFileAsync(command, commandArgs, {
      timeout: 5_000,
      windowsHide: true,
      env: usesCommandShim ? {
        ...process.env,
        JARVIS_DISCOVERY_EXECUTABLE: executable,
        JARVIS_DISCOVERY_ARGS_JSON: JSON.stringify(args),
      } : process.env,
    });
    const version = `${stdout}\n${stderr}`.trim().split(/\r?\n/)[0]?.trim() || null;
    return { version, error: null };
  } catch (error) {
    return { version: null, error: error instanceof Error ? error.message : String(error) };
  }
}

async function endpointHealth(endpoint: string, path: string): Promise<{ running: boolean; message: string; latency: number | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4_000);
  const startedAt = Date.now();
  try {
    const response = await fetch(`${endpoint}${path}`, { signal: controller.signal, cache: 'no-store' });
    return { running: response.ok, message: response.ok ? `HTTP ${response.status}` : `HTTP ${response.status}`, latency: Date.now() - startedAt };
  } catch (error) {
    return { running: false, message: error instanceof Error ? error.message : String(error), latency: null };
  } finally { clearTimeout(timer); }
}

async function discoverCommand(definition: CommandDefinition): Promise<ProgramRecord> {
  const executable = await findExecutable(definition.executable);
  if (!executable) {
    return createProgramRecord({
      ...definition,
      repository: definition.repository ?? null,
      source: 'auto-discovery',
      installed: false,
      status: 'MISSING',
      health: 'MISSING',
      health_message: 'Исполняемый файл не найден в PATH',
      command: definition.executable,
    });
  }

  const versionResult = definition.id === 'ollama-local'
    ? { version: await ollamaAdapter.version(), error: null }
    : await commandVersion(executable, definition.versionArgs);
  let running = false;
  let healthMessage = versionResult.error ?? 'Программа обнаружена';
  let endpoint: string | null = null;
  let port: number | null = null;
  let metadata: Record<string, unknown> = {};

  if (definition.id === 'ollama-local') {
    endpoint = 'http://127.0.0.1:11434';
    port = 11434;
    const health = await ollamaAdapter.health();
    running = health.state === 'HEALTHY';
    healthMessage = health.message;
    const models = running ? await ollamaAdapter.models().catch(() => []) : [];
    metadata = { models, metrics: await ollamaAdapter.metrics(), latency_ms: health.latencyMs ?? null };
  }

  return createProgramRecord({
    ...definition,
    repository: definition.repository ?? null,
    source: 'auto-discovery',
    installed: true,
    running,
    status: running ? 'ONLINE' : 'OFFLINE',
    health: versionResult.error ? 'DEGRADED' : running || definition.id !== 'ollama-local' ? 'HEALTHY' : 'UNHEALTHY',
    health_message: healthMessage,
    version: versionResult.version,
    install_path: dirname(executable),
    executable,
    command: definition.executable,
    endpoint,
    port,
    last_seen: new Date().toISOString(),
    error: versionResult.error,
    metadata,
  });
}

async function pathExists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

async function countFiles(path: string): Promise<number> {
  try { return (await readdir(path, { withFileTypes: true })).filter((entry) => !entry.name.startsWith('.')).length; }
  catch { return 0; }
}

async function discoverInternalPrograms(): Promise<ProgramRecord[]> {
  const root = process.cwd();
  const now = new Date().toISOString();
  const graphifyInstalled = await pathExists(join(root, 'src', 'app', 'graphify'));
  const camofox = await endpointHealth('http://127.0.0.1:9377', '/health');
  const adapterCount = toolAdapterRegistry.getRegisteredKeys().length;
  const skillCount = skillRegistry.listAll().length || await countFiles(join(root, 'src', 'lib', 'skills'));
  const agentCount = jarvisAgentRegistry.list().length;
  const mcpConnections = mcpClientManager.listConnections();
  const readyMcpConnections = mcpConnections.filter((connection) => connection.connected);
  const configuredProviders = listConfiguredProviderIds();

  return [
    createProgramRecord({ id: 'jarvis-core', name: 'JARVIS Core', type: 'orchestrator', category: 'SYSTEM', description: 'Единственный верхнеуровневый оркестратор', installed: true, running: true, status: 'ONLINE', health: 'HEALTHY', health_message: 'Ядро выполняет discovery', version: process.env.npm_package_version ?? null, capabilities: ['orchestration', 'planning', 'routing', 'audit'], last_seen: now, metadata: { subordinate_agents: agentCount } }),
    createProgramRecord({ id: 'graphify', name: 'Graphify', type: 'code_intelligence', category: 'CODE INTELLIGENCE', description: 'Граф кода и единая память проекта', repository: 'Graphify-Labs/graphify', installed: graphifyInstalled, running: graphifyInstalled, status: graphifyInstalled ? 'ONLINE' : 'MISSING', health: graphifyInstalled ? 'HEALTHY' : 'MISSING', health_message: graphifyInstalled ? 'Маршрут /graphify найден' : 'Модуль не найден', capabilities: ['code_graph', 'repository_analysis', 'knowledge_query'], endpoint: '/graphify', last_seen: graphifyInstalled ? now : null }),
    createProgramRecord({ id: 'camofox-browser', name: 'CamoFox Browser', type: 'browser_worker', category: 'BROWSERS', description: 'Управляемая браузерная рабочая область', repository: 'jo-inc/camofox-browser', installed: await pathExists(join(root, 'vendor', 'camofox-browser')), running: camofox.running, status: camofox.running ? 'ONLINE' : 'OFFLINE', health: camofox.running ? 'HEALTHY' : 'UNHEALTHY', health_message: camofox.message, endpoint: 'http://127.0.0.1:9377', port: 9377, capabilities: ['browse', 'snapshot', 'click', 'type', 'research'], last_seen: camofox.running ? now : null, metadata: { latency_ms: camofox.latency } }),
    createProgramRecord({ id: 'jarvis-tool-adapters', name: 'Адаптеры JARVIS', type: 'adapter_collection', category: 'TOOLS', description: 'Установленные адаптеры инструментов', installed: adapterCount > 0, running: true, status: 'ONLINE', health: 'HEALTHY', health_message: `Обнаружено адаптеров: ${adapterCount}`, capabilities: toolAdapterRegistry.getRegisteredKeys(), last_seen: now, metadata: { count: adapterCount } }),
    createProgramRecord({ id: 'jarvis-skills', name: 'Навыки JARVIS', type: 'skill_collection', category: 'SKILLS', description: 'Реестр установленных навыков', installed: true, running: true, status: 'ONLINE', health: 'HEALTHY', health_message: `Обнаружено навыков: ${skillCount}`, capabilities: ['skill_registry', 'skill_execution'], last_seen: now, metadata: { count: skillCount } }),
    createProgramRecord({ id: 'jarvis-agents', name: 'Агенты JARVIS', type: 'agent_collection', category: 'AGENTS', description: 'Подчинённые специализированные агенты', installed: true, running: true, status: 'ONLINE', health: 'HEALTHY', health_message: `Зарегистрировано агентов: ${agentCount}`, capabilities: ['agent_registry', 'delegation'], last_seen: now, metadata: { count: agentCount } }),
    createProgramRecord({ id: 'mcp-runtime', name: 'MCP Runtime', type: 'mcp_runtime', category: 'MCP SERVERS', description: 'Менеджер подключений Model Context Protocol', installed: true, running: readyMcpConnections.length > 0, status: readyMcpConnections.length > 0 ? 'ONLINE' : 'OFFLINE', health: readyMcpConnections.length > 0 ? 'HEALTHY' : 'DEGRADED', health_message: readyMcpConnections.length > 0 ? `Готово подключений: ${readyMcpConnections.length}; инструментов: ${readyMcpConnections.reduce((sum, item) => sum + item.toolCount, 0)}` : 'Активных MCP-подключений нет', capabilities: ['mcp_client', 'tool_discovery', 'resource_discovery', 'prompt_discovery'], last_seen: readyMcpConnections.length > 0 ? now : null, metadata: { connections: mcpConnections } }),
    ...mcpConnections.map((connection) => createProgramRecord({
      id: connection.name === 'desktop-commander' ? 'desktop-commander' : `mcp-server:${connection.name}`,
      name: `MCP: ${connection.name}`,
      type: 'mcp_server',
      category: 'MCP SERVERS',
      description: `Реальное MCP-подключение ${connection.name}`,
      installed: true,
      running: connection.connected,
      status: connection.connected ? 'ONLINE' : 'OFFLINE',
      health: connection.state === 'READY' ? 'HEALTHY' : connection.state === 'DEGRADED' ? 'DEGRADED' : 'UNHEALTHY',
      health_message: connection.connected
        ? `Инструменты: ${connection.toolCount}; ресурсы: ${connection.resourceCount}; промпты: ${connection.promptCount}`
        : connection.error ?? 'MCP-сервер недоступен',
      capabilities: ['mcp_server', 'tool_discovery'],
      last_seen: connection.connectedAt,
      error: connection.error,
      metadata: { ...connection },
    })),
    createProgramRecord({ id: 'cloud-providers', name: 'Облачные AI-провайдеры', type: 'provider_collection', category: 'CLOUD AI', description: 'Настроенные облачные провайдеры без раскрытия секретов', installed: configuredProviders.length > 0, running: configuredProviders.length > 0, status: configuredProviders.length > 0 ? 'ONLINE' : 'MISSING', health: configuredProviders.length > 0 ? 'HEALTHY' : 'MISSING', health_message: configuredProviders.length > 0 ? `Настроено провайдеров: ${configuredProviders.length}` : 'Провайдеры не настроены', capabilities: ['cloud_ai', 'provider_routing'], last_seen: configuredProviders.length > 0 ? now : null, metadata: { provider_ids: configuredProviders } }),
  ];
}

async function discoverDockerServices(): Promise<ProgramRecord[]> {
  const executable = await findExecutable('docker');
  if (!executable) return [];
  try {
    const { stdout } = await execFileAsync(executable, ['ps', '-a', '--format', '{{json .}}'], { timeout: 6_000, windowsHide: true });
    return stdout.split(/\r?\n/).filter(Boolean).flatMap((line) => {
      try {
        const container = JSON.parse(line) as Record<string, string>;
        const running = container.State?.toLowerCase() === 'running';
        return [createProgramRecord({
          id: `docker:${container.ID}`,
          name: container.Names || container.Image || container.ID,
          type: 'docker_service',
          category: 'DOCKER SERVICES',
          description: `Docker-сервис ${container.Image ?? ''}`.trim(),
          source: 'docker-discovery',
          installed: true,
          running,
          status: running ? 'ONLINE' : 'STOPPED',
          health: running ? 'HEALTHY' : 'UNKNOWN',
          health_message: container.Status ?? container.State ?? 'Состояние неизвестно',
          docker_container_id: container.ID ?? null,
          docker_image: container.Image ?? null,
          capabilities: ['container_service'],
          last_seen: new Date().toISOString(),
          metadata: { ports: container.Ports ?? '' },
        })];
      } catch { return []; }
    });
  } catch { return []; }
}

async function discoverRuntimeAdapterPrograms(): Promise<ProgramRecord[]> {
  const records: ProgramRecord[] = [];
  for (const adapter of runtimeAdapterRegistry.list()) {
    const metadata = await adapter.metadata();
    if (metadata.id === 'ollama-local') continue;
    const [health, status, version, capabilities, configuration, metrics] = await Promise.all([
      adapter.health(), adapter.status(), adapter.version(), adapter.capabilities(), adapter.configuration(), adapter.metrics(),
    ]);
    const kindToCategory: Record<string, string> = {
      browser: 'BROWSERS', crawler: 'CRAWLERS', social: 'SOCIAL', stt: 'VOICE', media: 'MEDIA',
      code_intelligence: 'CODE INTELLIGENCE', document_processor: 'DOCUMENT PROCESSING', tts: 'VOICE',
      automation: 'AUTOMATION', messaging: 'MESSAGING', calls: 'CALLS', video: 'VIDEO', design: 'DESIGN',
      monitoring: 'MONITORING', document_archive: 'DOCUMENT ARCHIVE', edge_ai: 'EDGE AI', mobile: 'MOBILE',
      deployment: 'DEPLOYMENT', security_tool: 'SECURITY TOOLS', trading_research: 'TRADING RESEARCH',
    };
    const configuredEndpoint = typeof configuration.endpoint === 'string' ? configuration.endpoint : null;
    const configuredPort = typeof configuration.port === 'number' ? configuration.port : null;
    const docker = configuration.docker && typeof configuration.docker === 'object' ? configuration.docker as Record<string, unknown> : null;
    records.push(createProgramRecord({
      id: metadata.id,
      name: metadata.name,
      type: metadata.kind,
      category: kindToCategory[metadata.kind] ?? 'TOOLS',
      description: metadata.description,
      source: metadata.source,
      installed: status.installed,
      enabled: status.enabled,
      running: status.running,
      status: status.state === 'QUARANTINED' ? 'QUARANTINED' : !status.enabled && status.state === 'DISABLED' ? 'DISABLED' : !status.installed ? 'NOT_INSTALLED' : status.running ? 'RUNNING' : health.state === 'HEALTHY' ? 'READY' : health.state === 'DEGRADED' ? 'DEGRADED' : status.state === 'STOPPED' ? 'STOPPED' : 'OFFLINE',
      health: health.state,
      health_message: health.message,
      version,
      capabilities,
      executable: typeof configuration.executable === 'string' ? configuration.executable : null,
      install_path: typeof configuration.executable === 'string' ? dirname(configuration.executable) : null,
      endpoint: configuredEndpoint,
      port: configuredPort,
      docker_container_id: typeof docker?.containerId === 'string' ? docker.containerId : null,
      docker_image: typeof docker?.image === 'string' ? docker.image : null,
      last_seen: status.installed ? health.checkedAt : null,
      metadata: { configuration, metrics, adapter: metadata.id },
    }));
  }
  return records;
}

function programKind(program: ProgramRecord): CapabilityKind {
  if (program.type === 'mcp_server' || program.type === 'mcp_runtime') return 'mcp_server';
  if (program.type === 'browser_worker') return 'browser';
  if (program.type === 'subscription_worker' || program.type === 'coding_agent' || program.type === 'agent_collection') return 'agent';
  if (program.type === 'code_intelligence') return 'code_intelligence';
  if (program.type === 'container_runtime' || program.type === 'docker_service') return 'docker_service';
  if (program.type === 'provider_collection' || program.type === 'ai_runtime') return 'provider';
  if (program.type === 'skill_collection') return 'skill';
  if (program.type === 'vcs') return 'git';
  return 'system';
}

function capabilityFromProgram(program: ProgramRecord): CapabilityRecord {
  return createCapabilityRecord({
    id: program.id,
    name: program.name,
    kind: programKind(program),
    category: program.category,
    description: program.description,
    capabilities: program.capabilities,
    best_for: program.capabilities,
    requirements: program.dependencies,
    dependencies: program.dependencies,
    installed: program.installed,
    enabled: program.enabled,
    running: program.running,
    health: program.health,
    version: program.version,
    source: program.source,
    repository: program.repository,
    adapter: program.id === 'ollama-local' ? 'ollama-local' : program.type,
    priority: program.category === 'LOCAL AI' ? 80 : 50,
    cost_class: program.category === 'CLOUD AI' ? 'metered' : 'local',
    latency_class: program.running ? 'fast' : 'unknown',
    success_rate: program.success_rate,
    task_count: program.task_count,
    success_count: program.success_count,
    failure_count: program.failure_count,
    last_used: program.last_used,
    last_error: program.error,
  });
}

async function discoverNativeCapabilities(programs: ProgramRecord[]): Promise<CapabilityRecord[]> {
  const now = new Date().toISOString();
  const programCapabilities = programs.map(capabilityFromProgram);
  const toolCapabilities = toolAdapterRegistry.getRegisteredKeys().map((key) => createCapabilityRecord({
    id: `tool:${key}`,
    name: key,
    kind: 'tool',
    category: key.split('.')[0]?.toUpperCase() || 'TOOLS',
    description: `Инструмент JARVIS ${key}`,
    capabilities: [key],
    best_for: [key],
    installed: true,
    running: true,
    health: 'HEALTHY',
    source: 'tool-adapter-registry',
    adapter: key,
    priority: 60,
    last_used: null,
  }));
  const runtimeTools = toolRegistry.listAll().map((tool) => createCapabilityRecord({
    id: `runtime-tool:${tool.id}`,
    name: tool.name,
    kind: 'tool',
    category: 'TOOLS',
    description: tool.description,
    capabilities: [tool.id],
    best_for: [tool.id],
    installed: true,
    running: true,
    health: 'HEALTHY',
    source: 'runtime-tool-registry',
    adapter: tool.id,
    risk: tool.requiredPermission === 'admin' ? 'critical' : tool.requiredPermission === 'write' ? 'high' : 'low',
  }));
  const agents = jarvisAgentRegistry.list().map((agent) => createCapabilityRecord({
    id: `agent:${agent.id}`,
    name: agent.name,
    kind: 'agent',
    category: 'AGENTS',
    description: agent.mission,
    capabilities: agent.capabilities,
    best_for: agent.capabilities,
    not_for: agent.forbiddenActions,
    installed: true,
    enabled: agent.enabled,
    running: false,
    health: 'HEALTHY',
    source: 'jarvis-agent-registry',
    adapter: 'jarvis-agent-runtime',
    compatible_agents: ['jarvis'],
    compatible_providers: listConfiguredProviderIds(),
    priority: 55,
  }));
  const skills = skillRegistry.listAll().map((skill) => createCapabilityRecord({
    id: `skill:${skill.id}`,
    name: skill.name,
    kind: 'skill',
    category: 'SKILLS',
    description: skill.description,
    capabilities: [skill.id],
    best_for: [skill.id],
    installed: true,
    running: true,
    health: 'HEALTHY',
    version: skill.version,
    source: 'jarvis-skill-registry',
    adapter: 'skill-runtime',
  }));
  const providers = listConfiguredProviderIds().map((id) => createCapabilityRecord({
    id: `provider:${id}`,
    name: id,
    kind: 'provider',
    category: id.includes('ollama') && !id.includes('cloud') ? 'LOCAL AI' : 'CLOUD AI',
    description: `Настроенный AI-провайдер ${id}`,
    capabilities: ['chat', 'completion'],
    best_for: ['chat', 'analysis'],
    installed: true,
    running: true,
    health: 'HEALTHY',
    source: 'ai-provider-registry',
    adapter: id,
    cost_class: id.includes('ollama') && !id.includes('cloud') ? 'local' : 'metered',
  }));
  const ollamaProgram = programs.find((program) => program.id === 'ollama-local');
  const ollamaModels = Array.isArray(ollamaProgram?.metadata.models)
    ? (ollamaProgram.metadata.models as Array<{ name: string; loaded?: boolean; parameter_size?: string; quantization?: string; recommended_use?: string[] }>).map((model) => createCapabilityRecord({
        id: `model:ollama:${model.name}`,
        name: model.name,
        kind: 'model',
        category: 'LOCAL AI',
        description: `Локальная модель Ollama ${model.name}`,
        capabilities: model.recommended_use ?? ['chat'],
        best_for: model.recommended_use ?? ['chat'],
        installed: true,
        running: Boolean(model.loaded),
        health: ollamaProgram?.health ?? 'UNKNOWN',
        source: 'ollama-local',
        adapter: 'ollama-local',
        requirements: [model.parameter_size ?? 'неизвестный размер'],
        cost_class: 'local',
        priority: 75,
      }))
    : [];
  const mcpCapabilities: CapabilityRecord[] = [];
  for (const connection of mcpClientManager.listConnections()) {
    const client = mcpClientManager.getClient(connection.name);
    if (!client) continue;
    try {
      const response = await client.listTools();
      for (const tool of response.tools ?? []) {
        if (!toolRegistry.has(`mcp.${connection.name}.${tool.name}`)) continue;
        mcpCapabilities.push(createCapabilityRecord({
          id: `mcp:${connection.name}:${tool.name}`,
          name: tool.name,
          kind: 'mcp_tool',
          category: 'MCP TOOLS',
          description: tool.description ?? `MCP-инструмент ${connection.name}`,
          capabilities: [tool.name],
          best_for: [tool.name],
          inputs: tool.inputSchema as CapabilityRecord['inputs'],
          installed: true,
          running: true,
          health: 'HEALTHY',
          source: connection.name,
          adapter: 'mcp-runtime',
          risk: 'medium',
        }));
      }
    } catch {
      mcpCapabilities.push(createCapabilityRecord({
        id: `mcp:${connection.name}:unavailable`, name: `${connection.name}: ошибка обнаружения`, kind: 'mcp_server', category: 'MCP SERVERS',
        description: 'Не удалось получить список MCP-инструментов', installed: true, running: true, health: 'DEGRADED', source: connection.name, adapter: 'mcp-runtime', last_error: 'MCP listTools failed',
      }));
    }
  }
  const unique = new Map<string, CapabilityRecord>();
  for (const capability of [...programCapabilities, ...toolCapabilities, ...runtimeTools, ...agents, ...skills, ...providers, ...ollamaModels, ...mcpCapabilities]) {
    unique.set(capability.id, { ...capability, updated_at: now });
  }
  return Array.from(unique.values());
}

let activeRefresh: Promise<{ programs: ProgramRecord[]; capabilities: CapabilityRecord[] }> | null = null;
let lastRefreshAt = 0;

export async function refreshPlatformDiscovery(force = false): Promise<{ programs: ProgramRecord[]; capabilities: CapabilityRecord[] }> {
  if (!force && Date.now() - lastRefreshAt < 15_000) {
    return { programs: await programRegistry.list(), capabilities: await capabilityRegistry.list() };
  }
  if (activeRefresh) return activeRefresh;
  activeRefresh = (async () => {
    await initializeMcpTools().catch(() => undefined);
    const [commands, internal, containers, runtimeAdapters] = await Promise.all([
      Promise.all(COMMANDS.map(discoverCommand)),
      discoverInternalPrograms(),
      discoverDockerServices(),
      discoverRuntimeAdapterPrograms(),
    ]);
    const discoveredPrograms = [...commands, ...internal, ...containers, ...runtimeAdapters];
    if (discoveredPrograms.some((program) => program.id === 'desktop-commander')) {
      // Migration from the former generated MCP ID. Keeping both records made
      // the right-side dashboard show a false MISSING duplicate.
      await Promise.all([
        programRegistry.remove('mcp-server:desktop-commander'),
        capabilityRegistry.remove('mcp-server:desktop-commander'),
      ]);
    }
    const programs = await programRegistry.mergeDiscovery(discoveredPrograms);
    const capabilities = await capabilityRegistry.mergeDiscovery(await discoverNativeCapabilities(programs));
    lastRefreshAt = Date.now();
    return { programs, capabilities };
  })();
  try { return await activeRefresh; } finally { activeRefresh = null; }
}
