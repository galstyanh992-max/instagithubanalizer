// ─── Agent OS — Tool Execution Service ───────────────────────
// Handles tool execution: logging, approval, status tracking.

import { db } from '../db';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import type { RiskLevel } from '../types/domain';

/**
 * Helper: parse metadata JSON from a ToolExecution record and extract toolKey
 */
function extractToolKey(metadata: string | null): string {
  if (!metadata) return '';
  try {
    const parsed = JSON.parse(metadata);
    return (parsed && typeof parsed === 'object' && 'toolKey' in parsed) ? String(parsed.toolKey) : '';
  } catch {
    return '';
  }
}

class ToolExecutionService {
  private static instance: ToolExecutionService | null = null;

  private constructor() {}

  static getInstance(): ToolExecutionService {
    if (!ToolExecutionService.instance) {
      ToolExecutionService.instance = new ToolExecutionService();
    }
    return ToolExecutionService.instance;
  }

  /**
   * Create a new ToolExecution record and emit event
   */
  async createExecution(params: {
    workspaceId: string;
    agentId?: string;
    taskId?: string;
    toolId: string;
    toolKey: string;
    action: string;
    inputSummary?: string;
    inputFull?: string;       // полный JSON input — без обрезки, используется при resume
    riskLevel?: string;
    correlationId?: string;
    metadata?: Record<string, unknown>;
  }) {
    // Merge toolKey into metadata so it can be recovered later
    const mergedMetadata = { ...params.metadata, toolKey: params.toolKey };

    const execution = await db.toolExecution.create({
      data: {
        workspaceId: params.workspaceId,
        agentId: params.agentId ?? null,
        taskId: params.taskId ?? null,
        toolId: params.toolId,
        action: params.action,
        correlationId: params.correlationId ?? null,
        inputSummary: params.inputSummary ?? null,
        inputFull: params.inputFull ?? null,
        status: 'pending',
        riskLevel: params.riskLevel ?? 'low',
        metadata: JSON.stringify(mergedMetadata),
      },
    });

    await eventBus.emit(EventTypes.TOOL_EXECUTION_REQUESTED, {
      executionId: execution.id,
      toolId: params.toolId,
      toolKey: params.toolKey,
      agentId: params.agentId,
      action: params.action,
      workspaceId: params.workspaceId,
      correlationId: params.correlationId,
      timestamp: Date.now(),
      source: 'tool-execution-service',
    });

    return execution;
  }

  /**
   * Update execution status to running
   */
  async markRunning(executionId: string) {
    const execution = await db.toolExecution.update({
      where: { id: executionId },
      data: { status: 'running' },
    });

    const toolKey = extractToolKey(execution.metadata);

    await eventBus.emit(EventTypes.TOOL_EXECUTION_STARTED, {
      executionId,
      toolId: execution.toolId,
      toolKey,
      agentId: execution.agentId ?? undefined,
      correlationId: execution.correlationId ?? undefined,
      timestamp: Date.now(),
      source: 'tool-execution-service',
    });

    return execution;
  }

  /**
   * Mark execution as successful with output summary
   */
  async markSuccess(executionId: string, outputSummary?: string) {
    const execution = await db.toolExecution.update({
      where: { id: executionId },
      data: {
        status: 'success',
        outputSummary: outputSummary ?? null,
        completedAt: new Date(),
      },
    });

    const toolKey = extractToolKey(execution.metadata);

    await eventBus.emit(EventTypes.TOOL_EXECUTION_SUCCEEDED, {
      executionId,
      toolId: execution.toolId,
      toolKey,
      agentId: execution.agentId ?? undefined,
      correlationId: execution.correlationId ?? undefined,
      timestamp: Date.now(),
      source: 'tool-execution-service',
    });

    return execution;
  }

