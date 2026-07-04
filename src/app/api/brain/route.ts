import { ok, err, safe, parseJson } from "@/lib/api";
import { z } from "zod";
import { recordBrainEntry, listRecentBrainEntries } from "@/lib/project-brain/project-brain-service";

const createSchema = z.object({
  type: z.enum([
    "user_command", "router_decision", "safety_decision", "approval_event",
    "action_result", "error", "user_preference", "project_decision",
    "daily_note", "research_note", "api_reference", "tool_reference", "agent_reference",
  ]),
  title: z.string().min(1),
  content: z.string().default(""),
  tags: z.array(z.string()).optional(),
  importance: z.enum(["low", "medium", "high", "critical"]).optional(),
  sensitive: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const GET = safe(async (req: Request) => {
  const url = new URL(req.url);
  const limit = url.searchParams.get("limit");
  try {
    const entries = await listRecentBrainEntries(limit ? Number(limit) : 20);
    return ok({ entries, count: entries.length });
  } catch {
    return ok({ entries: [], count: 0, fallbackUsed: true, message: "Brain недоступен (нет БД)." });
  }
});

export const POST = safe(async (req: Request) => {
  const body = await parseJson(req);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return err("invalid brain entry", 400, { issues: parsed.error.flatten() });
  const entry = await recordBrainEntry(parsed.data);
  if (!entry) return err("brain record failed", 503);
  // Never echo sensitive content back.
  return ok({ id: entry.id, type: entry.type, title: entry.title, sensitive: entry.sensitive, createdAt: entry.createdAt });
});
