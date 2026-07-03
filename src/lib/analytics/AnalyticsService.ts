// ─── Agent OS — Analytics & Insights Service ──────────────────
// Provides analytics, usage statistics, effectiveness metrics,
// capability gap analysis, and trend detection for the Agent OS.

import { db } from '../db';

// ─── Types ──────────────────────────────────────────────────

export interface SkillUsageStat {
  skillId: string;
  skillKey: string;
  skillName: string;
  category: string;
  totalUsage: number;
  successCount: number;
  failCount: number;
  successRate: number;
  avgDurationMs: number | null;
}

export interface ToolUsageStat {
  toolId: string;
  toolKey: string;
  toolName: string;
  category: string;
  totalUsage: number;
  successCount: number;
  failCount: number;
  successRate: number;
  avgDurationMs: number | null;
}

export interface AgentEffectivenessEntry {
  agentId: string;
  agentName: string;
  role: string;
  tasksCompleted: number;
  totalCost: number;
  costPerTask: number;
  successRate: number;
  capabilityScore: number;
  effectivenessRank: number;
}

export interface CapabilityGap {
  capabilityKey: string;
  averageScore: number;
  agentCount: number;
  trend: string;
  gap: 'critical' | 'moderate' | 'minor';
}

export interface SystemOverview {
  totalAgents: number;
  totalSkills: number;
  totalTools: number;
  totalSkillPacks: number;
  totalToolPacks: number;
  totalMarketplaceItems: number;
  totalWorkflows: number;
  totalCostLogs: number;
  totalEventLogs: number;
}

export interface TrendingItem {
  id: string;
  key: string;
  name: string;
  recentUsage: number;
  previousUsage: number;
  growthRate: number;
  trend: 'rising' | 'stable' | 'declining';
}

export interface InstallationTrend {
  date: string;
  skillInstalls: number;
  toolInstalls: number;
  totalInstalls: number;
}

export interface AgentSkillMatrixEntry {
  agentId: string;
  agentName: string;
  role: string;
  skills: Record<string, number>;
}

// ─── AnalyticsService ──────────────────────────────────────

class AnalyticsService {
  private static instance: AnalyticsService | null = null;

  private constructor() {}

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  // ─── Skill Usage Stats ──────────────────────────────────

  /**
   * Get skill usage statistics — most used skills, usage counts, success rates
   */
  async getSkillUsageStats(): Promise<SkillUsageStat[]> {
    const usageLogs = await db.skillUsageLog.findMany({
      select: {
        skillId: true,
        action: true,
        success: true,
        durationMs: true,
        skill: {
          select: {
            key: true,
            name: true,
            category: true,
          },
        },
      },
    });

    // Group by skillId
    const grouped = new Map<
      string,
      {
        skillKey: string;
        skillName: string;
        category: string;
        total: number;
        success: number;
        fail: number;
        durations: number[];
      }
    >();

    for (const log of usageLogs) {
      const existing = grouped.get(log.skillId);
      if (existing) {
        existing.total++;
        if (log.success) existing.success++;
        else existing.fail++;
        if (log.durationMs != null) existing.durations.push(log.durationMs);
      } else {
        grouped.set(log.skillId, {
          skillKey: log.skill.key,
          skillName: log.skill.name,
          category: log.skill.category,
          total: 1,
          success: log.success ? 1 : 0,
          fail: log.success ? 0 : 1,
          durations: log.durationMs != null ? [log.durationMs] : [],
        });
      }
    }

    const results: SkillUsageStat[] = [];
    for (const [skillId, data] of grouped) {
      const avgDurationMs =
        data.durations.length > 0
          ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length
          : null;

      results.push({
        skillId,
        skillKey: data.skillKey,
        skillName: data.skillName,
        category: data.category,
        totalUsage: data.total,
        successCount: data.success,
        failCount: data.fail,
        successRate: data.total > 0 ? data.success / data.total : 0,
        avgDurationMs,
      });
    }

    // Sort by total usage descending
    results.sort((a, b) => b.totalUsage - a.totalUsage);
    return results;
  }

  // ─── Tool Usage Stats ──────────────────────────────────

