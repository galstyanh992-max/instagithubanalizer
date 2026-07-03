import { db } from "@/lib/db";
import { ok, safe } from "@/lib/api";

export const GET = safe(async () => {
  const screenshots = await db.screenshot.findMany({
    include: { candidates: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return ok({ screenshots });
});
