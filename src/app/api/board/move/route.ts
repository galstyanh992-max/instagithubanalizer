import { db } from "@/lib/db";
import { ok, err, safe, parseJson } from "@/lib/api";
import { boardMoveSchema } from "@/lib/validators";

export const PATCH = safe(async (req: Request) => {
  const body = await parseJson(req);
  const parsed = boardMoveSchema.safeParse(body);
  if (!parsed.success) {
    return err("Invalid input", 400, { issues: parsed.error.flatten() });
  }
  const { repoId, verdict } = parsed.data;
  const repo = await db.repository.findUnique({ where: { id: repoId } });
  if (!repo) return err("Repository not found", 404);
  const updated = await db.repository.update({
    where: { id: repoId },
    data: { verdict },
  });
  return ok({ ok: true, repositoryId: repoId, verdict });
});
