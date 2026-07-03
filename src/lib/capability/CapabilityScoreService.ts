// ─── Agent OS — Capability Score Service ──────────────────────
// Manages agent capability scoring (0-100), auto-assessment,
// system gap detection, and leaderboard ranking.

import { db } from '../db';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';

// ─── Score Categories ─────────────────────────────────────────

export const SCORE_CATEGORIES = [
  'coding',
  'research',
  'design',
  'communication',
  'automation',
  'management',
  'legal',
  'analysis',
  'media',
  'security',
] as const;

export type ScoreCategory = (typeof SCORE_CATEGORIES)[number];

// ─── Default Scores per Role ──────────────────────────────────

interface RoleScoreProfile {
  [capabilityKey: string]: number;
}

const DEFAULT_ROLE_SCORES: Record<string, RoleScoreProfile> = {
  orchestrator: {
    coding: 40,
    research: 60,
    design: 30,
    communication: 95,
    automation: 70,
    management: 95,
    legal: 50,
    analysis: 85,
    media: 25,
    security: 45,
  },
  analyst: {
    coding: 30,
    research: 90,
    design: 35,
    communication: 80,
    automation: 50,
    management: 60,
    legal: 55,
    analysis: 95,
    media: 30,
    security: 40,
  },
  architect: {
    coding: 80,
    research: 65,
    design: 55,
    communication: 70,
    automation: 50,
    management: 60,
    legal: 40,
    analysis: 85,
    media: 20,
    security: 70,
  },
  designer: {
    coding: 45,
    research: 40,
    design: 95,
    communication: 75,
    automation: 30,
    management: 35,
    legal: 30,
    analysis: 50,
    media: 85,
    security: 25,
  },
  frontend_engineer: {
    coding: 90,
    research: 40,
    design: 65,
    communication: 55,
    automation: 50,
    management: 35,
    legal: 25,
    analysis: 45,
    media: 55,
    security: 50,
  },
  backend_engineer: {
    coding: 90,
    research: 35,
    design: 25,
    communication: 50,
    automation: 60,
    management: 35,
    legal: 30,
    analysis: 50,
    media: 20,
    security: 70,
  },
  data_engineer: {
    coding: 75,
    research: 50,
    design: 20,
    communication: 45,
    automation: 70,
    management: 40,
    legal: 35,
    analysis: 80,
    media: 15,
    security: 55,
  },
  qa_engineer: {
    coding: 65,
    research: 45,
    design: 30,
    communication: 60,
    automation: 80,
    management: 45,
    legal: 35,
    analysis: 75,
    media: 20,
    security: 75,
  },
  devops_engineer: {
    coding: 60,
    research: 30,
    design: 20,
    communication: 50,
    automation: 95,
    management: 55,
    legal: 30,
    analysis: 45,
    media: 15,
    security: 85,
  },
  security_engineer: {
    coding: 70,
    research: 50,
    design: 20,
    communication: 45,
    automation: 65,
    management: 40,
    legal: 60,
    analysis: 70,
    media: 15,
    security: 95,
  },
  researcher: {
    coding: 35,
    research: 95,
    design: 30,
    communication: 70,
    automation: 40,
    management: 45,
    legal: 55,
    analysis: 85,
    media: 35,
    security: 30,
  },
};

// ─── Assessment Configuration ─────────────────────────────────

const SKILL_COUNT_BONUS_MAX = 10;   // max bonus points from skill count
const TOOL_COUNT_BONUS_MAX = 10;    // max bonus points from tool count
const USAGE_BONUS_MAX = 10;         // max bonus points from usage logs
const SKILL_BONUS_PER = 2;         // bonus per skill
const TOOL_BONUS_PER = 2;          // bonus per tool
const USAGE_BONUS_PER = 1;         // bonus per 5 usage logs

// ─── Capability Score Service ─────────────────────────────────

class CapabilityScoreService {
  private static instance: CapabilityScoreService | null = null;

  private constructor() {}

  static getInstance(): CapabilityScoreService {
    if (!CapabilityScoreService.instance) {
      CapabilityScoreService.instance = new CapabilityScoreService();
    }
    return CapabilityScoreService.instance;
  }

  // ── Get Agent Scores ──────────────────────────────────────────

