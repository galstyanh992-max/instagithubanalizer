// AI Jarwisyan — Memory Service
// CRUD для MemoryRecord + поиск + релевантная память

import { db } from "@/lib/db";

export type MemoryKind =
  | "project" | "repository" | "user_preference" | "decision"
  | "integration_plan" | "error_solution" | "command" | "voice_note" | "note" | "external_doc";

export interface MemoryRecordInput {
  kind: MemoryKind;
  title: string;
  content: string;
  source?: string;
  projectId?: string;
  repositoryId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  sensitive?: boolean;
}

export interface MemorySearchParams {
  query?: string;
  kind?: MemoryKind;
  projectId?: string;
  repositoryId?: string;
  limit?: number;
}

function parseArr(s: string | null | undefined): string[] {
  if (!s) return [];
  try { return JSON.parse(s) as string[]; } catch { return []; }
}

export const memoryService = {
  async list(params?: MemorySearchParams) {
    const where: Record<string, unknown> = {};
    if (params?.kind) where.kind = params.kind;
    if (params?.projectId) where.projectId = params.projectId;
    if (params?.repositoryId) where.repositoryId = params.repositoryId;
    if (params?.query) {
      where.OR = [
        { title: { contains: params.query } },
        { content: { contains: params.query } },
      ];
    }
    return db.memoryRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: params?.limit ?? 100,
    });
  },

  async get(id: string) {
    return db.memoryRecord.findUnique({ where: { id } });
  },

  async create(input: MemoryRecordInput) {
    return db.memoryRecord.create({
      data: {
        kind: input.kind,
        title: input.title,
        content: input.content,
        source: input.source ?? "manual",
        projectId: input.projectId,
        repositoryId: input.repositoryId,
        tags: JSON.stringify(input.tags ?? []),
        metadata: JSON.stringify(input.metadata ?? {}),
        sensitive: input.sensitive ?? false,
      },
    });
  },

  async update(id: string, input: Partial<MemoryRecordInput>) {
    const data: Record<string, unknown> = {};
    if (input.kind !== undefined) data.kind = input.kind;
    if (input.title !== undefined) data.title = input.title;
    if (input.content !== undefined) data.content = input.content;
    if (input.source !== undefined) data.source = input.source;
    if (input.projectId !== undefined) data.projectId = input.projectId;
    if (input.repositoryId !== undefined) data.repositoryId = input.repositoryId;
    if (input.tags !== undefined) data.tags = JSON.stringify(input.tags);
    if (input.metadata !== undefined) data.metadata = JSON.stringify(input.metadata);
    if (input.sensitive !== undefined) data.sensitive = input.sensitive;
    return db.memoryRecord.update({ where: { id }, data });
  },

  async remove(id: string) {
    return db.memoryRecord.delete({ where: { id } });
  },

  // Keyword search — fallback для embedding-based retrieval
  async search(params: MemorySearchParams) {
    return this.list(params);
  },

  // Retrieve relevant memory — используется перед AI вызовом
  async retrieveRelevant(input: {
    query: string;
    projectId?: string;
    repositoryId?: string;
    limit?: number;
  }) {
    const limit = input.limit ?? 10;
    // Прост keyword search
    const keywords = input.query.toLowerCase().split(/\W+/).filter((w) => w.length > 2).slice(0, 5);
    if (keywords.length === 0) return [];

    const records = await db.memoryRecord.findMany({
      where: {
        sensitive: false, // Не отправляем sensitive память в AI
        ...(input.projectId ? { projectId: input.projectId } : {}),
        ...(input.repositoryId ? { repositoryId: input.repositoryId } : {}),
        OR: keywords.map((kw) => [
          { title: { contains: kw } },
          { content: { contains: kw } },
        ]).flat(),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return records;
  },

  // Список vault sources
  async listSources() {
    return db.knowledgeVaultSource.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  async createSource(input: {
    name: string;
    type: string;
    localPath?: string;
    githubUrl?: string;
    syncMode?: string;
  }) {
    return db.knowledgeVaultSource.create({
      data: {
        name: input.name,
        type: input.type,
        localPath: input.localPath ?? "",
        githubUrl: input.githubUrl ?? "",
        syncMode: input.syncMode ?? "manual",
      },
    });
  },

  async removeSource(id: string) {
    return db.knowledgeVaultSource.delete({ where: { id } });
  },
};
