import type { AgentFactoryRequest, AgentFactoryResult, AgentDraftProfile } from "./types";
import { classifyAgentPurpose } from "./purpose-classifier";
import { PURPOSE_TEMPLATES } from "./capability-matching";
import { isUnsafeAgentRequest } from "./unsafe-filter";
import { isUnknownActor } from "@/lib/safety/actor";
import { checkPermission } from "@/lib/safety/permission-checker";
import { recordBrainEntry } from "@/lib/project-brain/project-brain-service";

let SEQ = 0;

/** Builds a draft agent profile. Never activates/schedules/executes anything. */
export async function createAgentDraft(request: AgentFactoryRequest): Promise<AgentFactoryResult> {
  const { text, actor } = request;

  if (isUnknownActor(actor)) {
    return { draft: null, allowed: false, requiresApproval: false, nextAction: "deny", message: "Неизвестный актор." };
  }

  const unsafe = isUnsafeAgentRequest(text);
  if (unsafe.unsafe) {
    void recordBrainEntry({
      type: "safety_decision", title: "agent request denied", content: text,
      importance: "high", metadata: { reason: unsafe.reason },
    });
    return { draft: null, allowed: false, requiresApproval: false, nextAction: "deny", message: `Запрещено: ${unsafe.reason}` };
  }

  if (!text.trim()) {
    return { draft: null, allowed: false, requiresApproval: false, nextAction: "clarify", message: "Уточните задачу агента." };
  }

  const purpose = classifyAgentPurpose(text);
  const tpl = PURPOSE_TEMPLATES[purpose];

  const perm = checkPermission({ action: `agent.create.${purpose}`, riskLevel: tpl.riskLevel, actor });
  const requiresApproval = tpl.requiresApproval || perm.requiresApproval;

  if (!perm.allowed && !perm.requiresApproval) {
    return { draft: null, allowed: false, requiresApproval: false, nextAction: "deny", message: perm.reason };
  }

  const draft: AgentDraftProfile = {
    id: `agent-draft-${++SEQ}-${Date.now()}`,
    name: `${purpose} agent`,
    purpose,
    goal: tpl.goal,
    description: `Draft agent for: ${text}`.slice(0, 300),
    executionMode: requiresApproval ? "approval_required" : "manual",
    riskLevel: tpl.riskLevel,
    requiresApproval,
    suggestedTools: tpl.suggestedTools,
    suggestedApis: tpl.suggestedApis,
    // Agents never get owner/admin by default.
    permissions: tpl.permissions,
    memoryScope: tpl.memoryScope,
    status: requiresApproval ? "pending_approval" : "draft",
    reason: perm.reason,
  };

  void recordBrainEntry({
    type: "agent_reference", title: `agent draft: ${purpose}`, content: draft.description,
    actorId: actor.id, actorRole: actor.role, actorSource: actor.source,
    importance: requiresApproval ? "high" : "medium",
    metadata: { purpose, riskLevel: tpl.riskLevel, requiresApproval, permissions: tpl.permissions },
  });

  return {
    draft,
    allowed: !requiresApproval,
    requiresApproval,
    nextAction: requiresApproval ? "request_approval" : "show_plan",
    message: requiresApproval ? "Черновик агента создан. Требуется подтверждение перед активацией." : "Черновик агента создан (не активирован).",
  };
}
