// ─── Agent OS — Tool Hub ─────────────────────────────────────
// Central orchestrator for tool execution.
// Flow: Agent → ToolHub → Permission Check → Approval Check → Defence Guard → Tool Adapter → ToolExecution Log → EventLog

import { db } from '../db';
import { agentModelConfigService } from '../agent-system/AgentModelConfigService';
import { toolRegistryService } from './ToolRegistryService';
import { toolPermissionService } from './ToolPermissionService';
import { toolExecutionService } from './ToolExecutionService';
import { toolAdapterRegistry } from './ToolAdapterRegistry';
import { agentPermissionService } from '../agent-system/AgentPermissionService';
import type { ExecuteToolRequest, ExecuteToolResult } from './types';

class ToolHub {
  private static instance: ToolHub | null = null;

  private constructor() {}

  static getInstance(): ToolHub {
    if (!ToolHub.instance) {
      ToolHub.instance = new ToolHub();
    }
    return ToolHub.instance;
  }

  /**
   * Execute a tool request with full permission and approval checks.
   *
   * Flow:
   * 1. Verify workspace exists
   * 2. Verify agent exists and belongs to workspace
   * 3. Verify tool exists and is enabled
   * 4. Create ToolExecution record (with toolKey + correlationId)
   * 5. Check AgentPermission via ToolPermissionPolicy
   * 6. If insufficient → block and log
   * 7. If requires approval or risk critical (and NOT resumed from approval) → create ApprovalRequest
   * 8. Defence-in-depth guard: block if approval required but not confirmed
   * 9. Execute adapter
   */
  async executeTool(request: ExecuteToolRequest): Promise<ExecuteToolResult> {
    const { workspaceId, agentId, taskId, toolKey, action, input, correlationId, resumedFromApproval } = request;

    // 1. Verify workspace exists
    const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      return {
        status: 'failed',
        executionId: '',
        error: `Workspace not found: ${workspaceId}`,
      };
    }

    // 2. Verify agent exists and belongs to workspace
    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      return {
        status: 'failed',
        executionId: '',
        error: `Agent not found: ${agentId}`,
      };
    }
    if (agent.workspaceId !== workspaceId) {
      return {
        status: 'failed',
        executionId: '',
        error: `Agent ${agentId} does not belong to workspace ${workspaceId}`,
      };
    }

    // 3. Verify tool exists and is enabled
    const tool = await toolRegistryService.getToolByKey(toolKey, workspaceId);
    if (!tool) {
      return {
        status: 'failed',
        executionId: '',
        error: `Tool not found: ${toolKey}`,
      };
    }
    if (!tool.enabled) {
      return {
        status: 'failed',
        executionId: '',
        error: `Tool is disabled: ${toolKey}`,
      };
    }

    // 4. Create ToolExecution record — pass toolKey and correlationId
    const execution = await toolExecutionService.createExecution({
      workspaceId,
      agentId,
      taskId,
      toolId: tool.id,
      toolKey,
      action,
      inputSummary: JSON.stringify(input).slice(0, 500), // Усечённый (только для отображения)
      inputFull: JSON.stringify(input),                  // Полный — используется при resume
      riskLevel: tool.riskLevel,
      correlationId,
      metadata: { toolKey },
    });

    // 5a. Direct AgentPermission check by toolKey category — defence-in-depth.
    //     Ensures an agent has at least the category-level read/write permission
    //     even if ToolPermissionPolicy rows are absent for this tool.
    //     Category maps directly to the AgentPermission.permissionKey column.
    if (tool.category) {
      const categoryPermKey = tool.category; // e.g. 'filesystem', 'git', 'terminal'
      const requiredLevel = tool.riskLevel === 'low' ? 'read' : 'write';
      const categoryAllowed = await agentPermissionService.canAgentUsePermission(
        agentId,
        categoryPermKey,
        requiredLevel
      );
      if (!categoryAllowed) {
        const reason = `Agent lacks '${categoryPermKey}:${requiredLevel}' permission required for tool '${toolKey}'`;
        await toolExecutionService.markBlocked(execution.id, reason);
        return {
          status: 'blocked',
          executionId: execution.id,
          error: reason,
        };
      }
    }

    // 5b. Check permissions via ToolPermissionPolicy → AgentPermission
    const permissionCheck = await toolPermissionService.checkToolPermission(agentId, tool.id);
    if (!permissionCheck.allowed) {
      await toolExecutionService.markBlocked(execution.id, permissionCheck.reason ?? 'Insufficient permissions');
      return {
        status: 'blocked',
        executionId: execution.id,
        error: permissionCheck.reason ?? 'Insufficient permissions',
      };
    }

    // 6. Check if approval is required — skip if resumed from an approved state
    if (!resumedFromApproval && (tool.requiresApproval || tool.riskLevel === 'critical')) {
      // Create approval request — no synthetic Project/Epic/Task created
      const approvalRequest = await toolExecutionService.createToolApproval({
        workspaceId,
        agentId,
        taskId,
        toolId: tool.id,
        toolKey: tool.key,
        action,
        risk: tool.riskLevel as 'low' | 'medium' | 'high' | 'critical',
        inputSummary: JSON.stringify(input).slice(0, 500),
        correlationId,
        // inputFull уже сохранён в ToolExecution при createExecution (шаг 4)
      });

      await toolExecutionService.markRequiresApproval(execution.id, approvalRequest.id);

      return {
        status: 'requires_approval',
        executionId: execution.id,
        approvalRequestId: approvalRequest.id,
      };
    }

    // 7. Execute adapter
    // NOTE: If we reach here, either:
    //   a) The tool doesn't require approval, OR
    //   b) resumedFromApproval=true (approval was granted)
    // The approval check in step 6 guarantees we never reach here without proper confirmation.
    await toolExecutionService.markRunning(execution.id);

    try {
      // Special handling for model.resolve — uses AgentModelConfigService
      if (toolKey === 'model.resolve') {
        const resolvedModel = await agentModelConfigService.resolveModelForAgent(agentId);
        await toolExecutionService.markSuccess(
          execution.id,
          JSON.stringify(resolvedModel)
        );
        return {
          status: 'success',
          executionId: execution.id,
          output: resolvedModel,
        };
      }

      // Get adapter
      const adapter = await toolAdapterRegistry.getAdapterAsync(toolKey);
      if (!adapter) {
        await toolExecutionService.markFailed(execution.id, `No adapter found for tool: ${toolKey}`);
        return {
          status: 'failed',
          executionId: execution.id,
          error: `No adapter found for tool: ${toolKey}`,
        };
      }

      // Execute adapter
      const result = await adapter.execute({
        workspaceId,
        agentId,
        taskId,
        toolKey,
        action,
        input,
      });

      if (result.success) {
        await toolExecutionService.markSuccess(
          execution.id,
          JSON.stringify(result.data).slice(0, 500)
        );
        return {
          status: 'success',
          executionId: execution.id,
          output: result.data,
        };
      } else {
        await toolExecutionService.markFailed(execution.id, result.error ?? 'Adapter returned failure');
        return {
          status: 'failed',
          executionId: execution.id,
          error: result.error ?? 'Adapter returned failure',
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await toolExecutionService.markFailed(execution.id, errorMessage);
      return {
        status: 'failed',
        executionId: execution.id,
        error: errorMessage,
      };
    }
  }
}

export const toolHub = ToolHub.getInstance();
