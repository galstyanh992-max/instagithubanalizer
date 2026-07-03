// ─── Agent OS — Agent Profile Service ────────────────────────
// Manages agent profiles: display names, bios, seniority, strengths, etc.

import { db } from '../db';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import type { UpdateAgentProfileInput } from './types';

// ─── Default Profiles per Role ───────────────────────────────

interface DefaultProfile {
  displayName: string;
  avatarKey: string;
  bio: string;
  seniority: string;
  strengths: string[];
  limitations: string[];
  responsibilities: string[];
  workingStyle: Record<string, unknown>;
}

const DEFAULT_PROFILES: Record<string, DefaultProfile> = {
  orchestrator: {
    displayName: 'Orchestrator',
    avatarKey: '👑',
    bio: 'Central coordinator responsible for breaking down user requests, assigning tasks to specialists, and ensuring project-wide alignment.',
    seniority: 'lead',
    strengths: ['Strategic planning', 'Resource allocation', 'Conflict resolution', 'Team coordination'],
    limitations: ['Does not execute implementation directly', 'Relies on specialist output quality'],
    responsibilities: ['Break down user requests', 'Assign tasks to agents', 'Monitor progress', 'Resolve dependencies'],
    workingStyle: { focus: 'coordination', decisionSpeed: 'measured', communicationFrequency: 'high' },
  },
  analyst: {
    displayName: 'Product Analyst',
    avatarKey: '🔍',
    bio: 'Analytical thinker focused on gathering requirements, identifying edge cases, and creating detailed specifications.',
    seniority: 'senior',
    strengths: ['Requirements analysis', 'Edge case detection', 'Acceptance criteria'],
    limitations: ['May over-analyze simple tasks', 'Prefers thorough documentation'],
    responsibilities: ['Gather requirements', 'Create specifications', 'Identify risks'],
    workingStyle: { focus: 'analysis', decisionSpeed: 'deliberate', communicationFrequency: 'moderate' },
  },
  architect: {
    displayName: 'Software Architect',
    avatarKey: '🏗️',
    bio: 'System design expert who ensures architectural consistency, selects patterns, and defines interfaces across the project.',
    seniority: 'principal',
    strengths: ['System design', 'Pattern selection', 'Interface design', 'Trade-off analysis'],
    limitations: ['May over-engineer simple solutions', 'Focuses on long-term over short-term'],
    responsibilities: ['Design architecture', 'Review technical decisions', 'Ensure consistency'],
    workingStyle: { focus: 'design', decisionSpeed: 'careful', communicationFrequency: 'moderate' },
  },
  designer: {
    displayName: 'UI/UX Designer',
    avatarKey: '🎨',
    bio: 'Visual design expert who creates intuitive, accessible, and consistent user interfaces.',
    seniority: 'senior',
    strengths: ['User experience', 'Visual hierarchy', 'Accessibility', 'Interaction design'],
    limitations: ['Requires clear requirements', 'Iterative process may take time'],
    responsibilities: ['Design interfaces', 'Create wireframes', 'Ensure consistency'],
    workingStyle: { focus: 'visual', decisionSpeed: 'iterative', communicationFrequency: 'moderate' },
  },
  frontend_engineer: {
    displayName: 'Frontend Engineer',
    avatarKey: '💻',
    bio: 'React specialist who builds performant, type-safe user interfaces with Next.js and modern tooling.',
    seniority: 'senior',
    strengths: ['React/Next.js', 'TypeScript', 'CSS/Tailwind', 'Performance'],
    limitations: ['Limited backend knowledge', 'Depends on API contracts'],
    responsibilities: ['Implement UI components', 'Manage client state', 'Optimize performance'],
    workingStyle: { focus: 'implementation', decisionSpeed: 'fast', communicationFrequency: 'moderate' },
  },
  backend_engineer: {
    displayName: 'Backend Engineer',
    avatarKey: '⚙️',
    bio: 'API specialist who designs robust endpoints, manages data access, and ensures security and reliability.',
    seniority: 'senior',
    strengths: ['API design', 'Database integration', 'Security', 'Error handling'],
    limitations: ['Limited frontend expertise', 'May over-normalize data'],
    responsibilities: ['Design APIs', 'Implement business logic', 'Ensure security'],
    workingStyle: { focus: 'reliability', decisionSpeed: 'careful', communicationFrequency: 'moderate' },
  },
  data_engineer: {
    displayName: 'Database Engineer',
    avatarKey: '🗃️',
    bio: 'Data specialist who designs schemas, optimizes queries, and ensures data integrity across the system.',
    seniority: 'senior',
    strengths: ['Schema design', 'Query optimization', 'Data integrity', 'Migration planning'],
    limitations: ['Narrow focus on data layer', 'May not consider UX implications'],
    responsibilities: ['Design schemas', 'Optimize queries', 'Plan migrations'],
    workingStyle: { focus: 'data', decisionSpeed: 'careful', communicationFrequency: 'low' },
  },
  qa_engineer: {
    displayName: 'QA Engineer',
    avatarKey: '🛡️',
    bio: 'Quality guardian who designs test strategies, writes automated tests, and verifies that acceptance criteria are met.',
    seniority: 'senior',
    strengths: ['Test strategy', 'Regression detection', 'Edge cases', 'Acceptance testing'],
    limitations: ['May slow down delivery for thoroughness', 'Requires clear acceptance criteria'],
    responsibilities: ['Design test strategies', 'Write automated tests', 'Verify quality'],
    workingStyle: { focus: 'quality', decisionSpeed: 'methodical', communicationFrequency: 'moderate' },
  },
  devops_engineer: {
    displayName: 'DevOps Engineer',
    avatarKey: '🚀',
    bio: 'Infrastructure specialist who sets up CI/CD pipelines, manages deployments, and ensures system reliability.',
    seniority: 'senior',
    strengths: ['CI/CD', 'Containerization', 'Infrastructure as code', 'Monitoring'],
    limitations: ['Limited feature development', 'Focuses on infrastructure over product'],
    responsibilities: ['Setup CI/CD', 'Configure deployments', 'Monitor health'],
    workingStyle: { focus: 'automation', decisionSpeed: 'fast', communicationFrequency: 'low' },
  },
  researcher: {
    displayName: 'Research Specialist',
    avatarKey: '📚',
    bio: 'Knowledge explorer who researches technologies, compares solutions, and provides well-sourced recommendations.',
    seniority: 'senior',
    strengths: ['Technology evaluation', 'Best practices', 'Fact-checking', 'Source analysis'],
    limitations: ['Research takes time', 'May present too many alternatives'],
    responsibilities: ['Research technologies', 'Compare solutions', 'Verify information'],
    workingStyle: { focus: 'research', decisionSpeed: 'thorough', communicationFrequency: 'moderate' },
  },
};

