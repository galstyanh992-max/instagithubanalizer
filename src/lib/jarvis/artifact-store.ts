
import { db } from '@/lib/db'
import type { Artifact, ArtifactType } from './types';

export interface CreateArtifactInput {
  runId: string;
  taskId?: string;
  agentId?: string;
  type: ArtifactType;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  fileRefs?: string[];
}

export interface ArtifactFilter {
  runId: string;
  taskId?: string;
  agentId?: string;
  type?: ArtifactType;
}

// ─── Artifact Store ──────────────────────────────────────────

export async function createArtifact(input: CreateArtifactInput): Promise<Artifact> {
  const artifact = await db.artifact.create({
    data: {
      runId: input.runId,
      agentId: input.agentId,
      type: input.type,
      title: input.title,
      content: input.content,
      metadata: JSON.stringify(input.metadata ?? {}),
      fileRefs: JSON.stringify(input.fileRefs ?? []),
    },
  });

  return mapDbArtifact(artifact);
}

export async function listArtifacts(filter: ArtifactFilter): Promise<Artifact[]> {
  const artifacts = await db.artifact.findMany({
    where: {
      runId: filter.runId,
      ...(filter.agentId ? { agentId: filter.agentId } : {}),
      ...(filter.type ? { type: filter.type } : {}),
    },
    orderBy: { createdAt: 'asc' },
  });

  return artifacts.map(mapDbArtifact);
}

export async function getArtifact(artifactId: string): Promise<Artifact | null> {
  const artifact = await db.artifact.findUnique({
    where: { id: artifactId },
  });
  if (!artifact) return null;
  return mapDbArtifact(artifact);
}

export async function updateArtifact(
  artifactId: string,
  updates: Partial<Pick<Artifact, 'title' | 'content' | 'metadata' | 'fileRefs'>>
): Promise<Artifact> {
  const artifact = await db.artifact.update({
    where: { id: artifactId },
    data: {
      ...(updates.title !== undefined ? { title: updates.title } : {}),
      ...(updates.content !== undefined ? { content: updates.content } : {}),
      ...(updates.metadata !== undefined ? { metadata: JSON.stringify(updates.metadata) } : {}),
      ...(updates.fileRefs !== undefined ? { fileRefs: JSON.stringify(updates.fileRefs) } : {}),
    },
  });

  return mapDbArtifact(artifact);
}

export async function deleteArtifact(artifactId: string): Promise<void> {
  await db.artifact.delete({ where: { id: artifactId } });
}

// ─── Mapper ──────────────────────────────────────────────────

function mapDbArtifact(
  dbArtifact: Awaited<ReturnType<typeof db.artifact.create>>
): Artifact {
  return {
    id: dbArtifact.id,
    runId: dbArtifact.runId,
    agentId: dbArtifact.agentId ?? undefined,
    type: dbArtifact.type as ArtifactType,
    title: dbArtifact.title,
    content: dbArtifact.content,
    metadata: JSON.parse(dbArtifact.metadata) as Record<string, unknown>,
    fileRefs: JSON.parse(dbArtifact.fileRefs) as string[],
    createdAt: dbArtifact.createdAt,
  };
}

