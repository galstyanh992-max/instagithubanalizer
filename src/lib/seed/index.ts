// ─── Agent OS — Seed / Initialization ───────────────────────
// Creates the default user, workspace, and agents on first run.
// Stage 3: Also seeds agent profiles, capabilities, permissions, models, runtime states.
// Stage 4: Also seeds default tools and tool permission policies.
// Stage 4 audit: Wires approval lifecycle (approval.approved → ToolExecution resume).

import { db } from '../db';
import { agentRegistry } from '../agent-registry';
import { agentProfileService } from '../agent-system/AgentProfileService';
import { agentCapabilityService } from '../agent-system/AgentCapabilityService';
import { agentPermissionService } from '../agent-system/AgentPermissionService';
import { agentModelConfigService } from '../agent-system/AgentModelConfigService';
import { agentRuntimeService } from '../agent-system/AgentRuntimeService';
import { toolRegistryService } from '../tool-hub/ToolRegistryService';
import { initApprovalLifecycle } from '../tool-hub/approval-lifecycle';
import { loggers } from '@/lib/logger';

const DEFAULT_USER_EMAIL = 'admin@agent-os.local';
const DEFAULT_USER_NAME = 'Admin';
const DEFAULT_WORKSPACE_NAME = 'My Workspace';

/**
 * Initialize the system with default data.
 * Safe to call multiple times — checks for existing data.
 * Idempotent: re-running does not create duplicates.
 */
export async function initializeSystem() {
  // 1. Ensure default user exists
  let user = await db.user.findUnique({ where: { email: DEFAULT_USER_EMAIL } });

  if (!user) {
    user = await db.user.create({
      data: {
        email: DEFAULT_USER_EMAIL,
        name: DEFAULT_USER_NAME,
        settings: JSON.stringify({
          theme: 'system',
          language: 'en',
          notifications: true,
        }),
      },
    });
    loggers.seed.info({ data: user.id }, '[Seed] Created default user:');
  }

  // 2. Ensure default workspace exists
  let workspace = await db.workspace.findFirst({
    where: { ownerId: user.id },
  });

  if (!workspace) {
    workspace = await db.workspace.create({
      data: {
        ownerId: user.id,
        name: DEFAULT_WORKSPACE_NAME,
        mode: 'single',
      },
    });
    loggers.seed.info({ data: workspace.id }, '[Seed] Created default workspace:');
  }

  // 3. Seed default agents
  const agentResult = await agentRegistry.seedDefaultAgents(workspace.id);
  if (agentResult.created > 0) {
    loggers.seed.info(`[Seed] Created ${agentResult.created} default agents (skipped ${agentResult.skipped})`);
  }

  // 4. Seed agent system sub-entities (Stage 3)
  const profileResult = await agentProfileService.ensureDefaultProfiles(workspace.id);
  if (profileResult.created > 0) {
    loggers.seed.info(`[Seed] Created ${profileResult.created} agent profiles (skipped ${profileResult.skipped})`);
  }

  const capabilityResult = await agentCapabilityService.ensureDefaultCapabilities(workspace.id);
  if (capabilityResult.created > 0) {
    loggers.seed.info(`[Seed] Created ${capabilityResult.created} agent capabilities (skipped ${capabilityResult.skipped})`);
  }

  const permissionResult = await agentPermissionService.ensureDefaultPermissions(workspace.id);
  if (permissionResult.created > 0) {
    loggers.seed.info(`[Seed] Created ${permissionResult.created} agent permissions (skipped ${permissionResult.skipped})`);
  }

  const modelResult = await agentModelConfigService.ensureDefaultModels(workspace.id);
  if (modelResult.created > 0) {
    loggers.seed.info(`[Seed] Created ${modelResult.created} agent model configs (skipped ${modelResult.skipped})`);
  }

  const runtimeResult = await agentRuntimeService.ensureRuntimeStates(workspace.id);
  if (runtimeResult.created > 0) {
    loggers.seed.info(`[Seed] Created ${runtimeResult.created} agent runtime states (skipped ${runtimeResult.skipped})`);
  }

  // 5. Seed default tools and policies (Stage 4)
  const toolResult = await toolRegistryService.seedDefaultTools(workspace.id);
  if (toolResult.created > 0) {
    loggers.seed.info(`[Seed] Created ${toolResult.created} tools with policies (skipped ${toolResult.skipped})`);
  }

  // 6. Wire approval lifecycle (Stage 4 audit)
  // approval.approved → ToolExecution resume → re-execute tool
  initApprovalLifecycle();

  return {
    user,
    workspace,
    agentsSeeded: agentResult,
    profilesSeeded: profileResult,
    capabilitiesSeeded: capabilityResult,
    permissionsSeeded: permissionResult,
    modelsSeeded: modelResult,
    runtimeStatesSeeded: runtimeResult,
    toolsSeeded: toolResult,
  };
}

/**
 * Get the system status (counts of all entities)
 */
export async function getSystemStatus() {
  const [
    userCount,
    workspaceCount,
    projectCount,
    epicCount,
    taskCount,
    agentCount,
    memoryCount,
    approvalCount,
    eventCount,
    costLogCount,
    agentProfileCount,
    agentCapabilityCount,
    agentModelConfigCount,
    agentPermissionCount,
    agentRuntimeStateCount,
    agentMemoryLinkCount,
    toolCount,
    toolExecutionCount,
    toolPolicyCount,
  ] = await Promise.all([
    db.user.count(),
    db.workspace.count(),
    db.project.count(),
    db.epic.count(),
    db.task.count(),
    db.agent.count(),
    db.memoryItem.count(),
    db.approvalRequest.count(),
    db.eventLog.count(),
    db.costLog.count(),
    db.agentProfile.count(),
    db.agentCapability.count(),
    db.agentModelConfig.count(),
    db.agentPermission.count(),
    db.agentRuntimeState.count(),
    db.agentMemoryLink.count(),
    db.tool.count(),
    db.toolExecution.count(),
    db.toolPermissionPolicy.count(),
  ]);

  return {
    users: userCount,
    workspaces: workspaceCount,
    projects: projectCount,
    epics: epicCount,
    tasks: taskCount,
    agents: agentCount,
    memories: memoryCount,
    approvals: approvalCount,
    events: eventCount,
    costLogs: costLogCount,
    agentProfiles: agentProfileCount,
    agentCapabilities: agentCapabilityCount,
    agentModelConfigs: agentModelConfigCount,
    agentPermissions: agentPermissionCount,
    agentRuntimeStates: agentRuntimeStateCount,
    agentMemoryLinks: agentMemoryLinkCount,
    tools: toolCount,
    toolExecutions: toolExecutionCount,
    toolPolicies: toolPolicyCount,
  };
}
