import { err, ok, parseJson, safe } from "@/lib/api";
import { catalogFingerprint, parseRepositoryCatalog } from "@/lib/ecosystem/catalog";
import { z } from "zod";

const schema = z.object({ content: z.string().min(1).max(2_000_000) });

// Parse-only endpoint. It never clones, installs, or executes catalog entries.
export const POST = safe(async (req: Request) => {
  const parsed = schema.safeParse(await parseJson(req));
  if (!parsed.success) return err("Invalid catalog input", 400, { issues: parsed.error.flatten() });
  return ok({ fingerprint: catalogFingerprint(parsed.data.content), ...parseRepositoryCatalog(parsed.data.content) });
});
