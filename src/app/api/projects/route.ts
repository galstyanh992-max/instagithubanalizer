import { db } from "@/lib/db";
import { ok, err, safe, parseJson } from "@/lib/api";
import { projectsService } from "@/services/projects.service";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  localPath: z.string().max(500).optional(),
  githubUrl: z.string().max(500).optional(),
  techStack: z.array(z.string()).optional(),
  goals: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

export const GET = safe(async () => {
  const projects = await projectsService.list();
  return ok({ projects });
});

export const POST = safe(async (req: Request) => {
  const body = await parseJson(req);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return err("Invalid project input", 400, { issues: parsed.error.flatten() });
  }
  const project = await projectsService.create(parsed.data);
  return ok({ project });
});
