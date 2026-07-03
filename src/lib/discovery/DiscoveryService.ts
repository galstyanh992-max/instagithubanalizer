// ─── Agent OS — Discovery Service ─────────────────────────────
// Dynamic tool/skill/agent discovery using keyword matching.
// Finds relevant resources for tasks and recommends installations.

import { db } from '../db';

// ─── Types ────────────────────────────────────────────────────

export interface DiscoveryResult {
  id: string;
  type: 'skill' | 'tool' | 'agent';
  key: string;
  name: string;
  description: string | null;
  relevanceScore: number;
  metadata?: Record<string, unknown>;
}

export interface GapRecommendation {
  capabilityKey: string;
  currentMaxScore: number;
  gap: number;
  recommendedSkills: Array<{ key: string; name: string; relevanceScore: number }>;
  recommendedTools: Array<{ key: string; name: string; relevanceScore: number }>;
}

export interface AgentRecommendation {
  suggestedRole: string;
  capabilityGaps: string[];
  reason: string;
}

// ─── Keyword Helpers ──────────────────────────────────────────

/**
 * Extract keywords from text — lowercase, remove punctuation, split.
 */
function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/**
 * Compute relevance score between a query and a target text.
 * Uses simple keyword overlap scoring.
 */
function computeRelevance(queryKeywords: string[], targetText: string): number {
  const targetLower = targetText.toLowerCase();
  const targetKeywords = extractKeywords(targetText);

  let matchCount = 0;
  let exactMatchCount = 0;

  for (const qk of queryKeywords) {
    if (targetLower.includes(qk)) {
      matchCount++;
      if (targetKeywords.includes(qk)) {
        exactMatchCount++;
      }
    }
  }

  if (queryKeywords.length === 0) return 0;

  // Weighted: exact matches count more
  const partialScore = matchCount / queryKeywords.length;
  const exactScore = exactMatchCount / queryKeywords.length;

  return Math.round((partialScore * 0.4 + exactScore * 0.6) * 100);
}

// ─── Discovery Service ────────────────────────────────────────

class DiscoveryService {
  private static instance: DiscoveryService | null = null;

  private constructor() {}

  static getInstance(): DiscoveryService {
    if (!DiscoveryService.instance) {
      DiscoveryService.instance = new DiscoveryService();
    }
    return DiscoveryService.instance;
  }

  // ── Find Skill for Task ───────────────────────────────────────

