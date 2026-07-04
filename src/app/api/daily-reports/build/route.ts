import { ok, safe, parseJson } from "@/lib/api";
import { z } from "zod";
import { buildDailyReport } from "@/lib/daily-reports/report-builder";
import { formatDailyReportMarkdown } from "@/lib/daily-reports/formatters";

export const runtime = "nodejs";

const schema = z.object({
  actorId: z.string().optional(),
  workspaceId: z.string().optional(),
  projectId: z.string().optional(),
  date: z.string().optional(),
  includeGithub: z.boolean().optional(),
  githubSourceText: z.string().optional(),
  includeApiTopics: z.boolean().optional(),
  includeDeveloperSummary: z.boolean().optional(),
  includeAgentSummary: z.boolean().optional(),
});

export const POST = safe(async (req: Request) => {
  const body = await parseJson(req).catch(() => ({}));
  const parsed = schema.safeParse(body ?? {});
  const input = parsed.success ? parsed.data : {};
  const report = await buildDailyReport(input);
  return ok({ report, markdown: formatDailyReportMarkdown(report) }); // no external calls, no scheduler
});
