import { db } from "@/lib/db";
import { ok, err, safe, parseJson } from "@/lib/api";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const createDepartmentSchema = z.object({
  key: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  color: z.string().max(20).optional(),
  icon: z.string().max(50).optional(),
  enabled: z.boolean().optional(),
});

export const GET = safe(async (req: Request) => {
  const departments = await db.department.findMany({
    orderBy: { createdAt: "desc" },
  });
  return ok({ departments });
});

export const POST = safe(async (req: Request) => {
  const body = await parseJson(req);
  const parsed = createDepartmentSchema.safeParse(body);
  
  if (!parsed.success) {
    return err("Invalid input", 400, { issues: parsed.error.flatten() });
  }

  const existing = await db.department.findUnique({
    where: { key: parsed.data.key },
  });

  if (existing) {
    return err(`Department with key '${parsed.data.key}' already exists`, 409);
  }

  const department = await db.department.create({
    data: parsed.data,
  });

  return ok({ department }, { status: 201 });
});