  /**
   * Find relevant skills for a task description using keyword matching.
   * Returns ranked results with relevance scores.
   */
  async findSkillForTask(taskDescription: string): Promise<DiscoveryResult[]> {
    const queryKeywords = extractKeywords(taskDescription);

    const skills = await db.skillDefinition.findMany({
      where: { status: 'available' },
    });

    const results: DiscoveryResult[] = [];

    for (const skill of skills) {
      const searchText = [skill.name, skill.description, skill.category, skill.tags ?? ''].join(' ');
      const relevance = computeRelevance(queryKeywords, searchText);

      if (relevance > 0) {
        results.push({
          id: skill.id,
          type: 'skill',
          key: skill.key,
          name: skill.name,
          description: skill.description,
          relevanceScore: relevance,
          metadata: {
            category: skill.category,
            tags: skill.tags ? JSON.parse(skill.tags) : [],
            installCount: skill.installCount,
          },
        });
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  // ── Find Tool for Task ────────────────────────────────────────

  /**
   * Find relevant tools for a task description using keyword matching.
   * Returns ranked results with relevance scores.
   */
  async findToolForTask(taskDescription: string): Promise<DiscoveryResult[]> {
    const queryKeywords = extractKeywords(taskDescription);

    const tools = await db.tool.findMany({
      where: { enabled: true },
    });

    const results: DiscoveryResult[] = [];

    for (const tool of tools) {
      const searchText = [tool.name, tool.description ?? '', tool.category, tool.key].join(' ');
      const relevance = computeRelevance(queryKeywords, searchText);

      if (relevance > 0) {
        results.push({
          id: tool.id,
          type: 'tool',
          key: tool.key,
          name: tool.name,
          description: tool.description,
          relevanceScore: relevance,
          metadata: {
            category: tool.category,
            riskLevel: tool.riskLevel,
          },
        });
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  // ── Find Agent for Task ───────────────────────────────────────

  /**
   * Find the best agent for a task based on capability scores.
   * Uses keyword matching against agent capabilities and role.
   */
  async findAgentForTask(taskDescription: string): Promise<DiscoveryResult[]> {
    const queryKeywords = extractKeywords(taskDescription);

    const agents = await db.agent.findMany({
      where: { type: 'permanent' },
      include: {
        capabilities: true,
        capabilityScores: true,
        profile: true,
      },
    });

    const results: DiscoveryResult[] = [];

    for (const agent of agents) {
      // Build search text from role, capabilities, profile
      const capTexts = agent.capabilities.map((c) => c.capabilityKey).join(' ');
      const profileBio = agent.profile?.bio ?? '';
      const strengths = agent.profile?.strengths ?? '';
      const searchText = [
        agent.name,
        agent.role,
        capTexts,
        profileBio,
        strengths,
      ].join(' ');

      const relevance = computeRelevance(queryKeywords, searchText);

      // Boost relevance with capability scores
      const relevantScores = agent.capabilityScores.filter((s) =>
        queryKeywords.some((qk) => s.capabilityKey.toLowerCase().includes(qk))
      );
      const scoreBoost = relevantScores.length > 0
        ? Math.round(relevantScores.reduce((sum, s) => sum + s.score, 0) / relevantScores.length * 0.1)
        : 0;

      const finalRelevance = Math.min(100, relevance + scoreBoost);

      if (finalRelevance > 0) {
        results.push({
          id: agent.id,
          type: 'agent',
          key: agent.role,
          name: agent.name,
          description: profileBio || `Agent with role: ${agent.role}`,
          relevanceScore: finalRelevance,
          metadata: {
            role: agent.role,
            status: agent.status,
            topCapabilities: agent.capabilityScores
              .sort((a, b) => b.score - a.score)
              .slice(0, 3)
              .map((s) => ({ key: s.capabilityKey, score: s.score })),
          },
        });
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  // ── Recommend Installations ───────────────────────────────────

  /**
   * Recommend skills/tools to install based on capability gaps in a workspace.
   */
  async recommendInstallations(workspaceId: string): Promise<GapRecommendation[]> {
    // Use lazy import to avoid circular dependency
    const { capabilityScoreService } = await import('../capability/CapabilityScoreService');
    const gaps = await capabilityScoreService.getSystemGaps(70);

    const recommendations: GapRecommendation[] = [];

    for (const gap of gaps) {
      // Find skills that could help with this gap
      const relatedSkills = await this.findSkillForTask(gap.capabilityKey);
      const relatedTools = await this.findToolForTask(gap.capabilityKey);

      // Check which skills are NOT yet installed on any agent in workspace
      const workspaceAgents = await db.agent.findMany({
        where: { workspaceId },
        include: { skillLinks: true, toolLinks: true },
      });

      const installedSkillIds = new Set(
        workspaceAgents.flatMap((a) => a.skillLinks.map((s) => s.skillId))
      );
      const installedToolIds = new Set(
        workspaceAgents.flatMap((a) => a.toolLinks.map((t) => t.toolId))
      );

      const newSkills = relatedSkills
        .filter((s) => !installedSkillIds.has(s.id))
        .slice(0, 3)
        .map((s) => ({ key: s.key, name: s.name, relevanceScore: s.relevanceScore }));

      const newTools = relatedTools
        .filter((t) => !installedToolIds.has(t.id))
        .slice(0, 3)
        .map((t) => ({ key: t.key, name: t.name, relevanceScore: t.relevanceScore }));

      recommendations.push({
        capabilityKey: gap.capabilityKey,
        currentMaxScore: gap.maxScore,
        gap: gap.gap,
        recommendedSkills: newSkills,
        recommendedTools: newTools,
      });
    }

    return recommendations;
  }

  // ── Recommend New Agent ───────────────────────────────────────

  /**
   * Recommend creating a new agent for uncovered capabilities.
   */
  async recommendNewAgent(workspaceId: string): Promise<AgentRecommendation[]> {
    // Use lazy import to avoid circular dependency
    const { capabilityScoreService } = await import('../capability/CapabilityScoreService');
    const gaps = await capabilityScoreService.getSystemGaps(50);

    // Map gaps to suggested agent roles
    const gapToRoleMap: Record<string, string[]> = {
      coding: ['frontend_engineer', 'backend_engineer'],
      research: ['researcher', 'analyst'],
      design: ['designer'],
      communication: ['orchestrator', 'analyst'],
      automation: ['devops_engineer'],
      management: ['orchestrator'],
      legal: ['researcher'],
      analysis: ['analyst', 'data_engineer'],
      media: ['designer'],
      security: ['security_engineer', 'devops_engineer'],
    };

    const existingRoles = await db.agent.findMany({
      where: { workspaceId, type: 'permanent' },
      select: { role: true },
    });
    const existingRoleSet = new Set(existingRoles.map((a) => a.role));

    const recommendations: AgentRecommendation[] = [];
    const seenRoles = new Set<string>();

    for (const gap of gaps) {
      const suggestedRoles = gapToRoleMap[gap.capabilityKey] ?? [];
      for (const role of suggestedRoles) {
        if (!existingRoleSet.has(role) && !seenRoles.has(role)) {
          seenRoles.add(role);
          // Collect all gaps this role could address
          const roleGaps = gaps
            .filter((g) => (gapToRoleMap[g.capabilityKey] ?? []).includes(role))
            .map((g) => g.capabilityKey);

          recommendations.push({
            suggestedRole: role,
            capabilityGaps: roleGaps,
            reason: `No ${role.replace(/_/g, ' ')} agent exists. Could address gaps in: ${roleGaps.join(', ')}`,
          });
        }
      }
    }

    return recommendations;
  }

  // ── Unified Search ────────────────────────────────────────────

  /**
   * Search across skills, tools, and agents.
   * Returns combined ranked results.
   */
  async search(query: string): Promise<DiscoveryResult[]> {
    const [skills, tools, agents] = await Promise.all([
      this.findSkillForTask(query),
      this.findToolForTask(query),
      this.findAgentForTask(query),
    ]);

    const combined = [...skills, ...tools, ...agents];
    return combined.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}

export const discoveryService = DiscoveryService.getInstance();
