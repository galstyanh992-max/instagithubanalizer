// ─── Agent OS — QualityGateService ───────────────────────────
// Validates agent results against TaskContract expectations.
// Enforces risk policy and triggers human escalation when needed.

import { db } from '../db';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import type { TaskContract, QualityGateResult, QualityStatus } from './TaskContract';
import { loggers } from '@/lib/logger';

// ─── Prohibited patterns (content safety) ────────────────────

const PROHIBITED_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /sk-[a-zA-Z0-9]{20,}/g, reason: 'OpenAI API key detected in output' },
  { pattern: /sk-or-[a-zA-Z0-9_-]{20,}/g, reason: 'OpenRouter API key detected in output' },
  { pattern: /ghp_[a-zA-Z0-9]{36}/g, reason: 'GitHub PAT detected in output' },
  { pattern: /password\s*[:=]\s*["']?[^\s"']{4,}/gi, reason: 'Password value detected in output' },
  { pattern: /DATABASE_URL\s*=\s*\S+/g, reason: 'Database connection string in output' },
  { pattern: /-----BEGIN\s+(RSA|EC|PRIVATE)\s+KEY-----/g, reason: 'Private key detected in output' },
];

// ─── Risk keyword escalation triggers ────────────────────────

const HIGH_RISK_PHRASES = [
  'drop table', 'truncate table', 'delete from',
  'rm -rf', 'format c:', 'mkfs',
  'push to production', 'deploy to prod',
  'transfer funds', 'send payment',
  'override approval', 'bypass review',
  'execute as root', 'sudo rm',
];

// ─── Quality Gate Service ─────────────────────────────────────

class QualityGateService {
  private static instance: QualityGateService | null = null;

  private constructor() {}

  static getInstance(): QualityGateService {
    if (!QualityGateService.instance) {
      QualityGateService.instance = new QualityGateService();
    }
    return QualityGateService.instance;
  }

  /**
   * Primary entrypoint: validate an agent's result against its contract.
   * Emits events and creates ApprovalRequests as needed.
   */
  async check(
    contract: TaskContract,
    agentResult: unknown,
    agentId: string
  ): Promise<QualityGateResult> {
    const issues: string[] = [];
    let score = 1.0;
    let riskTriggered = false;
    let approvalRequestId: string | undefined;

    // ── 1. Secret / credential leak check ─────────────────────
    const resultText = this.stringify(agentResult);
    for (const { pattern, reason } of PROHIBITED_PATTERNS) {
      if (pattern.test(resultText)) {
        pattern.lastIndex = 0;
        issues.push(`🔐 SECURITY: ${reason}`);
        riskTriggered = true;
        score = 0;
      }
      pattern.lastIndex = 0;
    }

    // ── 2. High-risk phrase detection ──────────────────────────
    const lowerResult = resultText.toLowerCase();
    for (const phrase of HIGH_RISK_PHRASES) {
      if (lowerResult.includes(phrase)) {
        issues.push(`⚠️ HIGH-RISK PHRASE: "${phrase}" found in output`);
        riskTriggered = true;
        score = Math.min(score, 0.3);
      }
    }

    // ── 3. Contract constraint check ──────────────────────────
    for (const constraint of contract.constraints) {
      if (constraint.toLowerCase().includes('no api calls') && lowerResult.includes('http://')) {
        issues.push(`Constraint violated: "${constraint}"`);
        score = Math.min(score, 0.5);
      }
      if (constraint.toLowerCase().includes('no secrets') && riskTriggered) {
        issues.push(`Constraint violated: "${constraint}"`);
      }
    }

    // ── 4. Expected output structure check ────────────────────
    if (Object.keys(contract.expectedOutput).length > 0 && typeof agentResult === 'object' && agentResult !== null) {
      const result = agentResult as Record<string, unknown>;
      const missingKeys = Object.keys(contract.expectedOutput).filter(k => !(k in result));
      if (missingKeys.length > 0) {
        issues.push(`Missing expected fields: ${missingKeys.join(', ')}`);
        score = Math.min(score, 0.6);
      }
    } else if (agentResult === null || agentResult === undefined || agentResult === '') {
      issues.push('Agent returned empty result');
      score = Math.min(score, 0.2);
    }

    // ── 5. Success criteria scoring ───────────────────────────
    if (contract.successCriteria.length > 0) {
      let metCount = 0;
      for (const criterion of contract.successCriteria) {
        const met = this.checkCriterion(criterion, agentResult, resultText);
        if (met) metCount++;
        else issues.push(`Unmet criterion: "${criterion}"`);
      }
      const criteriaScore = metCount / contract.successCriteria.length;
      score = Math.min(score, criteriaScore);
    }

    // ── 6. Risk level override ────────────────────────────────
    if (contract.riskLevel === 'critical') {
      riskTriggered = true;
      score = Math.min(score, 0.5);
      issues.push('Contract risk level is CRITICAL — automatic human review required');
    } else if (contract.riskLevel === 'high') {
      riskTriggered = true;
      score = Math.min(score, 0.7);
      issues.push('Contract risk level is HIGH — requires review');
    }

    // ── 7. Determine final status ────────────────────────────
    let status: QualityStatus;
    if (riskTriggered || contract.riskLevel === 'critical' || contract.riskLevel === 'high') {
      status = 'blocked';
    } else if (score >= 0.8 && issues.length === 0) {
      status = 'passed';
    } else if (score >= 0.5 || contract.riskLevel === 'medium') {
      status = 'needs_review';
    } else {
      status = 'blocked';
    }

    // ── 8. Escalation for blocked/approval-required ───────────
    if (status === 'blocked' || contract.approvalRequired) {
      try {
        approvalRequestId = await this.createEscalation(contract, agentId, issues, score);
        status = 'escalated';
      } catch (err) {
        loggers.orchestrator.error({ err: err }, '[QualityGate] Failed to create escalation:');
      }
    }

    const result: QualityGateResult = {
      contractId: contract.id,
      status,
      score: Math.max(0, Math.min(1, score)),
      issues,
      riskTriggered,
      approvalRequestId,
      checkedAt: new Date().toISOString(),
    };

    // ── 9. Emit events ────────────────────────────────────────
    await this.emitQualityEvents(contract, result, agentId);

    return result;
  }

  // ── Private helpers ───────────────────────────────────────

  private checkCriterion(criterion: string, result: unknown, resultText: string): boolean {
    const c = criterion.toLowerCase();

    // "non-empty result"
    if (c.includes('non-empty') || c.includes('not empty')) {
      return resultText.length > 10;
    }
    // "no error"
    if (c.includes('no error') || c.includes('without error')) {
      return !resultText.toLowerCase().includes('error:') && !resultText.toLowerCase().includes('failed');
    }
    // "contains X"
    const containsMatch = c.match(/contains?\s+(.+)/);
    if (containsMatch) {
      return resultText.toLowerCase().includes(containsMatch[1].trim());
    }
    // Field existence: "response.X exists"
    const fieldMatch = c.match(/(\w+)\s+(?:field\s+)?exists?/);
    if (fieldMatch && typeof result === 'object' && result !== null) {
      return fieldMatch[1] in (result as Record<string, unknown>);
    }
    // Default: treat as passed if result is non-empty
    return resultText.length > 5;
  }

  private stringify(value: unknown): string {
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value, null, 0); }
    catch { return String(value); }
  }

  private async createEscalation(
    contract: TaskContract,
    agentId: string,
    issues: string[],
    score: number
  ): Promise<string> {
    // Find the agent to attribute the approval request to
    const agent = await db.agent.findFirst({
      where: { id: agentId },
    });

    const actualAgentId = agent?.id ?? agentId;
    const workspace = await db.workspace.findFirst({
      where: { id: contract.workspaceId },
    });
    if (!workspace) throw new Error('Workspace not found for escalation');

    const summaryLines = [
      `Goal: ${contract.goal}`,
      `Risk: ${contract.riskLevel}`,
      `Quality score: ${(score * 100).toFixed(0)}%`,
      issues.length > 0 ? `Issues: ${issues.slice(0, 3).join('; ')}` : 'Manual review required by contract',
    ];

    const approvalRequest = await db.approvalRequest.create({
      data: {
        agentId: actualAgentId,
        workspaceId: workspace.id,
        actionType: 'quality_review',
        summary: summaryLines.join(' | '),
        risk: contract.riskLevel,
        payload: JSON.stringify({
          contractId: contract.id,
          contractGoal: contract.goal,
          assignedAgentRole: contract.assignedAgentRole,
          qualityScore: score,
          issues,
          riskLevel: contract.riskLevel,
          routingConfidence: contract.routingConfidence,
        }),
        status: 'pending',
      },
    });

    return approvalRequest.id;
  }

  private async emitQualityEvents(
    contract: TaskContract,
    result: QualityGateResult,
    agentId: string
  ): Promise<void> {
    const base = {
      workspaceId: contract.workspaceId,
      timestamp: Date.now(),
      source: 'quality-gate',
    };

    try {
      await eventBus.emit(EventTypes.TASK_QUALITY_CHECKED, {
        ...base,
        contractId: contract.id,
        agentId,
        score: result.score,
        status: result.status,
        issues: result.issues,
        riskTriggered: result.riskTriggered,
      });

      if (result.status === 'escalated' || result.status === 'blocked') {
        await eventBus.emit(EventTypes.TASK_ESCALATED, {
          ...base,
          contractId: contract.id,
          agentId,
          approvalRequestId: result.approvalRequestId,
          reason: result.issues.join('; ') || `Risk level: ${contract.riskLevel}`,
        });
      }
    } catch (err) {
      loggers.orchestrator.error({ err: err }, '[QualityGate] Event emission failed:');
    }
  }
}

export const qualityGateService = QualityGateService.getInstance();
