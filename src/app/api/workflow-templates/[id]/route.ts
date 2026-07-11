import { db } from "@/lib/db";
import { ok, err, safe, parseJson, parseParams } from "@/lib/api";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  steps: z.string().optional(),
  category: z.string().max(50).optional(),
  icon: z.string().max(50).optional(),
  version: z.string().max(20).optional(),
  status: z.string().max(20).optional(),
});

export const GET = safe(async (req: Request, ctx) => {
  const session = await getServerSession(authOptions);
  if (!session) return err("Unauthorized", 401);

  const { id } = await parseParams(ctx);
  if (!id) return err("Missing id", 400);

  const template = await db.workflowTemplate.findUnique({
    where: { id },
  });

  if (!template) return err("WorkflowTemplate not found", 404);
  return ok({ template });
});

export const PATCH = safe(async (req: Request, ctx) => {
  const session = await getServerSession(authOptions);
  if (!session) return err("Unauthorized", 401);

  const { id } = await parseParams(ctx);
  if (!id) return err("Missing id", 400);

  const body = await parseJson(req);
  const parsed = updateWorkflowSchema.safeParse(body);
  
  if (!parsed.success) {
    return err("Invalid input", 400, { issues: parsed.error.flatten() });
  }

  if (parsed.data.steps) {
    try {
      JSON.parse(parsed.data.steps);
    } catch (e) {
      return err("Invalid JSON format for steps", 400);
    }
  }

  const existing = await db.workflowTemplate.findUnique({
    where: { id },
  });

  if (!existing) return err("WorkflowTemplate not found", 404);

  const template = await db.workflowTemplate.update({
    where: { id },
    data: parsed.data,
  });

  return ok({ template });
});

export const DELETE = safe(async (req: Request, ctx) => {
  const session = await getServerSession(authOptions);
  if (!session) return err("Unauthorized", 401);

  const { id } = await parseParams(ctx);
  if (!id) return err("Missing id", 400);

  const template = await db.workflowTemplate.findUnique({
    where: { id },
  });

  if (!template) return err("WorkflowTemplate not found", 404);

  await db.workflowTemplate.delete({
    where: { id },
  });

  return ok({ success: true });
});
