import { ok, err, safe, parseJson } from "@/lib/api";
import { z } from "zod";
import { buildGitHubWatchReport } from "@/lib/github-watcher/report-builder";

export const runtime = "nodejs";

const schema = z.object({ text: z.string().min(1).max(5000), source: z.string().optional() });

export const POST = safe(async (req: Request) => {
  const body = await parseJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("text required", 400, { issues: parsed.error.flatten() });
  const report = await buildGitHubWatchReport({ text: parsed.data.text, source: parsed.data.source as never });
  return ok({ report }); // no external calls, no install
});
