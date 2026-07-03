import { db } from "@/lib/db";
import { ok, err, safe, parseParams } from "@/lib/api";
import { categoryClassifier } from "@/services/category-classifier.service";

export const POST = safe(async (_req: Request, ctx) => {
  const { id } = await parseParams(ctx);
  const repo = await db.repository.findUnique({ where: { id } });
  if (!repo) return err("Repository not found", 404);
  const result = categoryClassifier.classify({
    description: repo.description, topics: safeParseArr(repo.topics),
    readmeText: repo.readmeText, primaryLanguage: repo.primaryLanguage, name: repo.name,
  });
  return ok({ classification: result });
});
function safeParseArr(s: string | null): string[] { if (!s) return []; try { return JSON.parse(s); } catch { return []; } }