  /**
   * Get all capability scores for an agent.
   */
  async getAgentScores(agentId: string) {
    const scores = await db.agentCapabilityScore.findMany({
      where: { agentId },
      orderBy: { capabilityKey: 'asc' },
    });

    return scores.map((s) => ({
      ...s,
      evidence: s.evidence ? JSON.parse(s.evidence) : null,
    }));
  }

  // ── Update Score (Upsert) ─────────────────────────────────────

  /**
   * Update or create a capability score for an agent.
   * Score is clamped to 0-100 range.
   */
  async updateScore(
    agentId: string,
    capabilityKey: string,
    score: number,
    evidence?: string
  ) {
    const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

    // Determine trend by comparing with previous score
    const existing = await db.agentCapabilityScore.findUnique({
      where: { agentId_capabilityKey: { agentId, capabilityKey } },
    });

    let trend: string = 'stable';
    if (existing) {
      if (clampedScore > existing.score) trend = 'improving';
      else if (clampedScore < existing.score) trend = 'declining';
    }

    const evidenceJson = evidence
      ? JSON.stringify(
          existing?.evidence
            ? [...JSON.parse(existing.evidence), evidence]
            : [evidence]
        )
      : existing?.evidence ?? null;

    const result = await db.agentCapabilityScore.upsert({
      where: { agentId_capabilityKey: { agentId, capabilityKey } },
      update: {
        score: clampedScore,
        trend,
        evidence: evidenceJson,
        lastAssessedAt: new Date(),
      },
      create: {
        agentId,
        capabilityKey,
        score: clampedScore,
        trend,
        evidence: evidence ? JSON.stringify([evidence]) : null,
        lastAssessedAt: new Date(),
      },
    });

    await eventBus.emit(EventTypes.AGENT_CAPABILITY_UPDATED, {
      agentId,
      capabilityKey,
      level: Math.round(clampedScore / 25), // 0-4 scale for event
      enabled: true,
      timestamp: Date.now(),
      source: 'capability-score-service',
    });

    return {
      ...result,
      evidence: result.evidence ? JSON.parse(result.evidence) : null,
    };
  }

  // ── Auto-Assess Agent ─────────────────────────────────────────

  /**
   * Auto-assess an agent based on its skills, tools, capabilities, and usage.
   * Algorithm: base_score_from_role + skill_count_bonus + tool_count_bonus + usage_bonus
   */
  async assessAgent(agentId: string) {
    const agent = await db.agent.findUnique({
      where: { id: agentId },
      include: {
        skillLinks: { include: { skill: true } },
        toolLinks: { include: { tool: true } },
        capabilities: true,
      },
    });

    if (!agent) throw new Error(`Agent not found: ${agentId}`);

    const roleProfile = DEFAULT_ROLE_SCORES[agent.role] ?? {};
    const enabledSkills = agent.skillLinks.filter((s) => s.enabled && s.installed);
    const enabledTools = agent.toolLinks.filter((t) => t.enabled && t.installed);

    // Calculate usage count from skill usage logs
    const skillUsageCount = await db.skillUsageLog.count({
      where: { agentId, action: 'execute', success: true },
    });

    // Calculate usage count from tool usage logs
    const toolUsageCount = await db.toolUsageLog.count({
      where: { agentId, success: true },
    });

    const totalUsage = skillUsageCount + toolUsageCount;

    const skillBonus = Math.min(SKILL_COUNT_BONUS_MAX, enabledSkills.length * SKILL_BONUS_PER);
    const toolBonus = Math.min(TOOL_COUNT_BONUS_MAX, enabledTools.length * TOOL_BONUS_PER);
    const usageBonus = Math.min(USAGE_BONUS_MAX, Math.floor(totalUsage / 5) * USAGE_BONUS_PER);

    const results: Array<{
      id: string;
      agentId: string;
      capabilityKey: string;
      score: number;
      trend: string;
      evidence: string[] | null;
      lastAssessedAt: Date;
      createdAt: Date;
      updatedAt: Date;
    }> = [];

    for (const category of SCORE_CATEGORIES) {
      const baseScore = roleProfile[category] ?? 30; // default 30 if role has no mapping
      const finalScore = Math.min(100, baseScore + skillBonus + toolBonus + usageBonus);

      const result = await this.updateScore(
        agentId,
        category,
        finalScore,
        `Auto-assessed: base=${baseScore}, skill_bonus=${skillBonus}, tool_bonus=${toolBonus}, usage_bonus=${usageBonus}`
      );

      results.push(result);
    }

    return results;
  }

