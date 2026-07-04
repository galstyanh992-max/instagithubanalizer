import type { BrainAdapter, BrainEntry, BrainEntryInput, BrainEntryType } from "./types";

// Map brain type → MemoryRecord.kind (reuses existing model, no migration).
function toKind(t: BrainEntryType): string {
  switch (t) {
    case "user_preference": return "user_preference";
    case "project_decision": return "decision";
    case "user_command": return "command";
    case "error": return "error_solution";
    case "daily_note":
    case "research_note": return "note";
    case "api_reference":
    case "tool_reference":
    case "agent_reference": return "external_doc";
    default: return "note";
  }
}

function rowToEntry(r: {
  id: string; kind: string; title: string; content: string;
  tags: string; metadata: string; sensitive: boolean; createdAt: Date;
}): BrainEntry {
  let meta: Record<string, unknown> = {};
  let tags: string[] = [];
  try { meta = JSON.parse(r.metadata || "{}"); } catch { meta = {}; }
  try { tags = JSON.parse(r.tags || "[]"); } catch { tags = []; }
  const type = (meta.__brainType as BrainEntryType) || "daily_note";
  return {
    id: r.id, type, title: r.title, content: r.content,
    tags, sensitive: r.sensitive, metadata: meta, createdAt: r.createdAt.toISOString(),
  };
}

/** Prisma adapter. Requires runtime DB — falls back to throwing on unavailable. */
export class PrismaBrainAdapter implements BrainAdapter {
  async save(input: BrainEntryInput): Promise<BrainEntry> {
    const { db } = await import("@/lib/db");
    const metadata = {
      ...(input.metadata ?? {}),
      __brainType: input.type,
      actorId: input.actorId,
      actorRole: input.actorRole,
      actorSource: input.actorSource,
      workspaceId: input.workspaceId,
      agentId: input.agentId,
      importance: input.importance ?? "medium",
    };
    const row = await db.memoryRecord.create({
      data: {
        kind: toKind(input.type),
        title: input.title,
        content: input.content,
        source: input.actorSource === "voice" ? "voice" : "system",
        projectId: input.projectId ?? null,
        tags: JSON.stringify(input.tags ?? []),
        metadata: JSON.stringify(metadata),
        sensitive: input.sensitive ?? false,
      },
    });
    return rowToEntry(row);
  }

  async list(limit: number): Promise<BrainEntry[]> {
    const { db } = await import("@/lib/db");
    const rows = await db.memoryRecord.findMany({ orderBy: { createdAt: "desc" }, take: limit });
    return rows.map(rowToEntry);
  }

  async search(query: string, limit: number): Promise<BrainEntry[]> {
    const { db } = await import("@/lib/db");
    const rows = await db.memoryRecord.findMany({
      where: { OR: [{ title: { contains: query } }, { content: { contains: query } }] },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(rowToEntry);
  }
}
