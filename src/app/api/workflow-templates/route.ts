import { db } from "@/lib/db";
import { ok, err, safe, parseJson } from "@/lib/api";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const createWorkflowSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  steps: z.string(), // expected JSON string
  category: z.string().max(50).optional(),
  icon: z.string().max(50).optional(),
  version: z.string().max(20).optional(),
  status: z.string().max(20).optional(),
});

export const GET = safe(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session) return err("Unauthorized", 401);

  const templates = await db.workflowTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });
  return ok({ templates });
});

export const POST = safe(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session) return err("Unauthorized", 401);

  const body = await parseJson(req);
  const parsed = createWorkflowSchema.safeParse(body);
  
  if (!parsed.success) {
    return err("Invalid input", 400, { issues: parsed.error.flatten() });
  }

  // Validate JSON string
  try {
    JSON.parse(parsed.data.steps);
  } catch (e) {
    return err("Invalid JSON format for steps", 400);
  }

  const template = await db.workflowTemplate.create({
    data: parsed.data,
  });

  return ok({ template }, { status: 201 });
});
