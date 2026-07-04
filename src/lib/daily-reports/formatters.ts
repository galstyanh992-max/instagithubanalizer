import type { DailyReport } from "./types";

export function formatDailyReportMarkdown(report: DailyReport): string {
  const lines: string[] = [`# ${report.title}`, "", report.summary, ""];
  for (const s of report.sections) {
    lines.push(`## ${s.title}`);
    for (const item of s.items) lines.push(`- ${item}`);
    lines.push("");
  }
  lines.push("## Next actions");
  for (const a of report.nextActions) lines.push(`- ${a}`);
  return lines.join("\n");
}

const TELEGRAM_MAX = 800;

/** Short summary — never returns full sensitive content, never sends anything. */
export function formatDailyReportForTelegram(report: DailyReport): string {
  const attention = report.requiresAttention ? "⚠️ Требует внимания" : "✅ Без критических рисков";
  const topSections = report.sections
    .filter((s) => s.items.length && s.type !== "unknown")
    .slice(0, 4)
    .map((s) => `• ${s.title}: ${s.items.slice(0, 2).join("; ")}`);
  let out = [`${report.title}`, attention, report.summary, ...topSections, "", "Next: " + report.nextActions.slice(0, 2).join("; ")].join("\n");
  if (out.length > TELEGRAM_MAX) out = out.slice(0, TELEGRAM_MAX - 3) + "...";
  return out;
}