  /**
   * Mark execution as failed with error message
   */
  async markFailed(executionId: string, errorMessage: string) {
    const execution = await db.toolExecution.update({
      where: { id: executionId },
      data: {
        status: 'failed',
        errorMessage,
        completedAt: new Date(),
      },
    });

    const toolKey = extractToolKey(execution.metadata);

    await eventBus.emit(EventTypes.TOOL_EXECUTION_FAILED, {
      executionId,
      toolId: execution.toolId,
      toolKey,
      agentId: execution.agentId ?? undefined,
      error: errorMessage,
      correlationId: execution.correlationId ?? undefined,
      timestamp: Date.now(),
      source: 'tool-execution-service',
    });

    return execution;
  }

  /**
   * Mark execution as blocked (insufficient permissions)
   */
  async markBlocked(executionId: string, reason: string) {
    const execution = await db.toolExecution.update({
      where: { id: executionId },
      data: {
        status: 'blocked',
        errorMessage: reason,
        completedAt: new Date(),
      },
    });

    const toolKey = extractToolKey(execution.metadata);

    await eventBus.emit(EventTypes.TOOL_EXECUTION_BLOCKED, {
      executionId,
      toolId: execution.toolId,
      toolKey,
      agentId: execution.agentId ?? undefined,
      reason,
      correlationId: execution.correlationId ?? undefined,
      timestamp: Date.now(),
      source: 'tool-execution-service',
    });

    return execution;
  }

  /**
   * Mark execution as requires_approval and link approval request
   */
  async markRequiresApproval(executionId: string, approvalRequestId: string) {
    const execution = await db.toolExecution.update({
      where: { id: executionId },
      data: {
        status: 'requires_approval',
        approvalRequestId,
        completedAt: new Date(),
      },
    });

    const toolKey = extractToolKey(execution.metadata);

    await eventBus.emit(EventTypes.TOOL_APPROVAL_REQUIRED, {
      executionId,
      toolId: execution.toolId,
      toolKey,
      agentId: execution.agentId ?? undefined,
      approvalRequestId,
      correlationId: execution.correlationId ?? undefined,
      timestamp: Date.now(),
      source: 'tool-execution-service',
    });

    return execution;
  }

  /**
   * Get a single execution by ID
   */
  async getExecution(executionId: string) {
    return db.toolExecution.findUnique({
      where: { id: executionId },
      include: { tool: true },
    });
  }