  /**
   * Get tool usage statistics — most used tools, usage counts, success rates
   */
  async getToolUsageStats(): Promise<ToolUsageStat[]> {
    const usageLogs = await db.toolUsageLog.findMany({
      select: {
        toolId: true,
        action: true,
        success: true,
        durationMs: true,
        tool: {
          select: {
            key: true,
            name: true,
            category: true,
          },
        },
      },
    });

    // Group by toolId
    const grouped = new Map<
      string,
      {
        toolKey: string;
        toolName: string;
        category: string;
        total: number;
        success: number;
        fail: number;
        durations: number[];
      }
    >();

    for (const log of usageLogs) {
      const existing = grouped.get(log.toolId);
      if (existing) {
        existing.total++;
        if (log.success) existing.success++;
        else existing.fail++;
        if (log.durationMs != null) existing.durations.push(log.durationMs);
      } else {
        grouped.set(log.toolId, {
          toolKey: log.tool.key,
          toolName: log.tool.name,
          category: log.tool.category,
          total: 1,
          success: log.success ? 1 : 0,
          fail: log.success ? 0 : 1,
          durations: log.durationMs != null ? [log.durationMs] : [],
        });
      }
    }

    const results: ToolUsageStat[] = [];
    for (const [toolId, data] of grouped) {
      const avgDurationMs =
        data.durations.length > 0
          ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length
          : null;

      results.push({
        toolId,
        toolKey: data.toolKey,
        toolName: data.toolName,
        category: data.category,
        totalUsage: data.total,
        successCount: data.success,
        failCount: data.fail,
        successRate: data.total > 0 ? data.success / data.total : 0,
        avgDurationMs,
      });
    }

    // Sort by total usage descending
    results.sort((a, b) => b.totalUsage - a.totalUsage);
    return results;
  }

  // ─── Agent Effectiveness ──────────────────────────────────

