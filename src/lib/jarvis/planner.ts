// ─── JARVIS Agent Network — Planner ──────────────────────────
// Selects agents for a goal and builds a deterministic TaskGraph.
// Uses the JARVIS Agent Registry and Capability Discovery.

import { jarvisAgentRegistry } from './agent-registry';
import { discoverCapabilities } from './capability-discovery';
import { buildTaskGraph } from './state';
import type { AgentDefinition, AgentRequest, TaskGraph, TaskNode, ToolCapability, Artifact } from './types';

// ─── Goal Analysis Heuristic ─────────────────────────────────

interface GoalAnalysis {
  mentionedRoles: string[];
  requiredCapabilities: string[];
  requiredTools: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

const ROLE_KEYWORDS: Record<string, string[]> = {
  orchestrator: ['оркестратор', 'orchestrator', 'координировать', 'coordinate', 'plan', 'planning'],
  analyst: ['аналитик', 'analyst', 'требования', 'requirements', 'анализ', 'analysis'],
  architect: ['архитектор', 'architect', 'структура', 'architecture', 'дизайн системы', 'system design'],
  designer: ['дизайнер', 'designer', 'ui', 'ux', 'интерфейс', 'mockup', 'wireframe'],
  frontend_engineer: ['frontend', 'фронтенд', 'react', 'nextjs', 'компонент', 'component'],
  backend_engineer: ['backend', 'бэкенд', 'api', 'server', 'endpoint', 'база данных', 'database'],
  data_engineer: ['data engineer', 'database', 'schema', 'prisma', 'migration', 'sql'],
  qa_engineer: ['qa', 'тест', 'test', 'playwright', 'vitest', 'bug'],
  devops_engineer: ['devops', 'deploy', 'docker', 'vercel', 'ci/cd'],
  security_engineer: ['security', 'безопасность', 'audit', 'auth', 'secret'],
  researcher: ['research', 'researcher', 'web search', 'изучить', 'find docs'],
};

const CAPABILITY_KEYWORDS: Record<string, string[]> = {
  planning: ['plan', 'planning', 'decompose', 'организовать'],
  requirements_analysis: ['requirements', 'требования'],
  system_design: ['system design', 'architecture', 'архитектура'],
  ui_design: ['ui design', 'ux design', 'mockups'],
  react: ['react', 'component', 'frontend'],
  nextjs: ['nextjs', 'app router'],
  api_design: ['api', 'endpoint', 'backend'],
  prisma: ['prisma', 'database', 'schema'],
  playwright: ['playwright', 'e2e'],
  vitest: ['vitest', 'unit test'],
  security_audit: ['security', 'audit'],
  web_search: ['web search', 'research'],
};

const TOOL_KEYWORDS: Record<string, string[]> = {
  'filesystem.read': ['read file', 'read code', 'inspect'],
  'filesystem.write': ['write file', 'edit file', 'modify'],
  'terminal.run': ['run command', 'execute', 'build', 'test'],
  'git.status': ['git', 'status', 'branch'],
  'browser.search': ['web search', 'browser'],
  'database.query': ['database', 'query'],
  'deployment.deploy': ['deploy', 'vercel'],
};

function analyzeGoal(goal: string): GoalAnalysis {
  const lower = goal.toLowerCase();

  const mentionedRoles = Object.entries(ROLE_KEYWORDS)
    .filter(([, keywords]) => keywords.some((k) => lower.includes(k.toLowerCase())))
    .map(([role]) => role);

  const requiredCapabilities = Object.entries(CAPABILITY_KEYWORDS)
    .filter(([, keywords]) => keywords.some((k) => lower.includes(k.toLowerCase())))
    .map(([cap]) => cap);

  const requiredTools = Object.entries(TOOL_KEYWORDS)
    .filter(([, keywords]) => keywords.some((k) => lower.includes(k.toLowerCase())))
    .map(([tool]) => tool);

  const riskLevel: GoalAnalysis['riskLevel'] =
    lower.includes('deploy') || lower.includes('database') || lower.includes('delete')
      ? 'high'
      : lower.includes('security') || lower.includes('auth')
        ? 'critical'
        : lower.includes('ui') || lower.includes('frontend')
          ? 'low'
          : 'medium';

  return { mentionedRoles, requiredCapabilities, requiredTools, riskLevel };
}

// ─── Agent Selection ─────────────────────────────────────────

export interface SelectedAgent {
  agent: AgentDefinition;
  reason: string;
}

export function selectAgentsForGoal(goal: string): SelectedAgent[] {
  const analysis = analyzeGoal(goal);
  const all = jarvisAgentRegistry.listEnabled();
  const selected: SelectedAgent[] = [];
  const seen = new Set<string>();

  // Always include orchestrator
  const orchestrator = jarvisAgentRegistry.getByRole('orchestrator');
  if (orchestrator) {
    selected.push({ agent: orchestrator, reason: 'Always include central coordinator' });
    seen.add(orchestrator.id);
  }

  // Match by explicitly mentioned roles
  for (const role of analysis.mentionedRoles) {
    if (seen.has(role)) continue;
    const agent = jarvisAgentRegistry.getByRole(role);
    if (!agent) continue;
    selected.push({ agent, reason: `Goal explicitly mentions role: ${role}` });
    seen.add(agent.id);
  }

  // Match by required capabilities
  for (const capability of analysis.requiredCapabilities) {
    const agents = jarvisAgentRegistry.filterByCapability(capability);
    for (const agent of agents) {
      if (seen.has(agent.id)) continue;
      selected.push({ agent, reason: `Agent supports capability: ${capability}` });
      seen.add(agent.id);
    }
  }

  // Fallback defaults if selection is sparse
  if (selected.length <= 1) {
    const fallbackRoles = analysis.riskLevel === 'low'
      ? ['frontend_engineer']
      : ['analyst', 'architect', 'frontend_engineer'];
    for (const role of fallbackRoles) {
      if (seen.has(role)) continue;
      const agent = jarvisAgentRegistry.getByRole(role);
      if (!agent) continue;
      selected.push({ agent, reason: `Fallback default for goal risk level: ${analysis.riskLevel}` });
      seen.add(agent.id);
    }
  }

  return selected;
}

// ─── Task Template Library ───────────────────────────────────

interface TaskTemplate {
  title: string;
  description: string;
  role: string;
  capabilities: string[];
  toolKeys: string[];
  priority: TaskNode['priority'];
  dependsOn?: string[];
  verificationMethod: AgentRequest['verificationMethod'];
}

const GOAL_TEMPLATES: Record<string, TaskTemplate[]> = {
  default: [
    {
      title: 'Analyze request and define acceptance criteria',
      description: 'Extract requirements, constraints, and success criteria from the user goal.',
      role: 'analyst',
      capabilities: ['requirements_analysis'],
      toolKeys: ['record_artifact'],
      priority: 'high',
      verificationMethod: 'self_check',
    },
    {
      title: 'Design implementation approach',
      description: 'Create a technical plan: files to touch, contracts, state machines, and integration points.',
      role: 'architect',
      capabilities: ['system_design'],
      toolKeys: ['record_artifact'],
      priority: 'high',
      dependsOn: ['analyze-request'],
      verificationMethod: 'self_check',
    },
    {
      title: 'Implement changes',
      description: 'Write or modify code according to the approved plan.',
      role: 'frontend_engineer',
      capabilities: ['react', 'nextjs'],
      toolKeys: ['read_file', 'replace_string_in_file', 'run_in_terminal'],
      priority: 'high',
      dependsOn: ['design-approach'],
      verificationMethod: 'test',
    },
    {
      title: 'Verify implementation',
      description: 'Run typecheck, tests, and lint. Report findings.',
      role: 'qa_engineer',
      capabilities: ['vitest'],
      toolKeys: ['run_in_terminal', 'record_finding'],
      priority: 'high',
      dependsOn: ['implement-changes'],
      verificationMethod: 'test',
    },
  ],
  deploy: [
    {
      title: 'Check deployment readiness',
      description: 'Validate build, env vars, and secrets before deployment.',
      role: 'devops_engineer',
      capabilities: ['deployment'],
      toolKeys: ['run_in_terminal', 'git.status'],
      priority: 'critical',
      verificationMethod: 'self_check',
    },
    {
      title: 'Deploy to target environment',
      description: 'Run deployment command and monitor outcome.',
      role: 'devops_engineer',
      capabilities: ['deployment'],
      toolKeys: ['deployment.deploy'],
      priority: 'critical',
      dependsOn: ['check-deployment-readiness'],
      verificationMethod: 'test',
    },
  ],
  security: [
    {
      title: 'Security audit',
      description: 'Review secrets exposure, auth, and dangerous operations.',
      role: 'security_engineer',
      capabilities: ['security_audit'],
      toolKeys: ['grep_search', 'record_finding'],
      priority: 'critical',
      verificationMethod: 'independent_audit',
    },
  ],
};

function chooseTemplateKey(goal: string): string {
  const lower = goal.toLowerCase();
  if (lower.includes('deploy') || lower.includes('vercel')) return 'deploy';
  if (lower.includes('security') || lower.includes('audit')) return 'security';
  return 'default';
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Task Graph Builder ──────────────────────────────────────

export interface BuildPlanInput {
  runId: string;
  goal: string;
  constraints?: string[];
}

export interface BuildPlanResult {
  selectedAgents: SelectedAgent[];
  graph: TaskGraph;
  planArtifact: Artifact;
}

export async function buildPlan(input: BuildPlanInput): Promise<BuildPlanResult> {
  const { runId, goal, constraints = [] } = input;

  // Discover capabilities (best-effort)
  const { capabilities } = await discoverCapabilities();
  const availableKeys = new Set(capabilities.map((c) => c.key));

  const selectedAgents = selectAgentsForGoal(goal);
  const selectedRoles = new Set(selectedAgents.map((s) => s.agent.role));

  const templateKey = chooseTemplateKey(goal);
  const templates = GOAL_TEMPLATES[templateKey] ?? GOAL_TEMPLATES.default;

  // Only include tasks whose role is selected; if missing, swap to first selected engineer role
  const selectedEngineerRole = selectedAgents.find((s) =>
    ['frontend_engineer', 'backend_engineer', 'data_engineer', 'qa_engineer', 'devops_engineer', 'security_engineer'].includes(s.agent.role)
  )?.agent.role ?? 'frontend_engineer';

  const taskNodes: TaskNode[] = [];
  const idMap = new Map<string, string>();

  for (const tpl of templates) {
    const stableId = slugify(tpl.title);
    const id = stableId;
    idMap.set(stableId, id);

    const role = selectedRoles.has(tpl.role) ? tpl.role : selectedEngineerRole;
    const agent = jarvisAgentRegistry.getByRole(role)!;

    const toolKeys = tpl.toolKeys.filter((k) => availableKeys.has(k) || k.startsWith('record_'));

    taskNodes.push({
      id,
      runId,
      title: tpl.title,
      description: tpl.description,
      agentId: agent.id,
      role,
      toolKeys,
      dependsOn: tpl.dependsOn?.map((dep) => idMap.get(dep)!).filter(Boolean) ?? [],
      dependents: [],
      status: 'not_started',
      priority: tpl.priority,
      riskLevel: 'medium',
      artifactsIn: [],
      artifactsOut: [],
      findings: [],
      retryCount: 0,
    });
  }

  const graph = buildTaskGraph(taskNodes);

  const planArtifact: Artifact = {
    id: `plan-${runId}`,
    runId,
    type: 'plan',
    title: 'JARVIS Network Plan',
    content: JSON.stringify(
      {
        goal,
        constraints,
        selectedAgents: selectedAgents.map((s) => ({ id: s.agent.id, reason: s.reason })),
        graph,
      },
      null,
      2
    ),
    metadata: { templateKey, taskCount: graph.tasks.length },
    fileRefs: [],
    createdAt: new Date(),
  };

  return { selectedAgents, graph, planArtifact };
}
