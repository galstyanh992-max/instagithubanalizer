import { ok, err, safe, parseJson } from "@/lib/api";
import { graphifyService } from "@/services/graphify.service";
import { z } from "zod";

const querySchema = z.object({
  query: z.string().min(1).max(500),
});

export const POST = safe(async (req: Request) => {
  const body = await parseJson(req);
  const parsed = querySchema.safeParse(body);
  if (!parsed.success) return err("Invalid query", 400, { issues: parsed.error.flatten() });
  try {
    const result = await graphifyService.query(parsed.data.query);
    return ok({ stdout: result.stdout, stderr: result.stderr });
  } catch (e: any) {
    return err(e.message, 500);
  }
});