// ─── Agent Profile Service ───────────────────────────────────

class AgentProfileService {
  private static instance: AgentProfileService | null = null;

  private constructor() {}

  static getInstance(): AgentProfileService {
    if (!AgentProfileService.instance) {
      AgentProfileService.instance = new AgentProfileService();
    }
    return AgentProfileService.instance;
  }

  /**
   * Get agent profile by agentId, parsing JSON fields
   */
  async getAgentProfile(agentId: string) {
    const profile = await db.agentProfile.findUnique({
      where: { agentId },
    });
    if (!profile) return null;

    return {
      ...profile,
      workingStyle: profile.workingStyle ? JSON.parse(profile.workingStyle) : null,
      strengths: profile.strengths ? JSON.parse(profile.strengths) : [],
      limitations: profile.limitations ? JSON.parse(profile.limitations) : [],
      responsibilities: profile.responsibilities ? JSON.parse(profile.responsibilities) : [],
    };
  }

  /**
   * Update agent profile and emit event
   */
  async updateAgentProfile(agentId: string, data: UpdateAgentProfileInput) {
    const existing = await db.agentProfile.findUnique({ where: { agentId } });
    if (!existing) throw new Error(`Profile not found for agent: ${agentId}`);

    const updateData: Record<string, unknown> = {};
    const updatedFields: string[] = [];

    if (data.displayName !== undefined) {
      updateData.displayName = data.displayName;
      updatedFields.push('displayName');
    }
    if (data.avatarKey !== undefined) {
      updateData.avatarKey = data.avatarKey;
      updatedFields.push('avatarKey');
    }
    if (data.bio !== undefined) {
      updateData.bio = data.bio;
      updatedFields.push('bio');
    }
    if (data.seniority !== undefined) {
      updateData.seniority = data.seniority;
      updatedFields.push('seniority');
    }
    if (data.workingStyle !== undefined) {
      updateData.workingStyle = JSON.stringify(data.workingStyle);
      updatedFields.push('workingStyle');
    }
    if (data.strengths !== undefined) {
      updateData.strengths = JSON.stringify(data.strengths);
      updatedFields.push('strengths');
    }
    if (data.limitations !== undefined) {
      updateData.limitations = JSON.stringify(data.limitations);
      updatedFields.push('limitations');
    }
    if (data.responsibilities !== undefined) {
      updateData.responsibilities = JSON.stringify(data.responsibilities);
      updatedFields.push('responsibilities');
    }

    const updated = await db.agentProfile.update({
      where: { agentId },
      data: updateData,
    });

    await eventBus.emit(EventTypes.AGENT_PROFILE_UPDATED, {
      agentId,
      updatedFields,
      timestamp: Date.now(),
      source: 'agent-profile-service',
    });

    return {
      ...updated,
      workingStyle: updated.workingStyle ? JSON.parse(updated.workingStyle) : null,
      strengths: updated.strengths ? JSON.parse(updated.strengths) : [],
      limitations: updated.limitations ? JSON.parse(updated.limitations) : [],
      responsibilities: updated.responsibilities ? JSON.parse(updated.responsibilities) : [],
    };
  }

