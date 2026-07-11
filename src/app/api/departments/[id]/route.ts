import { db } from "@/lib/db";
import { ok, err, safe, parseJson, parseParams } from "@/lib/api";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  color: z.string().max(20).optional(),
  icon: z.string().max(50).optional(),
  enabled: z.boolean().optional(),
});

export const GET = safe(async (req: Request, ctx) => {
  const session = await getServerSession(authOptions);
  if (!session) return err("Unauthorized", 401);

  const { id } = await parseParams(ctx);
  if (!id) return err("Missing id", 400);

  const department = await db.department.findUnique({
    where: { id },
  });

  if (!department) return err("Department not found", 404);
  return ok({ department });
});

export const PATCH = safe(async (req: Request, ctx) => {
  const session = await getServerSession(authOptions);
  if (!session) return err("Unauthorized", 401);

  const { id } = await parseParams(ctx);
  if (!id) return err("Missing id", 400);

  const body = await parseJson(req);
  const parsed = updateDepartmentSchema.safeParse(body);
  
  if (!parsed.success) {
    return err("Invalid input", 400, { issues: parsed.error.flatten() });
  }

  const existing = await db.department.findUnique({
    where: { id },
  });

  if (!existing) return err("Department not found", 404);

  const department = await db.department.update({
    where: { id },
    data: parsed.data,
  });

  return ok({ department });
});

export const DELETE = safe(async (req: Request, ctx) => {
  const session = await getServerSession(authOptions);
  if (!session) return err("Unauthorized", 401);

  const { id } = await parseParams(ctx);
  if (!id) return err("Missing id", 400);

  // Check for existing handoffs to prevent orphaned records in case of cascade issues,
  // although Prisma might handle it, it's safer to prevent delete if active handoffs exist.
  const handoffsCount = await db.handoffRecord.count({
    where: { 
      fromDepartment: id, // wait, fromDepartment links to 'key' not 'id' according to schema!
    },
  });
  
  // Wait, let's fetch the department first to get its key.
  const department = await db.department.findUnique({
    where: { id },
  });

  if (!department) return err("Department not found", 404);

  const activeHandoffs = await db.handoffRecord.count({
    where: {
      OR: [
        { fromDepartment: department.key },
        { toDepartment: department.key }
      ],
      status: { in: ["pending", "in_progress"] }
    }
  });

  if (activeHandoffs > 0) {
    return err("Cannot delete department with active handoffs", 409);
  }

  await db.department.delete({
    where: { id },
  });

  return ok({ success: true });
});
