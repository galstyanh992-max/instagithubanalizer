// ─── Agent OS — Approval Engine ──────────────────────────────
// Determines if a task requires human approval based on risk patterns.

import { db } from '../db';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import type { ApprovalAssessment } from './types';
import type { RiskLevel } from '../types/domain';

// ─── Risk keyword definitions ────────────────────────────────

interface RiskKeywordGroup {
  keywords: string[];
  riskLevel: RiskLevel;
  actionType: string;
  description: string;
}

const RISK_KEYWORD_GROUPS: RiskKeywordGroup[] = [
  {
    keywords: ['delete', 'remove', 'drop', 'truncate', 'erase', 'wipe'],
    riskLevel: 'critical',
    actionType: 'delete',
    description: 'Destructive action — data may be permanently lost',
  },
  {
    keywords: ['drop database', 'drop table', 'drop schema', 'reset database', 'clear all'],
    riskLevel: 'critical',
    actionType: 'delete',
    description: 'Critical database operation — irreversible data loss',
  },
  {
    keywords: ['migration', 'migrate', 'schema change', 'alter table', 'rename column'],
    riskLevel: 'high',
    actionType: 'modify',
    description: 'Database migration — may affect existing data and require downtime',
  },
  {
    keywords: ['deploy', 'release', 'ship', 'go live', 'launch', 'push to production'],
    riskLevel: 'high',
    actionType: 'deploy',
    description: 'Deployment action — changes will be live for users',
  },
  {
    keywords: ['production', 'prod', 'live environment'],
    riskLevel: 'high',
    actionType: 'deploy',
    description: 'Affects production environment',
  },
  {
    keywords: ['secret', 'api key', 'password', 'credential', 'token', 'private key'],
    riskLevel: 'critical',
    actionType: 'access',
    description: 'Involves sensitive credentials or secrets',
  },
  {
    keywords: ['payment', 'billing', 'charge', 'invoice', 'subscription', 'stripe'],
    riskLevel: 'critical',
    actionType: 'spend',
    description: 'Involves financial transactions or billing',
  },
  {
    keywords: ['publish', 'make public', 'expose', 'share publicly'],
    riskLevel: 'medium',
    actionType: 'deploy',
    description: 'Making something publicly accessible',
  },
  {
    keywords: ['overwrite', 'replace', 'supersede'],
    riskLevel: 'high',
    actionType: 'modify',
    description: 'Overwriting existing data or configuration',
  },
  {
    keywords: ['mass refactor', 'rename all', 'restructure', 'rewrite', 'overhaul'],
    riskLevel: 'high',
    actionType: 'modify',
    description: 'Large-scale code changes that may introduce regressions',
  },
];

class ApprovalEngine {
  private static instance: ApprovalEngine | null = null;

  private constructor() {}

  static getInstance(): ApprovalEngine {
    if (!ApprovalEngine.instance) {
      ApprovalEngine.instance = new ApprovalEngine();
    }
    return ApprovalEngine.instance;
  }

  /**
   * Assess whether a task requires approval
   */
  assess(taskTitle: string, taskDescription: string): ApprovalAssessment {
    const text = `${taskTitle} ${taskDescription}`.toLowerCase();

    let highestRisk: RiskLevel = 'low';
    let bestActionType = 'execute';
    let bestSummary = '';
    const matchedKeywords: string[] = [];

    for (const group of RISK_KEYWORD_GROUPS) {
      const groupMatches = group.keywords.filter((kw) =>
        text.includes(kw.toLowerCase())
      );

      if (groupMatches.length > 0) {
        matchedKeywords.push(...groupMatches);

        // Upgrade risk level if this group is more severe
        if (this.compareRiskLevels(group.riskLevel, highestRisk) > 0) {
          highestRisk = group.riskLevel;
          bestActionType = group.actionType;
          bestSummary = group.description;
        }
      }
    }

    const requiresApproval = matchedKeywords.length > 0;

    return {
      requiresApproval,
      riskLevel: highestRisk,
      actionType: bestActionType,
      summary: requiresApproval
        ? bestSummary
        : 'No approval required — standard task',
      matchedKeywords: [...new Set(matchedKeywords)], // deduplicate
    };
  }

  /**
   * Create an approval request in the database and emit event
   */
  async createApprovalRequest(params: {
    taskId: string;
    agentId: string;
    actionType: string;
    summary: string;
    risk: RiskLevel;
    payload?: Record<string, unknown>;
    workspaceId?: string;
  }) {
    const request = await db.approvalRequest.create({
      data: {
        taskId: params.taskId,
        workspaceId: params.workspaceId ?? null,
        agentId: params.agentId,
        actionType: params.actionType,
        summary: params.summary,
        risk: params.risk,
        payload: params.payload ? JSON.stringify(params.payload) : null,
        status: 'pending',
      },
    });

    await eventBus.emit(EventTypes.APPROVAL_REQUESTED, {
      approvalId: request.id,
      taskId: params.taskId,
      agentId: params.agentId,
      actionType: params.actionType,
      risk: params.risk,
      workspaceId: params.workspaceId ?? undefined,
      timestamp: Date.now(),
      source: 'approval-engine',
    });

    return {
      id: request.id,
      taskId: request.taskId,
      actionType: request.actionType,
      summary: request.summary,
      risk: request.risk as RiskLevel,
      status: request.status,
    };
  }

  /**
   * Compare two risk levels — returns positive if a > b
   */
  private compareRiskLevels(a: RiskLevel, b: RiskLevel): number {
    const order: Record<RiskLevel, number> = {
      low: 0,
      medium: 1,
      high: 2,
      critical: 3,
    };
    return (order[a] ?? 0) - (order[b] ?? 0);
  }
}

export const approvalEngine = ApprovalEngine.getInstance();
