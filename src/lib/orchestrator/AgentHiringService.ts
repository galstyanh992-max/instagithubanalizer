// ─── Agent OS — Agent Hiring Service ─────────────────────────
// Dynamically creates and registers temporary agents based on
// runtime requirements. When the orchestrator encounters a task
// that no existing agent can handle, it "hires" a new one.
//
// Flow:
// 1. Receive a hire request (role, task, capabilities)
// 2. Validate the request (no duplicate roles, limit temp agents)
// 3. Generate an AgentConfig for the new agent
// 4. Select skills from SkillRegistry based on capabilities
// 5. Select tools from ToolRegistry based on capabilities
// 6. Assign a model based on the role type
// 7. Register the new agent in AgentRegistry
// 8. Return the hire result

import { agentRegistry } from '../agent-core/registry';
import { skillRegistry } from '../skills/registry';
import { toolRegistry } from '../tools/registry';
import type { AgentConfig, AgentRole, SkillRef, ToolRef, ExecutionConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import { loggers } from '@/lib/logger';
import { getOpenRouterModelConfigForRole } from '../ai-provider/model-registry';

// ─── Types ───────────────────────────────────────────────────

export interface AgentHireRequest {
  role: string;
  task: string;
  capabilities: string[];
}

export interface AgentHireResult {
  success: boolean;
  agentId: string;
  agentName: string;
  role: string;
  assignedSkills: string[];
  assignedTools: string[];
  model: string;
  error?: string;
}

// ─── Constants ───────────────────────────────────────────────

/** Maximum number of temporary agents allowed at any time */
const MAX_TEMPORARY_AGENTS = 10;

/** Map capability keywords to skill IDs */
const CAPABILITY_SKILL_MAP: Record<string, string[]> = {
  code_review: ['code-review'],
  code_reviewer: ['code-review'],
  web_search: ['web-search'],
  research: ['web-search', 'summarization'],
  summarization: ['summarization'],
  planning: ['planning'],
  testing: ['testing'],
  documentation: ['documentation'],
  debugging: ['debugging'],
  optimization: ['optimization'],
};

/** Map capability keywords to tool IDs */
const CAPABILITY_TOOL_MAP: Record<string, string[]> = {
  filesystem: ['filesystem-read', 'filesystem-write'],
  file_read: ['filesystem-read'],
  file_write: ['filesystem-write'],
  terminal: ['terminal-exec'],
  shell: ['terminal-exec'],
  http: ['http-request'],
  web_request: ['http-request'],
  database: ['database-query'],
  calculator: ['calculator'],
  code_search: ['code-search'],
};

/** Visual profiles for different agent roles */
const ROLE_VISUAL_PROFILES: Record<string, { color: string; icon: string; avatarEmoji: string }> = {
  engineer: { color: '#3B82F6', icon: 'code', avatarEmoji: '💻' },
  analyst: { color: '#8B5CF6', icon: 'bar-chart-2', avatarEmoji: '📊' },
  designer: { color: '#EC4899', icon: 'palette', avatarEmoji: '🎨' },
  researcher: { color: '#10B981', icon: 'search', avatarEmoji: '🔬' },
  qa: { color: '#F59E0B', icon: 'shield', avatarEmoji: '🧪' },
  devops: { color: '#6366F1', icon: 'server', avatarEmoji: '🚀' },
  custom: { color: '#6B7280', icon: 'user', avatarEmoji: '🤖' },
};

/** Professional styles for different agent roles */
const ROLE_PROFESSIONAL_STYLES: Record<string, AgentConfig['professionalStyle']> = {
  engineer: {
    communicationStyle: 'technical and precise',
    decisionMaking: 'data-driven',
    attentionToDetail: 'high',
    collaborationStyle: 'collaborative',
  },
  analyst: {
    communicationStyle: 'analytical and structured',
    decisionMaking: 'evidence-based',
    attentionToDetail: 'high',
    collaborationStyle: 'consultative',
  },
  designer: {
    communicationStyle: 'creative and visual',
    decisionMaking: 'intuition-guided',
    attentionToDetail: 'moderate',
    collaborationStyle: 'iterative',
  },
  researcher: {
    communicationStyle: 'thorough and methodical',
    decisionMaking: 'evidence-based',
    attentionToDetail: 'very high',
    collaborationStyle: 'independent',
  },
  qa: {
    communicationStyle: 'detail-oriented and systematic',
    decisionMaking: 'criteria-based',
    attentionToDetail: 'very high',
    collaborationStyle: 'supportive',
  },
  devops: {
    communicationStyle: 'operational and concise',
    decisionMaking: 'metrics-driven',
    attentionToDetail: 'high',
    collaborationStyle: 'coordinated',
  },
  custom: {
    communicationStyle: 'adaptable',
    decisionMaking: 'flexible',
    attentionToDetail: 'moderate',
    collaborationStyle: 'collaborative',
  },
};

/** Default zones for different agent roles */
const ROLE_DEFAULT_ZONES: Record<string, string> = {
  engineer: 'dev-zone',
  analyst: 'analytics-zone',
  designer: 'design-zone',
  researcher: 'research-zone',
  qa: 'qa-zone',
  devops: 'ops-zone',
  custom: 'general-zone',
};

// ─── Agent Hiring Service ────────────────────────────────────

class AgentHiringService {
  private static instance: AgentHiringService | null = null;
  private hireCounter: number = 0;

  private constructor() {}

  static getInstance(): AgentHiringService {
    if (!AgentHiringService.instance) {
      AgentHiringService.instance = new AgentHiringService();
    }
    return AgentHiringService.instance;
  }

  /**
   * Hire a new temporary agent based on the request.
   *
   * Validates the request, generates a full AgentConfig,
   * selects appropriate skills and tools, and registers the agent.
   */
  async hire(request: AgentHireRequest): Promise<AgentHireResult> {
    try {
      // 1. Validate the request
      const validation = this.validateRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          agentId: '',
          agentName: '',
          role: request.role,
          assignedSkills: [],
          assignedTools: [],
          model: '',
          error: validation.error,
        };
      }

      // 2. Check temporary agent limit
      const tempCount = agentRegistry.listByType('temporary').length;
      if (tempCount >= MAX_TEMPORARY_AGENTS) {
        return {
          success: false,
          agentId: '',
          agentName: '',
          role: request.role,
          assignedSkills: [],
          assignedTools: [],
          model: '',
          error: `Maximum temporary agent limit reached (${MAX_TEMPORARY_AGENTS}). Cannot hire more agents.`,
        };
      }

      // 3. Generate unique agent ID and name
      this.hireCounter++;
      const agentId = `temp-${this.sanitizeId(request.role)}-${this.hireCounter}-${Date.now().toString(36)}`;
      const agentName = this.generateAgentName(request.role);

      // 4. Select skills based on capabilities
      const selectedSkillIds = this.selectSkills(request.capabilities);
      const assignedSkills: SkillRef[] = selectedSkillIds.map((skillId) => ({
        skillId,
        enabled: true,
      }));

      // 5. Select tools based on capabilities
      const selectedToolIds = this.selectTools(request.capabilities);
      const assignedTools: ToolRef[] = selectedToolIds.map((toolId) => {
        const tool = toolRegistry.get(toolId);
        return {
          toolId,
          enabled: true,
          requiredPermission: tool?.requiredPermission ?? 'none',
        };
      });

      // 6. Determine the agent role
      const agentRole = this.resolveAgentRole(request.role);

      // 7. Assign model based on role
      const modelAssignment = this.assignModel(request.role);
      const fallbackAssignment = getOpenRouterModelConfigForRole(request.role).fallback;

      // 8. Generate system prompt
      const systemPrompt = this.generateSystemPrompt(agentName, request.role, request.task, request.capabilities);

      // 9. Build the complete AgentConfig
      const tempConfig: AgentConfig = {
        id: agentId,
        name: agentName,
        humanName: `Temporary ${request.role}`,
        role: agentRole,
        type: 'temporary',
        description: `Temporary agent for: ${request.task}. Role: ${request.role}. Capabilities: ${request.capabilities.join(', ')}`,
        systemPrompt,
        model: {
          preferred: {
            provider: modelAssignment.provider,
            model: modelAssignment.model,
          },
          fallback: {
            provider: fallbackAssignment?.provider ?? modelAssignment.provider,
            model: fallbackAssignment?.model ?? modelAssignment.model,
          },
        },
        execution: {
          ...DEFAULT_EXECUTION_CONFIG,
          temperature: 0.7,
        },
        skills: assignedSkills,
        tools: assignedTools,
        hooks: [],
        visualProfile: ROLE_VISUAL_PROFILES[this.getRoleCategory(request.role)] ?? ROLE_VISUAL_PROFILES.custom,
        professionalStyle: ROLE_PROFESSIONAL_STYLES[this.getRoleCategory(request.role)] ?? ROLE_PROFESSIONAL_STYLES.custom,
        defaultZone: ROLE_DEFAULT_ZONES[this.getRoleCategory(request.role)] ?? 'general-zone',
      };

      // 10. Register the agent
      agentRegistry.register(tempConfig);

      // 11. Emit event
      await eventBus.emit(EventTypes.AGENT_STATUS_CHANGED, {
        agentId,
        fromStatus: 'offline',
        toStatus: 'idle',
        timestamp: Date.now(),
        source: 'agent-hiring-service',
      }).catch(() => {});

      loggers.orchestrator.info(
        `[AgentHiringService] Hired agent: ${agentName} (${agentId}) ` +
        `with ${assignedSkills.length} skills, ${assignedTools.length} tools`
      );

      return {
        success: true,
        agentId,
        agentName,
        role: request.role,
        assignedSkills: selectedSkillIds,
        assignedTools: selectedToolIds,
        model: modelAssignment.model,
      };
    } catch (error) {
      loggers.orchestrator.error({ err: error }, '[AgentHiringService] Hire failed:');
      return {
        success: false,
        agentId: '',
        agentName: '',
        role: request.role,
        assignedSkills: [],
        assignedTools: [],
        model: '',
        error: `Failed to hire agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Fire (unregister) a temporary agent.
   */
  async fire(agentId: string): Promise<boolean> {
    const config = agentRegistry.get(agentId);
    if (!config) {
      loggers.orchestrator.warn(`[AgentHiringService] Cannot fire agent: ${agentId} not found`);
      return false;
    }

    if (config.type !== 'temporary') {
      loggers.orchestrator.warn(`[AgentHiringService] Cannot fire permanent agent: ${agentId}`);
      return false;
    }

    const success = agentRegistry.unregister(agentId);

    if (success) {
      await eventBus.emit(EventTypes.AGENT_STATUS_CHANGED, {
        agentId,
        fromStatus: agentRegistry.getStatus(agentId),
        toStatus: 'offline',
        timestamp: Date.now(),
        source: 'agent-hiring-service',
      }).catch(() => {});

      loggers.orchestrator.info(`[AgentHiringService] Fired agent: ${config.name} (${agentId})`);
    }

    return success;
  }

  /**
   * List all currently hired (temporary) agents.
   */
  listHired(): AgentConfig[] {
    return agentRegistry.listByType('temporary');
  }

  /**
   * Get the count of currently hired agents.
   */
  getHiredCount(): number {
    return agentRegistry.listByType('temporary').length;
  }

  // ── Private Helpers ────────────────────────────────────────

  /**
   * Validate the hire request.
   */
  private validateRequest(request: AgentHireRequest): { valid: boolean; error?: string } {
    if (!request.role || request.role.trim().length === 0) {
      return { valid: false, error: 'Agent role is required.' };
    }

    if (!request.task || request.task.trim().length === 0) {
      return { valid: false, error: 'Task description is required.' };
    }

    if (!request.capabilities || request.capabilities.length === 0) {
      return { valid: false, error: 'At least one capability must be specified.' };
    }

    // Check for duplicate role among temporary agents
    const existingTemp = agentRegistry.listByType('temporary');
    const duplicateRole = existingTemp.find(
      (a) => a.role === this.resolveAgentRole(request.role)
    );
    if (duplicateRole) {
      return {
        valid: false,
        error: `A temporary agent with role "${request.role}" already exists: ${duplicateRole.name} (${duplicateRole.id}). Fire it first if you want to replace it.`,
      };
    }

    return { valid: true };
  }

  /**
   * Select skills from the SkillRegistry based on requested capabilities.
   */
  private selectSkills(capabilities: string[]): string[] {
    const skillIds = new Set<string>();
    const availableSkillIds = new Set(skillRegistry.listIds());

    for (const cap of capabilities) {
      const normalizedCap = cap.toLowerCase().replace(/[-\s]/g, '_');

      // Check direct mapping
      const mapped = CAPABILITY_SKILL_MAP[normalizedCap];
      if (mapped) {
        for (const id of mapped) {
          if (availableSkillIds.has(id)) {
            skillIds.add(id);
          }
        }
      }

      // Check partial match against registered skills
      for (const registeredId of availableSkillIds) {
        const normalizedRegistered = registeredId.toLowerCase().replace(/[-\s]/g, '_');
        if (
          normalizedRegistered.includes(normalizedCap) ||
          normalizedCap.includes(normalizedRegistered)
        ) {
          skillIds.add(registeredId);
        }
      }
    }

    return Array.from(skillIds);
  }

  /**
   * Select tools from the ToolRegistry based on requested capabilities.
   */
  private selectTools(capabilities: string[]): string[] {
    const toolIds = new Set<string>();
    const availableToolIds = new Set(toolRegistry.listIds());

    for (const cap of capabilities) {
      const normalizedCap = cap.toLowerCase().replace(/[-\s]/g, '_');

      // Check direct mapping
      const mapped = CAPABILITY_TOOL_MAP[normalizedCap];
      if (mapped) {
        for (const id of mapped) {
          if (availableToolIds.has(id)) {
            toolIds.add(id);
          }
        }
      }

      // Check partial match against registered tools
      for (const registeredId of availableToolIds) {
        const normalizedRegistered = registeredId.toLowerCase().replace(/[-\s]/g, '_');
        if (
          normalizedRegistered.includes(normalizedCap) ||
          normalizedCap.includes(normalizedRegistered)
        ) {
          toolIds.add(registeredId);
        }
      }
    }

    return Array.from(toolIds);
  }

  /**
   * Assign a model based on the role category.
   */
  private assignModel(role: string): { provider: string; model: string } {
    return getOpenRouterModelConfigForRole(role).preferred;
  }

  /**
   * Resolve the string role to an AgentRole type.
   */
  private resolveAgentRole(role: string): AgentRole {
    const normalized = role.toLowerCase().replace(/[-\s]/g, '_');

    const roleMap: Record<string, AgentRole> = {
      orchestrator: 'orchestrator',
      analyst: 'analyst',
      architect: 'architect',
      designer: 'designer',
      frontend_engineer: 'frontend_engineer',
      frontend: 'frontend_engineer',
      backend_engineer: 'backend_engineer',
      backend: 'backend_engineer',
      data_engineer: 'data_engineer',
      data: 'data_engineer',
      qa_engineer: 'qa_engineer',
      qa: 'qa_engineer',
      tester: 'qa_engineer',
      devops_engineer: 'devops_engineer',
      devops: 'devops_engineer',
      researcher: 'researcher',
    };

    return roleMap[normalized] ?? 'custom';
  }

  /**
   * Get the role category for model/visual assignment.
   */
  private getRoleCategory(role: string): string {
    const normalized = role.toLowerCase().replace(/[-\s]/g, '_');

    if (normalized.includes('engineer') || normalized.includes('frontend') || normalized.includes('backend') || normalized.includes('developer')) {
      return 'engineer';
    }
    if (normalized.includes('analyst') || normalized.includes('analytics')) {
      return 'analyst';
    }
    if (normalized.includes('design') || normalized.includes('ux') || normalized.includes('ui')) {
      return 'designer';
    }
    if (normalized.includes('research') || normalized.includes('investigator')) {
      return 'researcher';
    }
    if (normalized.includes('qa') || normalized.includes('test') || normalized.includes('quality')) {
      return 'qa';
    }
    if (normalized.includes('devops') || normalized.includes('infra') || normalized.includes('ops') || normalized.includes('deploy')) {
      return 'devops';
    }

    return 'custom';
  }

  /**
   * Generate a human-readable agent name.
   */
  private generateAgentName(role: string): string {
    const category = this.getRoleCategory(role);
    const adjectives: Record<string, string[]> = {
      engineer: ['Swift', 'Keen', 'Sharp', 'Nimble', 'Agile'],
      analyst: ['Clear', 'Deep', 'Sharp', 'Bright', 'Astute'],
      designer: ['Creative', 'Vivid', 'Bold', 'Fresh', 'Vibrant'],
      researcher: ['Thorough', 'Careful', 'Curious', 'Keen', 'Insightful'],
      qa: ['Vigilant', 'Precise', 'Exact', 'Thorough', 'Careful'],
      devops: ['Steady', 'Reliable', 'Solid', 'Robust', 'Swift'],
      custom: ['Ready', 'Able', 'Keen', 'Quick', 'Smart'],
    };

    const names: Record<string, string[]> = {
      engineer: ['Coder', 'Builder', 'Architect', 'Developer', 'Hacker'],
      analyst: ['Analyst', 'Strategist', 'Insighter', 'Evaluator', 'Observer'],
      designer: ['Designer', 'Artist', 'Creator', 'Stylist', 'Visionary'],
      researcher: ['Researcher', 'Explorer', 'Scholar', 'Investigator', 'Scout'],
      qa: ['Tester', 'Inspector', 'Validator', 'Checker', 'Guardian'],
      devops: ['Operator', 'Deployer', 'Runner', 'Builder', 'Engineer'],
      custom: ['Agent', 'Worker', 'Specialist', 'Expert', 'Assistant'],
    };

    const adj = adjectives[category]?.[this.hireCounter % 5] ?? 'Ready';
    const name = names[category]?.[this.hireCounter % 5] ?? 'Agent';

    return `${adj} ${name}`;
  }

  /**
   * Generate a system prompt for the temporary agent.
   */
  private generateSystemPrompt(
    name: string,
    role: string,
    task: string,
    capabilities: string[]
  ): string {
    return `You are ${name}, a temporary ${role} agent in the Agent OS system.

YOUR MISSION:
${task}

YOUR CAPABILITIES:
${capabilities.map((c) => `- ${c}`).join('\n')}

GUIDELINES:
- Focus specifically on your assigned task
- Be thorough and precise in your work
- If you encounter issues outside your capabilities, report them clearly
- Provide structured, actionable output
- You are a temporary agent — focus on completing your task efficiently
- Always respond with the complete answer, not just an outline`;
  }

  /**
   * Sanitize a string for use in an agent ID.
   */
  private sanitizeId(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 20);
  }
}

export const agentHiringService = AgentHiringService.getInstance();
