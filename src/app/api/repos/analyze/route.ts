import { db } from "@/lib/db";
import { ok, err, safe, parseJson } from "@/lib/api";
import { analyzeRepoSchema } from "@/lib/validators";
import { analyzeRepoPipeline } from "@/lib/pipeline";

export const POST = safe(async (req: Request) => {
  const body = await parseJson(req);
  const parsed = analyzeRepoSchema.safeParse(body);
  if (!parsed.success) {
    return err("Invalid input", 400, { issues: parsed.error.flatten().fieldErrors });
  }
  const input = parsed.data;
  const ref = input.fullName ?? `${input.owner}/${input.repo}`;
  const result = await analyzeRepoPipeline(ref, { force: true });
  return ok(result);
});
