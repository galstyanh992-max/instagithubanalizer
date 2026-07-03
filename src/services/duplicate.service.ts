// AI Jarwisyan — Duplicate detector

import { db } from "@/lib/db";

export const duplicateService = {
  async findDuplicate(fullName: string) {
    const existing = await db.repository.findUnique({
      where: { fullName: fullName.toLowerCase() },
    });
    return existing;
  },

  async findSimilar(name: string) {
    const lower = name.toLowerCase();
    const candidates = await db.repository.findMany({
      where: { name: { contains: lower } },
      take: 5,
    });
    return candidates;
  },

  async findSamePurpose(description: string) {
    if (!description) return [];
    const tokens = description
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 4)
      .slice(0, 5);
    if (tokens.length === 0) return [];
    const repos = await db.repository.findMany({
      where: {
        OR: tokens.map((t) => ({ description: { contains: t } })),
      },
      take: 5,
    });
    return repos;
  },
};
