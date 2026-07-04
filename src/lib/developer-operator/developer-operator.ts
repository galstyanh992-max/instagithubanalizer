import type { DeveloperOperatorInput, DeveloperOperatorResult, DeveloperNextAction } from "./types";
import { classifyDeveloperAction } from "./action-classifier";
import { planDeveloperAction } from "./command-planner";
import { checkPermission } from "@/lib/safety/permission-checker";
import { isUnknownActor } from "@/lib/safety/actor";
import { recordBrainEntry } from "@/lib/project-brain/project-brain-service";

const SAFE_INSPECTION = new Set(["inspect_project", "read_errors"]);

/** Plans developer actions. NEVER executes commands. */
export async function planDeveloperOperator(input: DeveloperOperatorInput): Promise<DeveloperOperatorResult> {
  const action = classifyDeveloperAction(input.text);

  if (isUnknownActor(input.actor)) {
    return { action, allowed: false, requiresApproval: false, message: "Неизвестный актор.", nextAction: "deny" };
  }
  if (action === "unknown") {
    return { action, allowed: false, requiresApproval: false, message: "Уточните developer-задачу.", nextAction: "clarify" };
  }

  const { plan, commands } = planDeveloperAction(action);

  // Any hard-denied command → deny whole plan.
  const denied = commands.find((c) => c.riskLevel === "CRITICAL" && !c.requiresApproval);
  if (denied) {
    return { action, allowed: false, requiresApproval: false, message: `Запрещено: ${denied.reason}`, plan, commands, nextAction: "deny" };
  }

  const needsApproval = commands.some((c) => c.requiresApproval) ||
    action === "prepare_prompt_implementation" || action === "prepare_git_commit" ||
    action === "prepare_github_push" || action === "prepare_vercel_deploy";

  // Highest risk drives the actor permission check.
  const topRisk = commands.reduce<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">((acc, c) => rank(c.riskLevel) > rank(acc) ? c.riskLevel : acc, "LOW");
  const perm = checkPermission({ action: `developer.${action}`, riskLevel: needsApproval ? (topRisk === "LOW" ? "HIGH" : topRisk) : topRisk, actor: input.actor });

  let nextAction: DeveloperNextAction;
  let message: string;
  if (!perm.allowed && !perm.requiresApproval) {
    nextAction = "deny"; message = perm.reason;
  } else if (needsApproval || perm.requiresApproval) {
    nextAction = "request_approval"; message = "Действие требует подтверждения.";
  } else if (SAFE_INSPECTION.has(action)) {
    nextAction = "show_plan"; message = "План инспекции (без выполнения).";
  } else {
    nextAction = "show_plan"; message = "План готов (без выполнения).";
  }

  void recordBrainEntry({
    type: "action_result",
    title: `dev plan: ${action}`,
    content: JSON.stringify({ action, nextAction, commands: commands.map((c) => c.command) }),
    actorId: input.actor.id, actorRole: input.actor.role, actorSource: input.actor.source,
    importance: needsApproval ? "high" : "medium",
    metadata: { action, nextAction, requiresApproval: needsApproval },
  });

  return {
    action,
    allowed: nextAction === "show_plan",
    requiresApproval: nextAction === "request_approval",
    message, plan, commands, nextAction,
  };
}

function rank(r: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"): number {
  return { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 }[r];
}
