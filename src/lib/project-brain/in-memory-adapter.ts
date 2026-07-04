import type { BrainAdapter, BrainEntry, BrainEntryInput } from "./types";

let SEQ = 0;

/** DB-free adapter. Used in tests and when no DATABASE_URL is available. */
export class InMemoryBrainAdapter implements BrainAdapter {
  private store: BrainEntry[] = [];

  async save(input: BrainEntryInput): Promise<BrainEntry> {
    const entry: BrainEntry = {
      id: `mem-${++SEQ}`,
      type: input.type,
      title: input.title,
      content: input.content,
      tags: input.tags ?? [],
      sensitive: input.sensitive ?? false,
      metadata: input.metadata ?? {},
      createdAt: new Date().toISOString(),
    };
    this.store.unshift(entry);
    return entry;
  }

  async list(limit: number): Promise<BrainEntry[]> {
    return this.store.slice(0, limit);
  }

  async search(query: string, limit: number): Promise<BrainEntry[]> {
    const q = query.toLowerCase();
    return this.store
      .filter((e) => e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q))
      .slice(0, limit);
  }

  reset() {
    this.store = [];
  }
}
