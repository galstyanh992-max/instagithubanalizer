import { ok, err, safe, parseJson } from "@/lib/api";
import { z } from "zod";
import { planDeveloperOperator } from "@/lib/developer-operator/developer-operator";
import { normalizeActor } from "@/lib/safety/actor";

export const runtime = "nodejs";

const schema = z.object({
  text: z.string().min(1).max(500),
  actor: z.record(z.string(), z.unknown()).optional(),
  workspaceId: z.string().optional(),
  projectId: z.string().optional(),
});

export const POST = safe(async (req: Request) => {
  const body = await parseJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("text required", 400, { issues: parsed.error.flatten() });

  const actor = normalizeActor(parsed.data.actor ?? { id: "web-user", role: "owner", source: "web" });
  const result = await planDeveloperOperator({
    text: parsed.data.text,
    actor,
    workspaceId: parsed.data.workspaceId,
    projectId: parsed.data.projectId,
  });
  // Plan only — never executes.
  return ok({ result });
});
