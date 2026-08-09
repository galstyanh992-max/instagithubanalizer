// ─── JARVIS Agent Network — Agent Registry Contract ─────────
// Maps existing Agent OS default agents into the JARVIS AgentDefinition
// contract and exposes a lightweight registry for the network layer.

import { DEFAULT_AGENTS } from '@/lib/agent-registry/defaults';
import { AgentRoles } from '@/lib/types/agents';
import type { AgentDefinition } from './types';

// ─── Role Capability Map ─────────────────────────────────────

const ROLE_CAPABILITY_MAP: Record<string, string[]> = {
  [AgentRoles.ORCHESTRATOR]: ['planning', 'coordination', 'task_decomposition', 'conflict_resolution', 'release_gate'],
  [AgentRoles.ANALYST]: ['requirements_analysis', 'edge_case_detection', 'acceptance_criteria', 'user_story'],
  [AgentRoles.ARCHITECT]: ['system_design', 'interface_contracts', 'pattern_selection', 'tech_decisions'],
  [AgentRoles.DESIGNER]: ['ui_design', 'ux_design', 'wireframes', 'accessibility', 'design_system'],
  [AgentRoles.FRONTEND_ENGINEER]: ['react', 'nextjs', 'components', 'state_management', 'responsive_ui'],
  [AgentRoles.BACKEND_ENGINEER]: ['api_design', 'business_logic', 'auth', 'validation', 'security'],
  [AgentRoles.DATA_ENGINEER]: ['schema_design', 'queries', 'migrations', 'performance', 'data_integrity'],
  [AgentRoles.QA_ENGINEER]: ['test_design', 'test_execution', 'bug_reports', 'regression', 'automation'],
  [AgentRoles.DEVOPS_ENGINEER]: ['deployment', 'infrastructure', 'ci_cd', 'containers', 'monitoring'],
  [AgentRoles.SECURITY_ENGINEER]: ['security_audit', 'threat_modeling', 'secrets_review', 'compliance'],
  [AgentRoles.RESEARCHER]: ['research', 'summarization', 'comparative_analysis', 'documentation'],
  [AgentRoles.MARKETING_LEAD]: ['strategy', 'campaign_planning', 'brand_alignment', 'messaging'],
  [AgentRoles.MARKET_RESEARCHER]: ['market_analysis', 'competitor_research', 'trends'],
  [AgentRoles.CONTENT_STRATEGIST]: ['content_planning', 'editorial_calendar', 'tone_guidelines'],
  [AgentRoles.GROWTH_MANAGER]: ['growth_strategy', 'experiments', 'metrics', 'funnels'],
  [AgentRoles.TREND_ANALYST]: ['trend_detection', 'social_listening', 'forecasting'],
  [AgentRoles.COPYWRITER]: ['copywriting', 'editing', 'headlines', 'cta'],
  [AgentRoles.VISUAL_DESIGNER]: ['visual_assets', 'brand_graphics', 'social_graphics'],
  [AgentRoles.VIDEO_EDITOR]: ['video_editing', 'storyboarding', 'motion_graphics'],
  [AgentRoles.PUBLISHER]: ['scheduling', 'distribution', 'platform_optimization'],
  [AgentRoles.COMMUNITY_MANAGER]: ['community_engagement', 'moderation', 'support'],
  [AgentRoles.MESSENGER_SUPPORT]: ['support_tickets', 'customer_success', 'escalation'],
  [AgentRoles.SALES_AGENT]: ['lead_qualification', 'outreach', 'crm', 'follow_up'],
  [AgentRoles.BRAND_GUARDIAN]: ['brand_consistency', 'guidelines', 'approval'],
};

const ROLE_ALLOWED_TOOLS: Record<string, string[]> = {
  [AgentRoles.ORCHESTRATOR]: ['plan_tasks', 'assign_agent', 'review_status', 'release_gate', 'record_decision'],
  [AgentRoles.ANALYST]: ['read_file', 'grep_search', 'ask_user', 'record_artifact', 'record_finding'],
  [AgentRoles.ARCHITECT]: ['read_file', 'file_search', 'record_artifact', 'record_decision'],
  [AgentRoles.DESIGNER]: ['browser_snapshot', 'record_artifact', 'record_decision'],
  [AgentRoles.FRONTEND_ENGINEER]: ['read_file', 'replace_string_in_file', 'run_in_terminal', 'browser_snapshot', 'record_artifact'],
  [AgentRoles.BACKEND_ENGINEER]: ['read_file', 'replace_string_in_file', 'run_in_terminal', 'record_artifact'],
  [AgentRoles.DATA_ENGINEER]: ['read_file', 'replace_string_in_file', 'run_in_terminal', 'record_artifact'],
  [AgentRoles.QA_ENGINEER]: ['run_in_terminal', 'browser_snapshot', 'record_artifact', 'record_finding'],
  [AgentRoles.DEVOPS_ENGINEER]: ['run_in_terminal', 'record_artifact'],
  [AgentRoles.SECURITY_ENGINEER]: ['read_file', 'grep_search', 'record_finding', 'record_artifact'],
  [AgentRoles.RESEARCHER]: ['web_search', 'fetch_webpage', 'record_artifact'],
};

