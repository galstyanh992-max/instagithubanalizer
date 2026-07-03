import { db } from "@/lib/db";
import { ok, safe } from "@/lib/api";

export const GET = safe(async () => {
  // Group repos by primary language as a proxy for categories
  const repos = await db.repository.findMany({
    select: { primaryLanguage: true },
  });
  const counts = new Map<string, number>();
  for (const r of repos) {
    const lang = r.primaryLanguage || "Other";
    counts.set(lang, (counts.get(lang) ?? 0) + 1);
  }
  const categories = Array.from(counts.entries()).map(([name, count]) => ({
    id: name,
    name,
    slug: name.toLowerCase().replace(/\W+/g, "-"),
    count,
  }));
  return ok({ categories });
});