  // ── Get System Gaps ───────────────────────────────────────────

  /**
   * Find capability areas where NO agent has a high score (>70).
   * Returns categories with the highest scoring agent below threshold.
   */
  async getSystemGaps(threshold: number = 70) {
    const allScores = await db.agentCapabilityScore.findMany({
      include: { agent: { select: { id: true, name: true, role: true } } },
    });

    const categoryMap = new Map<string, { maxScore: number; bestAgent: { id: string; name: string; role: string } | null }>();

    for (const score of allScores) {
      const existing = categoryMap.get(score.capabilityKey);
      if (!existing || score.score > existing.maxScore) {
        categoryMap.set(score.capabilityKey, {
          maxScore: score.score,
          bestAgent: { id: score.agent.id, name: score.agent.name, role: score.agent.role },
        });
      }
    }

    // Find gaps — categories where best score is below threshold
    const gaps: Array<{
      capabilityKey: string;
      maxScore: number;
      bestAgent: { id: string; name: string; role: string } | null;
      gap: number;
    }> = [];

    for (const category of SCORE_CATEGORIES) {
      const entry = categoryMap.get(category);
      if (!entry || entry.maxScore < threshold) {
        gaps.push({
          capabilityKey: category,
          maxScore: entry?.maxScore ?? 0,
          bestAgent: entry?.bestAgent ?? null,
          gap: threshold - (entry?.maxScore ?? 0),
        });
      }
    }

    // Sort by gap size descending (biggest gaps first)
    return gaps.sort((a, b) => b.gap - a.gap);
  }

  // ── Seed Default Scores ───────────────────────────────────────

  /**
   * Seed default capability scores for an agent based on its role.
   * Does not overwrite existing scores.
   */
  async seedDefaultScores(agentId: string, role: string): Promise<{ created: number; skipped: number }> {
    const roleProfile = DEFAULT_ROLE_SCORES[role];
    if (!roleProfile) return { created: 0, skipped: 0 };

    let created = 0;
    let skipped = 0;

    for (const [capabilityKey, score] of Object.entries(roleProfile)) {
      const existing = await db.agentCapabilityScore.findUnique({
        where: { agentId_capabilityKey: { agentId, capabilityKey } },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await db.agentCapabilityScore.create({
        data: {
          agentId,
          capabilityKey,
          score,
          trend: 'stable',
          evidence: JSON.stringify([`Seeded from role: ${role}`]),
        },
      });

      created++;
    }

    return { created, skipped };
  }

  // ── Get Leaderboard ───────────────────────────────────────────

  /**
   * Rank agents by score for a specific capability.
   * Returns agents sorted by score descending.
   */
  async getLeaderboard(capabilityKey: string) {
    const scores = await db.agentCapabilityScore.findMany({
      where: { capabilityKey },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            role: true,
            status: true,
            locationZone: true,
          },
        },
      },
      orderBy: { score: 'desc' },
    });

    return scores.map((s, index) => ({
      rank: index + 1,
      agentId: s.agentId,
      agentName: s.agent.name,
      agentRole: s.agent.role,
      agentStatus: s.agent.status,
      score: s.score,
      trend: s.trend,
      lastAssessedAt: s.lastAssessedAt,
    }));
  }

  // ── Ensure Default Scores for Workspace ───────────────────────

  /**
   * Ensure all permanent agents in a workspace have default scores.
   */
  async ensureDefaultScores(workspaceId: string): Promise<{ created: number; skipped: number }> {
    const agents = await db.agent.findMany({
      where: { workspaceId, type: 'permanent' },
    });

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const agent of agents) {
      const result = await this.seedDefaultScores(agent.id, agent.role);
      totalCreated += result.created;
      totalSkipped += result.skipped;
    }

    return { created: totalCreated, skipped: totalSkipped };
  }

  // ── Get Default Role Scores ───────────────────────────────────

  /**
   * Get the default score profile for a role.
   */
  getDefaultRoleScores(role: string): RoleScoreProfile | undefined {
    return DEFAULT_ROLE_SCORES[role];
  }

  // ── Get Score Categories ──────────────────────────────────────

  /**
   * Get all score category keys.
   */
  getScoreCategories(): readonly string[] {
    return SCORE_CATEGORIES;
  }
}

export const capabilityScoreService = CapabilityScoreService.getInstance();