const ROLE_FORBIDDEN_ACTIONS: string[] = [
  'delete_production_database',
  'force_push_git',
  'expose_secrets',
  'run_untrusted_binaries',
  'modify_production_env',
  'disable_authentication',
];

const COMMON_SKILLS: string[] = ['record_artifact', 'record_finding', 'record_decision', 'ask_user'];

const ROLE_SKILLS: Record<string, string[]> = {
  [AgentRoles.ORCHESTRATOR]: [...COMMON_SKILLS, 'plan_tasks', 'release_gate'],
  [AgentRoles.ANALYST]: [...COMMON_SKILLS, 'requirements_analysis'],
  [AgentRoles.ARCHITECT]: [...COMMON_SKILLS, 'system_design'],
  [AgentRoles.DESIGNER]: [...COMMON_SKILLS, 'ui_ux_design'],
  [AgentRoles.FRONTEND_ENGINEER]: [...COMMON_SKILLS, 'react', 'nextjs', 'tailwind'],
  [AgentRoles.BACKEND_ENGINEER]: [...COMMON_SKILLS, 'api_design', 'auth'],
  [AgentRoles.DATA_ENGINEER]: [...COMMON_SKILLS, 'prisma', 'sql'],
  [AgentRoles.QA_ENGINEER]: [...COMMON_SKILLS, 'playwright', 'vitest'],
  [AgentRoles.DEVOPS_ENGINEER]: [...COMMON_SKILLS, 'docker', 'vercel'],
  [AgentRoles.SECURITY_ENGINEER]: [...COMMON_SKILLS, 'security_audit'],
  [AgentRoles.RESEARCHER]: [...COMMON_SKILLS, 'web_search'],
};

// ─── Contract Mapping ────────────────────────────────────────

export function toAgentDefinition(config: (typeof DEFAULT_AGENTS)[number]): AgentDefinition {
  const role = config.role;
  const capabilities = ROLE_CAPABILITY_MAP[role] ?? ['general'];
  const allowedTools = ROLE_ALLOWED_TOOLS[role] ?? COMMON_SKILLS;
  const skills = ROLE_SKILLS[role] ?? COMMON_SKILLS;

  return {
    id: role,
    name: config.name,
    role,
    mission: config.systemPrompt?.split('\n')[0]?.replace('You are the ', '').replace('.', '') ?? role,
    capabilities,
    allowedTools,
    forbiddenActions: ROLE_FORBIDDEN_ACTIONS,
    skills,
    inputSchema: {
      type: 'object',
      required: ['runId', 'taskId', 'mission'],
      properties: {
        runId: { type: 'string' },
        taskId: { type: 'string' },
        mission: { type: 'string' },
        inputArtifacts: { type: 'array', items: { type: 'object' } },
      },
    },
    outputSchema: {
      type: 'object',
      required: ['status', 'summary'],
      properties: {
        status: { type: 'string', enum: ['passed', 'needs_review', 'failed', 'blocked'] },
        summary: { type: 'string' },
        artifacts: { type: 'array', items: { type: 'object' } },
        proposedChanges: { type: 'array', items: { type: 'object' } },
      },
    },
    constraints: [
      'Always verify before claiming completion',
      'Never perform destructive actions without explicit approval',
      'Prefer read-only operations when uncertain',
    ],
    verificationRules: [
      'Self-check produced artifacts against acceptance criteria',
      'Report assumptions and unknowns explicitly',
    ],
    exitCriteria: ['Task objective met', 'Artifacts recorded', 'Findings reported'],
    enabled: true,
    isTemporary: config.type === 'temporary',
  };
}

// ─── Registry ────────────────────────────────────────────────

class JarvisAgentRegistry {
  private static instance: JarvisAgentRegistry | null = null;
  private definitions: Map<string, AgentDefinition> = new Map();

  private constructor() {
    this.refresh();
  }

  static getInstance(): JarvisAgentRegistry {
    if (!JarvisAgentRegistry.instance) {
      JarvisAgentRegistry.instance = new JarvisAgentRegistry();
    }
    return JarvisAgentRegistry.instance;
  }

  refresh(): void {
    this.definitions.clear();
    for (const config of DEFAULT_AGENTS) {
      const def = toAgentDefinition(config);
      this.definitions.set(def.id, def);
    }
  }

  list(): AgentDefinition[] {
    return Array.from(this.definitions.values());
  }

  listEnabled(): AgentDefinition[] {
    return this.list().filter((d) => d.enabled);
  }

  getById(id: string): AgentDefinition | undefined {
    return this.definitions.get(id);
  }

  getByRole(role: string): AgentDefinition | undefined {
    return this.definitions.get(role);
  }

  filterByCapability(capability: string): AgentDefinition[] {
    return this.list().filter((d) => d.capabilities.includes(capability));
  }

  filterByTool(toolKey: string): AgentDefinition[] {
    return this.list().filter((d) => d.allowedTools.includes(toolKey));
  }

  register(definition: AgentDefinition): void {
    this.definitions.set(definition.id, definition);
  }

  unregister(id: string): boolean {
    return this.definitions.delete(id);
  }
}

export const jarvisAgentRegistry = JarvisAgentRegistry.getInstance();
