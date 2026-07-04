import type { CommandRouterInput, CommandRouterResult } from "./types";
import { classifyIntent } from "./intent-classifier";
import { assessRisk } from "./risk-classifier";
import { createApprovalForCommand } from "./approval";
import { checkPermission } from "@/lib/safety/permission-checker";
import { isUnknownActor } from "@/lib/safety/actor";
import { recordAuditEvent } from "@/lib/safety/audit-logger";
import { dispatchSafe } from "./dispatch";
import { recordUserCommand, recordRouterDecision, recordSafetyDecision } from "@/lib/project-brain/project-brain-service";
import { planDeveloperOperator } from "@/lib/developer-operator/developer-operator";
import { createAgentDraft } from "@/lib/agent-factory/draft-builder";
import { buildGitHubWatchReport } from "@/lib/github-watcher/report-builder";
import { planBrowserResearch } from "@/lib/browser-research/planner";
import { buildEmailDraft } from "@/lib/email-foundation/draft-builder";
import { planContentGeneration } from "@/lib/content-generation/planner";
import { planLocalOperatorAction } from "@/lib/local-operator/planner";

export async function routeCommand(input: CommandRouterInput): Promise<CommandRouterResult> {
  const { text, actor, source } = input;
  const intent = classifyIntent(text);
  const risk = assessRisk(intent, text);

  // Record incoming command (non-fatal — recorder never throws).
  void recordUserCommand(text, { id: actor.id, role: actor.role, source: actor.source }, source);

  // Unknown actor → fail closed.
  if (isUnknownActor(actor)) {
    recordAuditEvent({
      type: "permission.check",
      message: "Команда отклонена: неизвестный актор.",
      actor: `${actor.role}:${actor.id}@${actor.source}`,
      riskLevel: risk.riskLevel,
      metadata: { intent, source, text },
    });
    return {
      intent,
      riskLevel: risk.riskLevel,
      allowed: false,
      requiresApproval: false,
      message: "Доступ запрещён: неизвестный актор.",
      reason: "unknown actor (fail closed)",
      nextAction: "deny",
    };
  }

  // Unknown intent → clarify (never execute).
  if (intent === "unknown") {
    return {
      intent,
      riskLevel: risk.riskLevel,
      allowed: false,
      requiresApproval: false,
      message: "Не понял команду. Уточните, что нужно сделать.",
      reason: "intent=unknown",
      nextAction: "clarify",
    };
  }

  // browser_task → research plan (never launches browser, never fetches network).
  if (intent === "browser_task") {
    const plan = await planBrowserResearch({ text, actorId: actor.id });
    const na = !plan.allowed && !plan.requiresApproval ? "deny" : plan.requiresApproval ? "request_approval" : "respond";
    void recordRouterDecision(text, { intent, mode: plan.mode, nextAction: na });
    return {
      intent, riskLevel: risk.riskLevel, allowed: plan.allowed, requiresApproval: plan.requiresApproval,
      message: plan.blockedReasons[0] ?? `План исследования (${plan.mode}) готов. Браузер не запускается.`,
      reason: `browser.${plan.mode}`, nextAction: na as CommandRouterResult["nextAction"], data: { plan },
    };
  }

  // email_task → draft only, never sends.
  if (intent === "email_task") {
    const draft = await buildEmailDraft({ text, actorId: actor.id });
    const na = draft.nextAction === "show_draft" ? (draft.requiresApproval ? "request_approval" : "respond")
      : draft.nextAction === "request_approval" ? "request_approval"
      : draft.nextAction === "deny" ? "deny" : "clarify";
    void recordRouterDecision(text, { intent, emailIntent: draft.intent, nextAction: na });
    return {
      intent, riskLevel: risk.riskLevel, allowed: draft.allowed, requiresApproval: draft.requiresApproval,
      message: draft.blockedReasons[0] ?? (draft.subject ? `Черновик готов: ${draft.subject}` : "Email не отправлен."),
      reason: `email.${draft.intent}`, nextAction: na as CommandRouterResult["nextAction"], data: { draft },
    };
  }

  // content_task → generation plan only, never calls generation API, never publishes.
  if (intent === "content_task") {
    const plan = await planContentGeneration({ text, actorId: actor.id });
    const na = plan.nextAction === "show_plan" || plan.nextAction === "show_draft" ? (plan.requiresApproval ? "request_approval" : "respond")
      : plan.nextAction === "request_approval" ? "request_approval"
      : plan.nextAction === "deny" ? "deny" : "clarify";
    void recordRouterDecision(text, { intent, mode: plan.mode, nextAction: na });
    return {
      intent, riskLevel: risk.riskLevel, allowed: plan.allowed, requiresApproval: plan.requiresApproval,
      message: plan.blockedReasons[0] ?? `План контента (${plan.mode}) готов. Генерация/публикация не выполнялась.`,
      reason: `content.${plan.mode}`, nextAction: na as CommandRouterResult["nextAction"], data: { plan },
    };
  }

  // github_analysis with repo URLs → watch report (no network, no install).
  if (intent === "github_analysis" && /github\.com\//i.test(text)) {
    const report = await buildGitHubWatchReport({ text, actorId: actor.id, actorRole: actor.role, actorSource: actor.source });
    void recordRouterDecision(text, { intent, nextAction: "respond", candidateCount: report.candidates.length });
    return {
      intent, riskLevel: risk.riskLevel, allowed: true, requiresApproval: false,
      message: report.summary, reason: "github watch report (no network, no install)",
      nextAction: "respond", data: { report },
    };
  }

  // local_operator → plan-only, never executes, MCP/Desktop Commander => local_agent_required.
  if (intent === "local_operator") {
    const plan = await planLocalOperatorAction({ text, actorId: actor.id, actorRole: actor.role, actorSource: actor.source });
    const na = plan.nextAction === "show_plan" ? "respond"
      : plan.nextAction === "request_approval" ? "request_approval"
      : plan.nextAction === "local_agent_required" ? "clarify"
      : plan.nextAction === "deny" ? "deny" : "clarify";
    void recordRouterDecision(text, { intent, capability: plan.capability, nextAction: na });
    return {
      intent, riskLevel: risk.riskLevel, allowed: plan.allowed, requiresApproval: plan.requiresApproval,
      message: plan.blockedReasons[0] ?? (plan.status === "local_agent_required" ? "Требуется локальный агент/MCP (не подключён)." : `План (${plan.capability}) готов. Ничего не выполнено.`),
      reason: `local.${plan.capability}`, nextAction: na as CommandRouterResult["nextAction"], data: { plan },
    };
  }

  // developer_task → Developer Operator planner (never executes).
  if (intent === "developer_task" || intent === "terminal_task") {
    const dev = await planDeveloperOperator({ text, actor, workspaceId: input.workspaceId });
    if (dev.action !== "unknown") {
      const na = dev.nextAction === "show_plan" ? "respond"
        : dev.nextAction === "request_approval" ? "request_approval"
        : dev.nextAction === "deny" ? "deny" : "clarify";
      void recordRouterDecision(text, { intent, action: dev.action, nextAction: na, riskLevel: risk.riskLevel });
      return {
        intent,
        riskLevel: risk.riskLevel,
        allowed: dev.allowed,
        requiresApproval: dev.requiresApproval,
        message: dev.message,
        reason: `developer.${dev.action}`,
        nextAction: na as CommandRouterResult["nextAction"],
        data: { plan: dev.plan, commands: dev.commands },
      };
    }
  }

  // api_task → list registry / plan (never calls external APIs).
  if (intent === "api_task") {
    const { listApis } = await import("@/lib/api-hub/api-registry-service");
    const apis = listApis();
    void recordRouterDecision(text, { intent, nextAction: "respond", count: apis.length });
    return {
      intent,
      riskLevel: risk.riskLevel,
      allowed: true,
      requiresApproval: false,
      message: `Доступно API: ${apis.length}. Реальные вызовы требуют подтверждения.`,
      reason: "api registry listing (no external call)",
      nextAction: "respond",
      data: { apis },
    };
  }

  // agent_task → Agent Factory draft builder (never activates).
  if (intent === "agent_task") {
    const res = await createAgentDraft({ text, actor, workspaceId: input.workspaceId });
    const na = res.nextAction === "show_plan" ? "respond"
      : res.nextAction === "request_approval" ? "request_approval"
      : res.nextAction === "deny" ? "deny" : "clarify";
    void recordRouterDecision(text, { intent, purpose: res.draft?.purpose, nextAction: na });
    return {
      intent,
      riskLevel: risk.riskLevel,
      allowed: res.allowed,
      requiresApproval: res.requiresApproval,
      message: res.message,
      reason: `agent.${res.draft?.purpose ?? "unknown"}`,
      nextAction: na as CommandRouterResult["nextAction"],
      data: { draft: res.draft },
    };
  }

  const perm = checkPermission({ action: `command.${intent}`, riskLevel: risk.riskLevel, actor });

  recordAuditEvent({
    type: "permission.check",
    message: `Command routed: intent=${intent} risk=${risk.riskLevel} allowed=${perm.allowed} approval=${perm.requiresApproval}`,
    actor: `${actor.role}:${actor.id}@${actor.source}`,
    riskLevel: risk.riskLevel,
    metadata: { intent, source, text, reasons: risk.reasons },
  });

  // Denied outright.
  if (!perm.allowed && !perm.requiresApproval) {
    void recordSafetyDecision(`denied: ${intent}`, text, { intent, riskLevel: risk.riskLevel, reason: perm.reason });
    return {
      intent,
      riskLevel: risk.riskLevel,
      allowed: false,
      requiresApproval: false,
      message: perm.reason,
      reason: perm.reason,
      nextAction: "deny",
    };
  }

  // Requires approval → persist (best effort) and return approval info.
  if (perm.requiresApproval || risk.requiresApproval) {
    const reason = [perm.reason, ...risk.reasons].filter(Boolean).join("; ");
    const { approvalId, payload } = await createApprovalForCommand({
      actor,
      source,
      text,
      intent,
      reason,
      riskLevel: risk.riskLevel,
    });
    void recordRouterDecision(text, { intent, riskLevel: risk.riskLevel, nextAction: "request_approval", approvalId });
    return {
      intent,
      riskLevel: risk.riskLevel,
      allowed: false,
      requiresApproval: true,
      approvalId: approvalId ?? undefined,
      approvalPayload: payload as unknown as Record<string, unknown>,
      message: "Действие требует подтверждения.",
      reason,
      nextAction: "request_approval",
    };
  }

  // Safe → dispatch stub.
  const dispatched = dispatchSafe(intent, text);
  void recordRouterDecision(text, { intent, riskLevel: risk.riskLevel, nextAction: dispatched.nextAction });
  return {
    intent,
    riskLevel: risk.riskLevel,
    allowed: true,
    requiresApproval: false,
    message: dispatched.message,
    reason: "safe action allowed",
    nextAction: dispatched.nextAction,
    data: dispatched.data,
  };
}
