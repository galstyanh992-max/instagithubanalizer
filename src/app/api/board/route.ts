import { db } from "@/lib/db";
import { ok, safe } from "@/lib/api";

export const GET = safe(async () => {
  const verdicts = ["USE_NOW", "TEST", "SAVE", "SKIP"] as const;
  const columns = await Promise.all(
    verdicts.map(async (v) => {
      const repos = await db.repository.findMany({
        where: { verdict: v },
        orderBy: { finalPriorityScore: "desc" },
        select: {
          id: true,
          fullName: true,
          description: true,
          finalPriorityScore: true,
          stars: true,
          verdict: true,
          primaryLanguage: true,
        },
      });
      return { verdict: v, repos };
    })
  );
  return ok({ columns });
});
