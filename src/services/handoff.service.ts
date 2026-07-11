import { db } from "@/lib/db";
import { z } from "zod";

const createHandoffSchema = z.object({
  workspaceId: z.string(),
  projectId: z.string().optional(),
  fromDepartment: z.string(), // key
  toDepartment: z.string(), // key
  triggerEvent: z.string(),
  inputArtifacts: z.string().optional(),
});

const resolveHandoffSchema = z.object({
  status: z.enum(["completed", "failed"]),
  outputArtifacts: z.string().optional(),
  errors: z.string().optional(),
});

export const handoffService = {
  async createHandoff(input: unknown) {
    const parsed = createHandoffSchema.parse(input);

    // Validate if departments exist
    const [fromDep, toDep] = await Promise.all([
      db.department.findUnique({ where: { key: parsed.fromDepartment } }),
      db.department.findUnique({ where: { key: parsed.toDepartment } }),
    ]);

    if (!fromDep) throw new Error(`Source department '${parsed.fromDepartment}' not found`);
    if (!toDep) throw new Error(`Target department '${parsed.toDepartment}' not found`);

    return await db.handoffRecord.create({
      data: {
        ...parsed,
        status: "pending",
      },
    });
  },

  async acceptHandoff(id: string, actorContext: { agentId?: string }) {
    const record = await db.handoffRecord.findUnique({ where: { id } });
    if (!record) throw new Error("Handoff record not found");
    if (record.status !== "pending") {
      throw new Error(`Cannot accept handoff in status '${record.status}'. Expected 'pending'.`);
    }

    return await db.handoffRecord.update({
      where: { id },
      data: {
        status: "in_progress",
        receivingAgentId: actorContext.agentId || null,
        startedAt: new Date(),
      },
    });
  },

  async resolveHandoff(id: string, actorContext: { agentId?: string, resolution: unknown }) {
    const record = await db.handoffRecord.findUnique({ where: { id } });
    if (!record) throw new Error("Handoff record not found");
    if (record.status !== "in_progress") {
      throw new Error(`Cannot resolve handoff in status '${record.status}'. Expected 'in_progress'.`);
    }

    const parsed = resolveHandoffSchema.parse(actorContext.resolution);

    return await db.handoffRecord.update({
      where: { id },
      data: {
        status: parsed.status,
        outputArtifacts: parsed.outputArtifacts,
        errors: parsed.errors,
        completedAt: new Date(),
      },
    });
  },

  async listActiveHandoffs(filters?: { workspaceId?: string, departmentKey?: string }) {
    const where: any = {
      status: { in: ["pending", "in_progress"] }
    };
    
    if (filters?.workspaceId) {
      where.workspaceId = filters.workspaceId;
    }
    
    if (filters?.departmentKey) {
      where.OR = [
        { fromDepartment: filters.departmentKey },
        { toDepartment: filters.departmentKey }
      ];
    }

    return await db.handoffRecord.findMany({
      where,
      orderBy: { createdAt: "asc" }
    });
  }
};
