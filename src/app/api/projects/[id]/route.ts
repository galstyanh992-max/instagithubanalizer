import { ok, err, safe, parseJson, parseParams } from "@/lib/api";
import { projectsService } from "@/services/projects.service";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  localPath: z.string().max(500).optional(),
  githubUrl: z.string().max(500).optional(),
  techStack: z.array(z.string()).optional(),
  goals: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

export const GET = safe(async (_req: Request, ctx) => {
  const { id } = await parseParams(ctx);
  const project = await projectsService.get(id);
  if (!project) return err("Project not found", 404);
  return ok({ project });
});

export const PATCH = safe(async (req: Request, ctx) => {
  const { id } = await parseParams(ctx);
  const body = await parseJson(req);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return err("Invalid project input", 400, { issues: parsed.error.flatten() });
  }
  const project = await projectsService.update(id, parsed.data);
  return ok({ project });
});

export const DELETE = safe(async (_req: Request, ctx) => {
  const { id } = await parseParams(ctx);
  await projectsService.remove(id);
  return ok({ ok: true });
});