  /**
   * Create profile for an agent with defaults
   */
  async createProfileForAgent(agentId: string, defaults?: Partial<DefaultProfile>) {
    // Check if profile already exists
    const existing = await db.agentProfile.findUnique({ where: { agentId } });
    if (existing) return existing;

    // Get agent name for displayName default
    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error(`Agent not found: ${agentId}`);

    const roleDefaults = DEFAULT_PROFILES[agent.role];
    const profileDefaults = roleDefaults ?? {
      displayName: agent.name,
      avatarKey: '🤖',
      bio: `Agent with role: ${agent.role}`,
      seniority: 'senior',
      strengths: [],
      limitations: [],
      responsibilities: [],
      workingStyle: {},
    };

    const displayName = defaults?.displayName ?? profileDefaults.displayName;
    const avatarKey = defaults?.avatarKey ?? profileDefaults.avatarKey;
    const bio = defaults?.bio ?? profileDefaults.bio;
    const seniority = defaults?.seniority ?? profileDefaults.seniority;
    const strengths = defaults?.strengths ?? profileDefaults.strengths;
    const limitations = defaults?.limitations ?? profileDefaults.limitations;
    const responsibilities = defaults?.responsibilities ?? profileDefaults.responsibilities;
    const workingStyle = defaults?.workingStyle ?? profileDefaults.workingStyle;

    const profile = await db.agentProfile.create({
      data: {
        agentId,
        displayName,
        avatarKey,
        bio,
        seniority,
        workingStyle: JSON.stringify(workingStyle),
        strengths: JSON.stringify(strengths),
        limitations: JSON.stringify(limitations),
        responsibilities: JSON.stringify(responsibilities),
      },
    });

    return profile;
  }

  /**
   * Ensure all permanent agents in workspace have profiles
   */
  async ensureDefaultProfiles(workspaceId: string): Promise<{ created: number; skipped: number }> {
    const agents = await db.agent.findMany({
      where: {
        workspaceId,
        type: 'permanent',
      },
    });

    let created = 0;
    let skipped = 0;

    for (const agent of agents) {
      const existing = await db.agentProfile.findUnique({
        where: { agentId: agent.id },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await this.createProfileForAgent(agent.id);
      created++;
    }

    return { created, skipped };
  }

  /**
   * Get default profile data for a role
   */
  getDefaultProfile(role: string): DefaultProfile | undefined {
    return DEFAULT_PROFILES[role];
  }
}

export const agentProfileService = AgentProfileService.getInstance();