  /**
   * Get executions with filters
   */
  async getExecutions(params: {
    workspaceId: string;
    agentId?: string;
    toolId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = {
      workspaceId: params.workspaceId,
    };
    if (params.agentId) where.agentId = params.agentId;
    if (params.toolId) where.toolId = params.toolId;
    if (params.status) where.status = params.status;

    return db.toolExecution.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 50,
      skip: params.offset ?? 0,
      include: { tool: true },
    });
  }

  /**
   * Create an approval request for a tool execution.
   *
   * IMPORTANT: No synthetic Project/Epic/Task records are created.
   * ApprovalRequest.taskId is optional — when null, the approval is
   * linked to the workspace directly via workspaceId and to the
   * ToolExecution via ToolExecution.approvalRequestId.
   *
   * Correlation chain: ToolExecution ↔ ApprovalRequest ↔ EventLog
   */
  async createToolApproval(params: {
    workspaceId: string;
    agentId: string;
    taskId?: string;
    toolId: string;
    toolKey: string;
    action: string;
    risk: RiskLevel;
    inputSummary?: string;
    correlationId?: string;
  }) {
    const approvalRequest = await db.approvalRequest.create({
      data: {
        taskId: params.taskId ?? null,
        workspaceId: params.workspaceId,
        agentId: params.agentId,
        actionType: 'execute',
        summary: `Tool execution approval: ${params.toolKey} (${params.action}) by agent ${params.agentId}`,
        risk: params.risk,
        payload: JSON.stringify({
          toolId: params.toolId,
          toolKey: params.toolKey,
          action: params.action,
          inputSummary: params.inputSummary,
          correlationId: params.correlationId,
        }),
        status: 'pending',
      },
    });

    await eventBus.emit(EventTypes.APPROVAL_REQUESTED, {
      approvalId: approvalRequest.id,
      taskId: params.taskId,
      agentId: params.agentId,
      actionType: 'execute',
      risk: params.risk,
      correlationId: params.correlationId,
      workspaceId: params.workspaceId,
      timestamp: Date.now(),
      source: 'tool-execution-service',
    });

    return approvalRequest;
  }

  /**
   * Resume an execution that was waiting for approval.
   * Verifies approval was granted, resets status to pending, returns toolKey.
   */
  async resumeApprovedExecution(executionId: string): Promise<{ execution: Awaited<ReturnType<typeof db.toolExecution.findUnique>>; toolKey: string }> {
    // Find the execution
    const execution = await db.toolExecution.findUnique({
      where: { id: executionId },
      include: { approvalRequest: true },
    });

    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    if (execution.status !== 'requires_approval') {
      throw new Error(`Execution is not in requires_approval status (current: ${execution.status})`);
    }

    // Verify linked approval request exists and is approved
    if (!execution.approvalRequest) {
      throw new Error(`No approval request linked to execution ${executionId}`);
    }

    if (execution.approvalRequest.status !== 'approved') {
      throw new Error(`Approval request is not approved (current: ${execution.approvalRequest.status})`);
    }

    // Update execution status back to pending and clear completedAt
    const updatedExecution = await db.toolExecution.update({
      where: { id: executionId },
      data: {
        status: 'pending',
        completedAt: null,
      },
    });

    const toolKey = extractToolKey(execution.metadata);

    // Emit tool.execution_resumed event
    await eventBus.emit(EventTypes.TOOL_EXECUTION_RESUMED, {
      executionId,
      toolId: execution.toolId,
      toolKey,
      agentId: execution.agentId ?? undefined,
      approvalRequestId: execution.approvalRequestId ?? '',
      correlationId: execution.correlationId ?? undefined,
      timestamp: Date.now(),
      source: 'tool-execution-service',
    });

    return { execution: updatedExecution, toolKey };
  }

  /**
   * Get executions that are eligible for cleanup (old completed/failed/blocked).
   * Never returns pending, running, or requires_approval executions.
   */
  async getExecutionsNeedingCleanup(params: {
    workspaceId?: string;
    olderThanDays?: number;
    limit?: number;
  }): Promise<Array<{ id: string; status: string; createdAt: Date; workspaceId: string }>> {
    const olderThanDays = params.olderThanDays ?? 30;
    const limit = params.limit ?? 1000;
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const where: Record<string, unknown> = {
      status: { in: ['success', 'failed', 'blocked'] },
      completedAt: { lt: cutoffDate },
    };
    if (params.workspaceId) where.workspaceId = params.workspaceId;

    return db.toolExecution.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { id: true, status: true, createdAt: true, workspaceId: true },
    });
  }

  /**
   * Clean up old ToolExecution records.
   * Only deletes completed/failed/blocked executions older than N days.
   * Never deletes pending, running, or requires_approval executions.
   */
  async cleanupOldExecutions(params: {
    workspaceId?: string;
    olderThanDays?: number;
    status?: string;
    limit?: number;
  }): Promise<{ deleted: number }> {
    const olderThanDays = params.olderThanDays ?? 30;
    const limit = params.limit ?? 1000;
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    // Build the list of statuses eligible for cleanup
    const eligibleStatuses: string[] = params.status
      ? [params.status]
      : ['success', 'failed', 'blocked'];

    // Safety: never delete active executions
    const safeStatuses = eligibleStatuses.filter(
      (s) => !['pending', 'running', 'requires_approval'].includes(s)
    );

    if (safeStatuses.length === 0) {
      return { deleted: 0 };
    }

    const where: Record<string, unknown> = {
      status: { in: safeStatuses },
      completedAt: { lt: cutoffDate },
    };
    if (params.workspaceId) where.workspaceId = params.workspaceId;

    // Find IDs to delete (with limit)
    const executions = await db.toolExecution.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { id: true },
    });

    if (executions.length === 0) {
      return { deleted: 0 };
    }

    const idsToDelete = executions.map((e) => e.id);
    const result = await db.toolExecution.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    return { deleted: result.count };
  }
}

export const toolExecutionService = ToolExecutionService.getInstance();
