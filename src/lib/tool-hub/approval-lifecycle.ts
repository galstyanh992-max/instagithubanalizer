// ─── Agent OS — Approval Lifecycle Wiring ──────────────────────
// When an approval is approved, automatically find and resume
// the linked ToolExecution (if any).
//
// Flow: approval.approved → find ToolExecution → resumeApprovedExecution → re-execute tool
//
// NOTE: This is intentionally a fire-and-forget listener.
// The actual resume + re-execution is also available via the
// POST /api/tools/executions/[executionId]/resume endpoint for manual use.

import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import { approvalSystem } from '../approval';
import { toolExecutionService } from './ToolExecutionService';
import { toolHub } from './ToolHub';
import { loggers } from '@/lib/logger';

let initialized = false;

/**
 * Initialize the approval → tool execution lifecycle.
 * Subscribes to approval.approved events and automatically
 * resumes any linked ToolExecution.
 *
 * Safe to call multiple times — only initializes once.
 */
export function initApprovalLifecycle(): void {
  if (initialized) return;
  initialized = true;

  eventBus.on(EventTypes.APPROVAL_APPROVED, async (payload) => {
    try {
      // Find any ToolExecution linked to this approval
      const executionId = await approvalSystem.getLinkedToolExecutionId(payload.approvalId);

      if (!executionId) {
        // Not a tool-related approval — ignore
        return;
      }

      // Resume the execution (validates approval status, resets to pending)
      const { execution, toolKey } = await toolExecutionService.resumeApprovedExecution(executionId);

      if (!execution) {
        loggers.toolHub.error(`[ApprovalLifecycle] Execution ${executionId} not found after resume`);
        return;
      }

      // Re-execute the tool with resumedFromApproval flag
      // Note: This runs in background — errors are logged but don't throw
      // inputSummary may be truncated, so parse safely
      let parsedInput: unknown = {};
      if (execution.inputSummary) {
        try {
          parsedInput = JSON.parse(execution.inputSummary);
        } catch {
          parsedInput = { truncated: execution.inputSummary };
        }
      }

      const result = await toolHub.executeTool({
        workspaceId: execution.workspaceId,
        agentId: execution.agentId ?? '',
        taskId: execution.taskId ?? undefined,
        toolKey,
        action: execution.action,
        input: parsedInput,
        correlationId: execution.correlationId ?? undefined,
        resumedFromApproval: true,
      });

      loggers.toolHub.info(
        `[ApprovalLifecycle] Execution ${executionId} resumed after approval ${payload.approvalId}: ${result.status}`
      );
    } catch (error) {
      loggers.toolHub.error({ err: error }, `[ApprovalLifecycle] Failed to resume execution for approval ${payload.approvalId}:`);
    }
  });

  loggers.toolHub.info('[ApprovalLifecycle] Initialized — approval.approved → ToolExecution resume wired');
}