  /**
   * Get agent performance ranking for a workspace.
   * Ranks agents by tasks completed, cost efficiency, and success rate.
   */
  async getAgentEffectiveness(workspaceId: string): Promise<AgentEffectivenessEntry[]> {
    const agents = await db.agent.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        role: true,
        tasks: {
          select: { status: true },
        },
        costLogs: {
          select: { cost: true },
        },
        capabilityScores: {
          select: { score: true },
        },
      },
    });

    const entries: AgentEffectivenessEntry[] = agents.map((agent) => {
      const tasksCompleted = agent.tasks.filter(
        (t) => t.status === 'done'
      ).length;
      const totalCost = agent.costLogs.reduce((sum, c) => sum + c.cost, 0);
      const costPerTask = tasksCompleted > 0 ? totalCost / tasksCompleted : 0;

      // Success rate: done tasks / (done + failed) tasks
      const doneOrFailed = agent.tasks.filter(
        (t) => t.status === 'done' || t.status === 'failed'
      ).length;
      const successRate =
        doneOrFailed > 0
          ? agent.tasks.filter((t) => t.status === 'done').length / doneOrFailed
          : 0;

      // Average capability score
      const avgCapabilityScore =
        agent.capabilityScores.length > 0
          ? agent.capabilityScores.reduce((sum, cs) => sum + cs.score, 0) /
            agent.capabilityScores.length
          : 0;

      return {
        agentId: agent.id,
        agentName: agent.name,
        role: agent.role,
        tasksCompleted,
        totalCost,
        costPerTask,
        successRate,
        capabilityScore: Math.round(avgCapabilityScore),
        effectivenessRank: 0, // computed below
      };
    });

    // Sort by composite score: successRate * 40 + capabilityScore/100 * 30 + cost efficiency * 30
    entries.sort((a, b) => {
      const scoreA =
        a.successRate * 40 +
        (a.capabilityScore / 100) * 30 +
        (1 - Math.min(a.costPerTask / 10, 1)) * 30 +
        a.tasksCompleted * 0.5;
      const scoreB =
        b.successRate * 40 +
        (b.capabilityScore / 100) * 30 +
        (1 - Math.min(b.costPerTask / 10, 1)) * 30 +
        b.tasksCompleted * 0.5;
      return scoreB - scoreA;
    });

    entries.forEach((entry, index) => {
      entry.effectivenessRank = index + 1;
    });

    return entries;
  }

  // ─── Capability Gaps ──────────────────────────────────

  /**
   * Identify capability areas where the system is weak.
   * Looks at AgentCapabilityScore averages and flags low-scoring areas.
   */
  async getCapabilityGaps(): Promise<CapabilityGap[]> {
    const scores = await db.agentCapabilityScore.findMany({
      select: {
        capabilityKey: true,
        score: true,
        trend: true,
      },
    });

    // Group by capabilityKey
    const grouped = new Map<
      string,
      { scores: number[]; trends: Record<string, number> }
    >();

    for (const entry of scores) {
      const existing = grouped.get(entry.capabilityKey);
      if (existing) {
        existing.scores.push(entry.score);
        existing.trends[entry.trend] = (existing.trends[entry.trend] || 0) + 1;
      } else {
        grouped.set(entry.capabilityKey, {
          scores: [entry.score],
          trends: { [entry.trend]: 1 },
        });
      }
    }

    const results: CapabilityGap[] = [];

    for (const [capabilityKey, data] of grouped) {
      const averageScore =
        data.scores.reduce((a, b) => a + b, 0) / data.scores.length;

      // Determine dominant trend
      const trendEntries = Object.entries(data.trends);
      trendEntries.sort((a, b) => b[1] - a[1]);
      const dominantTrend = trendEntries[0]?.[0] ?? 'stable';

      // Determine gap severity
      let gap: CapabilityGap['gap'] = 'minor';
      if (averageScore < 30) gap = 'critical';
      else if (averageScore < 55) gap = 'moderate';

      results.push({
        capabilityKey,
        averageScore: Math.round(averageScore * 100) / 100,
        agentCount: data.scores.length,
        trend: dominantTrend,
        gap,
      });
    }

    // Sort by average score ascending (worst first)
    results.sort((a, b) => a.averageScore - b.averageScore);
    return results;
  }

  // ─── System Overview ──────────────────────────────────

  /**
   * Get system overview counts — total agents, skills, tools, packs, marketplace items
   */
  async getSystemOverview(): Promise<SystemOverview> {
    const [
      totalAgents,
      totalSkills,
      totalTools,
      totalSkillPacks,
      totalToolPacks,
      totalMarketplaceItems,
      totalWorkflows,
      totalCostLogs,
      totalEventLogs,
    ] = await Promise.all([
      db.agent.count(),
      db.skillDefinition.count(),
      db.tool.count(),
      db.skillPack.count(),
      db.toolPack.count(),
      db.marketplaceItem.count(),
      db.workflowTemplate.count(),
      db.costLog.count(),
      db.eventLog.count(),
    ]);

    return {
      totalAgents,
      totalSkills,
      totalTools,
      totalSkillPacks,
      totalToolPacks,
      totalMarketplaceItems,
      totalWorkflows,
      totalCostLogs,
      totalEventLogs,
    };
  }

  // ─── Trending Skills ──────────────────────────────────

  /**
   * Get skills with increasing usage over recent period.
   * Compares usage in the last 7 days vs the 7 days before that.
   */
  async getTrendingSkills(): Promise<TrendingItem[]> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [recentLogs, previousLogs] = await Promise.all([
      db.skillUsageLog.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { skillId: true, skill: { select: { key: true, name: true } } },
      }),
      db.skillUsageLog.findMany({
        where: {
          createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
        },
        select: { skillId: true, skill: { select: { key: true, name: true } } },
      }),
    ]);

    // Count recent
    const recentCounts = new Map<
      string,
      { key: string; name: string; count: number }
    >();
    for (const log of recentLogs) {
      const existing = recentCounts.get(log.skillId);
      if (existing) {
        existing.count++;
      } else {
        recentCounts.set(log.skillId, {
          key: log.skill.key,
          name: log.skill.name,
          count: 1,
        });
      }
    }

    // Count previous
    const previousCounts = new Map<string, number>();
    for (const log of previousLogs) {
      previousCounts.set(log.skillId, (previousCounts.get(log.skillId) || 0) + 1);
    }

    // Combine
    const allSkillIds = new Set([
      ...recentCounts.keys(),
      ...previousCounts.keys(),
    ]);

    const results: TrendingItem[] = [];

    for (const skillId of allSkillIds) {
      const recent = recentCounts.get(skillId);
      const previous = previousCounts.get(skillId) || 0;
      const recentCount = recent?.count || 0;
      const growthRate =
        previous > 0
          ? ((recentCount - previous) / previous) * 100
          : recentCount > 0
            ? 100
            : 0;

      let trend: TrendingItem['trend'] = 'stable';
      if (growthRate > 20) trend = 'rising';
      else if (growthRate < -20) trend = 'declining';

      results.push({
        id: skillId,
        key: recent?.key ?? '',
        name: recent?.name ?? '',
        recentUsage: recentCount,
        previousUsage: previous,
        growthRate: Math.round(growthRate * 100) / 100,
        trend,
      });
    }

    // Sort by growth rate descending
    results.sort((a, b) => b.growthRate - a.growthRate);
    return results;
  }

  // ─── Trending Tools ──────────────────────────────────

  /**
   * Get tools with increasing usage over recent period.
   * Compares usage in the last 7 days vs the 7 days before that.
   */
  async getTrendingTools(): Promise<TrendingItem[]> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [recentLogs, previousLogs] = await Promise.all([
      db.toolUsageLog.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { toolId: true, tool: { select: { key: true, name: true } } },
      }),
      db.toolUsageLog.findMany({
        where: {
          createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
        },
        select: { toolId: true, tool: { select: { key: true, name: true } } },
      }),
    ]);

    // Count recent
    const recentCounts = new Map<
      string,
      { key: string; name: string; count: number }
    >();
    for (const log of recentLogs) {
      const existing = recentCounts.get(log.toolId);
      if (existing) {
        existing.count++;
      } else {
        recentCounts.set(log.toolId, {
          key: log.tool.key,
          name: log.tool.name,
          count: 1,
        });
      }
    }

    // Count previous
    const previousCounts = new Map<string, number>();
    for (const log of previousLogs) {
      previousCounts.set(log.toolId, (previousCounts.get(log.toolId) || 0) + 1);
    }

    // Combine
    const allToolIds = new Set([
      ...recentCounts.keys(),
      ...previousCounts.keys(),
    ]);

    const results: TrendingItem[] = [];

    for (const toolId of allToolIds) {
      const recent = recentCounts.get(toolId);
      const previous = previousCounts.get(toolId) || 0;
      const recentCount = recent?.count || 0;
      const growthRate =
        previous > 0
          ? ((recentCount - previous) / previous) * 100
          : recentCount > 0
            ? 100
            : 0;

      let trend: TrendingItem['trend'] = 'stable';
      if (growthRate > 20) trend = 'rising';
      else if (growthRate < -20) trend = 'declining';

      results.push({
        id: toolId,
        key: recent?.key ?? '',
        name: recent?.name ?? '',
        recentUsage: recentCount,
        previousUsage: previous,
        growthRate: Math.round(growthRate * 100) / 100,
        trend,
      });
    }

    // Sort by growth rate descending
    results.sort((a, b) => b.growthRate - a.growthRate);
    return results;
  }

  // ─── Installation Trends ──────────────────────────────────

  /**
   * Get skill/tool install trends over the last 30 days, grouped by day.
   */
  async getInstallationTrends(days = 30): Promise<InstallationTrend[]> {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const [skillLogs, toolLogs] = await Promise.all([
      db.skillUsageLog.findMany({
        where: {
          action: 'install',
          createdAt: { gte: startDate },
        },
        select: { createdAt: true },
      }),
      db.toolUsageLog.findMany({
        where: {
          action: 'install',
          createdAt: { gte: startDate },
        },
        select: { createdAt: true },
      }),
    ]);

    // Group by date string (YYYY-MM-DD)
    const dateMap = new Map<string, { skillInstalls: number; toolInstalls: number }>();

    // Initialize all days in range
    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().slice(0, 10);
      dateMap.set(dateStr, { skillInstalls: 0, toolInstalls: 0 });
    }

    // Count skill installs per day
    for (const log of skillLogs) {
      const dateStr = log.createdAt.toISOString().slice(0, 10);
      const existing = dateMap.get(dateStr);
      if (existing) {
        existing.skillInstalls++;
      }
    }

    // Count tool installs per day
    for (const log of toolLogs) {
      const dateStr = log.createdAt.toISOString().slice(0, 10);
      const existing = dateMap.get(dateStr);
      if (existing) {
        existing.toolInstalls++;
      }
    }

    const results: InstallationTrend[] = [];
    for (const [date, data] of dateMap) {
      results.push({
        date,
        skillInstalls: data.skillInstalls,
        toolInstalls: data.toolInstalls,
        totalInstalls: data.skillInstalls + data.toolInstalls,
      });
    }

    return results;
  }

  // ─── Agent x Skill Matrix ──────────────────────────────────

  /**
   * Get agent x skill matrix with scores for a workspace.
   * Returns agents with their skill proficiency scores.
   */
  async getAgentSkillMatrix(workspaceId: string): Promise<AgentSkillMatrixEntry[]> {
    const agents = await db.agent.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        role: true,
        skillLinks: {
          select: {
            score: true,
            skill: {
              select: { key: true },
            },
          },
        },
      },
    });

    return agents.map((agent) => {
      const skills: Record<string, number> = {};
      for (const link of agent.skillLinks) {
        skills[link.skill.key] = link.score;
      }

      return {
        agentId: agent.id,
        agentName: agent.name,
        role: agent.role,
        skills,
      };
    });
  }
}

// Export singleton instance
export const analyticsService = AnalyticsService.getInstance();
