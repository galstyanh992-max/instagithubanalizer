// AI Jarwisyan — Connected Projects service

import { db } from "@/lib/db";

export interface ConnectedProjectInput {
  name: string;
  description?: string;
  localPath?: string;
  githubUrl?: string;
  techStack?: string[];
  goals?: string[];
  active?: boolean;
}

function parseArr(s: string | null | undefined): string[] {
  if (!s) return [];
  try { return JSON.parse(s) as string[]; } catch { return []; }
}

function stringifyArr(arr?: string[]): string {
  return JSON.stringify(arr ?? []);
}

export const projectsService = {
  async list() {
    const projects = await db.connectedProject.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { integrationPlans: true } } },
    });
    return projects.map((p) => ({
      ...p,
      techStack: parseArr(p.techStack),
      goals: parseArr(p.goals),
      _count: p._count,
    }));
  },

  async get(id: string) {
    const p = await db.connectedProject.findUnique({
      where: { id },
      include: { integrationPlans: { orderBy: { createdAt: "desc" }, take: 20 } },
    });
    if (!p) return null;
    return {
      ...p,
      techStack: parseArr(p.techStack),
      goals: parseArr(p.goals),
    };
  },

  async create(input: ConnectedProjectInput) {
    return db.connectedProject.create({
      data: {
        name: input.name,
        description: input.description ?? "",
        localPath: input.localPath ?? "",
        githubUrl: input.githubUrl ?? "",
        techStack: stringifyArr(input.techStack),
        goals: stringifyArr(input.goals),
        active: input.active ?? true,
      },
    });
  },

  async update(id: string, input: Partial<ConnectedProjectInput>) {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.localPath !== undefined) data.localPath = input.localPath;
    if (input.githubUrl !== undefined) data.githubUrl = input.githubUrl;
    if (input.techStack !== undefined) data.techStack = stringifyArr(input.techStack);
    if (input.goals !== undefined) data.goals = stringifyArr(input.goals);
    if (input.active !== undefined) data.active = input.active;
    return db.connectedProject.update({ where: { id }, data });
  },

  async remove(id: string) {
    return db.connectedProject.delete({ where: { id } });
  },
};
