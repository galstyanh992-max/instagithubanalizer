import { db } from "@/lib/db";
import { ok, safe } from "@/lib/api";
import { reposQuerySchema } from "@/lib/validators";
import type { Prisma } from "@prisma/client";

export const GET = safe(async (req: Request) => {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = reposQuerySchema.safeParse(params);
  const q = parsed.success ? parsed.data : {};

  const where: Prisma.RepositoryWhereInput = {};
  if (q.search) {
    where.OR = [
      { fullName: { contains: q.search } },
      { description: { contains: q.search } },
      { name: { contains: q.search } },
    ];
  }
  if (q.verdict) where.verdict = q.verdict;
  if (q.license) where.license = { contains: q.license };
  if (q.difficulty) where.difficulty = q.difficulty;
  if (q.gpu === "true") where.gpuRequired = true;
  if (q.gpu === "false") where.gpuRequired = false;
  if (q.commercialRisk) where.commercialUseStatus = q.commercialRisk;

  const orderBy: Prisma.RepositoryOrderByWithRelationInput =
    q.sort === "stars"
      ? { stars: "desc" }
      : q.sort === "healthScore"
        ? { healthScore: "desc" }
        : q.sort === "usefulnessScore"
          ? { usefulnessScore: "desc" }
          : q.sort === "updatedAtGithub"
            ? { updatedAtGithub: "desc" }
            : { finalPriorityScore: "desc" };

  const repos = await db.repository.findMany({
    where,
    orderBy,
    take: q.limit ?? 50,
    include: { _count: { select: { analyses: true } } },
  });

  return ok({ repos, count: repos.length });
});
