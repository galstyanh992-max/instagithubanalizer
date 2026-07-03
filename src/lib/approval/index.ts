// ─── Agent OS — Approval System ─────────────────────────────
// Human-in-the-loop approval workflow for risky operations.
// Stage 4 audit: Wired approval.approved → ToolExecution resume.

import { db } from '../db';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import type { ApprovalStatus, RiskLevel, ApprovalActionType } from '../types/domain';
import type { CreateApprovalInput } from '../types/domain';

class ApprovalSystem {
  private static instance: ApprovalSystem | null = null;

  private constructor() {}

  static getInstance(): ApprovalSystem {
    if (!ApprovalSystem.instance) {
      ApprovalSystem.instance = new ApprovalSystem();
    }
    return ApprovalSystem.instance;
  }

  /**
   * Create a new approval request
   */
  async requestApproval(input: CreateApprovalInput) {
    const request = await db.approvalRequest.create({
      data: {
        taskId: input.taskId ?? null,
        workspaceId: input.workspaceId ?? null,
        agentId: input.agentId,
        actionType: input.actionType,
        summary: input.summary,
        risk: input.risk ?? 'medium',
        payload: input.payload ? JSON.stringify(input.payload) : null,
        status: 'pending',
      },
    });

    await eventBus.emit(EventTypes.APPROVAL_REQUESTED, {
      approvalId: request.id,
      taskId: input.taskId ?? undefined,
      agentId: input.agentId,
      actionType: input.actionType,
      risk: (input.risk ?? 'medium') as RiskLevel,
      workspaceId: input.workspaceId,
      timestamp: Date.now(),
      source: 'approval-system',
    });

    return {
      ...request,
      payload: request.payload ? JSON.parse(request.payload) : null,
    };
  }

  /**
   * Approve a request
   */
  async approve(approvalId: string) {
    const request = await db.approvalRequest.findUnique({ where: { id: approvalId } });
    if (!request) throw new Error(`Approval request not found: ${approvalId}`);
    if (request.status !== 'pending') throw new Error(`Request is not pending: ${request.status}`);

    const updated = await db.approvalRequest.update({
      where: { id: approvalId },
      data: { status: 'approved' },
    });

    await eventBus.emit(EventTypes.APPROVAL_APPROVED, {
      approvalId,
      taskId: request.taskId ?? undefined,
      workspaceId: request.workspaceId ?? undefined,
      timestamp: Date.now(),
      source: 'approval-system',
    });

    return {
      ...updated,
      payload: updated.payload ? JSON.parse(updated.payload) : null,
    };
  }

  /**
   * Reject a request
   */
  async reject(approvalId: string) {
    const request = await db.approvalRequest.findUnique({ where: { id: approvalId } });
    if (!request) throw new Error(`Approval request not found: ${approvalId}`);
    if (request.status !== 'pending') throw new Error(`Request is not pending: ${request.status}`);

    const updated = await db.approvalRequest.update({
      where: { id: approvalId },
      data: { status: 'rejected' },
    });

    await eventBus.emit(EventTypes.APPROVAL_REJECTED, {
      approvalId,
      taskId: request.taskId ?? undefined,
      workspaceId: request.workspaceId ?? undefined,
      timestamp: Date.now(),
      source: 'approval-system',
    });

    return {
      ...updated,
      payload: updated.payload ? JSON.parse(updated.payload) : null,
    };
  }

  /**
   * Get pending approvals
   */
  async getPending(workspaceId?: string, limit = 50) {
    const where: Record<string, unknown> = { status: 'pending' };

    if (workspaceId) {
      // Filter by either direct workspaceId or via agent's workspace
      const agents = await db.agent.findMany({
        where: { workspaceId },
        select: { id: true },
      });
      const agentIds = agents.map((a) => a.id);
      where.OR = [
        { workspaceId },
        { agentId: { in: agentIds } },
      ];
    }

    const requests = await db.approvalRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return requests.map((r) => ({
      ...r,
      payload: r.payload ? JSON.parse(r.payload) : null,
    }));
  }

  /**
   * Get a single approval request
   */
  async get(approvalId: string) {
    const request = await db.approvalRequest.findUnique({ where: { id: approvalId } });
    if (!request) return null;

    return {
      ...request,
      payload: request.payload ? JSON.parse(request.payload) : null,
    };
  }

  /**
   * Get approvals by task
   */
  async getByTask(taskId: string) {
    const requests = await db.approvalRequest.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    }); // Note: taskId can be null for task-independent approvals

    return requests.map((r) => ({
      ...r,
      payload: r.payload ? JSON.parse(r.payload) : null,
    }));
  }

  /**
   * Find any ToolExecution linked to this approval request.
   * Returns the execution ID if found, or null.
   */
  async getLinkedToolExecutionId(approvalId: string): Promise<string | null> {
    const execution = await db.toolExecution.findFirst({
      where: { approvalRequestId: approvalId },
      select: { id: true },
    });
    return execution?.id ?? null;
  }
}

export const approvalSystem = ApprovalSystem.getInstance();
