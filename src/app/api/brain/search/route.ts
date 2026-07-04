import { ok, safe } from "@/lib/api";
import { searchBrainEntries } from "@/lib/project-brain/project-brain-service";

export const GET = safe(async (req: Request) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const limit = url.searchParams.get("limit");
  try {
    const entries = await searchBrainEntries(q, limit ? Number(limit) : 20);
    return ok({ entries, count: entries.length });
  } catch {
    return ok({ entries: [], count: 0, fallbackUsed: true });
  }
});
