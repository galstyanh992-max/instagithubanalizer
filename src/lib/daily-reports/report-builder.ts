import type { DailyReport, DailyReportInput, DailyReportSection } from "./types";
import { listRecentBrainEntries, recordBrainEntry } from "@/lib/project-brain/project-brain-service";
import { buildGitHubWatchReport } from "@/lib/github-watcher/report-builder";
import { listApis } from "@/lib/api-hub/api-registry-service";

let SEQ = 0;

export async function buildDailyReport(input: DailyReportInput = {}): Promise<DailyReport> {
  const date = input.date ?? new Date().toISOString().slice(0, 10);
  const sections: DailyReportSection[] = [];

  // recent activity (Project Brain — public projection, sensitive already hidden by service)
  let recent: Awaited<ReturnType<typeof listRecentBrainEntries>> = [];
  try { recent = await listRecentBrainEntries(20); } catch { recent = []; }

  const commands = recent.filter((e) => e.type === "user_command").slice(0, 10).map((e) => e.title);
  const safetyDecisions = recent.filter((e) => e.type === "safety_decision");
  const approvalsRelated = recent.filter((e) => e.type === "router_decision" || e.type === "safety_decision");

  sections.push({ type: "commands", title: "Команды", items: commands.length ? commands : ["Нет недавних команд (или Brain недоступен)."] });

  sections.push({
    type: "approvals", title: "Ожидающие/недавние решения",
    items: approvalsRelated.length ? approvalsRelated.map((e) => e.title) : ["Нет данных об approvals."],
    severity: safetyDecisions.length ? "warning" : "info",
  });

  // GitHub section — no network, uses provided text only.
  if (input.includeGithub && input.githubSourceText) {
    const gh = await buildGitHubWatchReport({ text: input.githubSourceText, actorId: input.actorId });
    sections.push({
      type: "github", title: "GitHub находки",
      items: gh.candidates.length ? gh.candidates.map((c) => `${c.candidate.normalizedName}: ${c.usefulness}/${c.recommendedNextAction}`) : ["Ссылок не найдено."],
      severity: gh.risks.length ? "warning" : "info",
      metadata: { risks: gh.risks },
    });
  }

  // API topics — metadata only, no network.
  if (input.includeApiTopics !== false) {
    const apis = listApis();
    sections.push({
      type: "api_topics", title: "API Hub",
      items: apis.map((a) => `${a.name} (${a.category}): ${a.status}`),
    });
  }

  // Developer summary — plan/status only.
  if (input.includeDeveloperSummary !== false) {
    const devEntries = recent.filter((e) => e.type === "action_result");
    sections.push({
      type: "developer", title: "Developer Operator",
      items: devEntries.length ? devEntries.map((e) => e.title) : ["Нет активных dev-планов (или Brain недоступен)."],
    });
  }

  // Agent draft summary.
  if (input.includeAgentSummary !== false) {
    const agentEntries = recent.filter((e) => e.type === "agent_reference");
    sections.push({
      type: "agents", title: "Черновики агентов",
      items: agentEntries.length ? agentEntries.map((e) => e.title) : ["Нет черновиков агентов."],
    });
  }

  const risks = recent.filter((e) => e.type === "safety_decision" && /denied|запрещ/i.test(e.title)).map((e) => e.title);
  sections.push({ type: "risks", title: "Риски", items: risks.length ? risks : ["Критических рисков не обнаружено."], severity: risks.length ? "critical" : "info" });

  const nextActions = [
    "Проверить ожидающие approvals вручную.",
    "Просмотреть черновики агентов перед активацией.",
    ...(risks.length ? ["Разобрать отклонённые/рискованные действия."] : []),
  ];

  const requiresAttention = risks.length > 0 || safetyDecisions.length > 0;

  const report: DailyReport = {
    id: `report-${++SEQ}-${Date.now()}`,
    date,
    title: `Ежедневный отчёт ДЖАРВИС — ${date}`,
    summary: `Команд: ${commands.length}. Секций: ${sections.length}. ${requiresAttention ? "Есть пункты, требующие внимания." : "Без критических рисков."}`,
    sections,
    nextActions,
    requiresAttention,
  };

  void recordBrainEntry({
    type: "daily_note", title: report.title, content: report.summary,
    actorId: input.actorId, importance: requiresAttention ? "high" : "medium",
    metadata: { sectionCount: sections.length, requiresAttention },
  });

  return report;
}
