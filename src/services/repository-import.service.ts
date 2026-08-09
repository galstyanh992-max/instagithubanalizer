import "server-only";

import { db } from "@/lib/db";
import { analyzeRepoPipeline } from "@/lib/pipeline";
import { duplicateService } from "@/services/duplicate.service";

const MAX_CONCURRENT_ANALYSES = 2;
const activeBatches = new Set<string>();

export type ImportItemSnapshot = {
  id: string;
  ref: string;
  status: string;
  repositoryId: string | null;
  verdict: string | null;
  finalPriorityScore: number | null;
  error: string;
};

function snapshotItem(item: {
  id: string;
  ref: string;
  status: string;
  repositoryId: string | null;
  verdict: string | null;
  finalPriorityScore: number | null;
  errorMessage: string;
}): ImportItemSnapshot {
  return {
    id: item.id,
    ref: item.ref,
    status: item.status,
    repositoryId: item.repositoryId,
    verdict: item.verdict,
    finalPriorityScore: item.finalPriorityScore,
    error: item.errorMessage,
  };
}

export async function createRepositoryImportBatch(input: {
  storageUrl: string;
  originalName: string;
  refs: string[];
}) {
  return db.repositoryImportBatch.create({
    data: {
      storageUrl: input.storageUrl,
      originalName: input.originalName,
      total: input.refs.length,
      items: { create: input.refs.map((ref) => ({ ref })) },
    },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
}

async function incrementBatch(batchId: string, succeeded: boolean) {
  await db.repositoryImportBatch.update({
    where: { id: batchId },
    data: {
      completed: { increment: 1 },
      ...(succeeded ? { succeeded: { increment: 1 } } : { failed: { increment: 1 } }),
    },
  });
}

async function processItem(batchId: string, itemId: string, ref: string) {
  // A dismissed/cancelled action must never be resurrected by a worker that
  // already had it in memory.
  const claim = await db.repositoryImportItem.updateMany({
    where: { id: itemId, batchId, status: "pending" },
    data: { status: "analyzing", startedAt: new Date(), errorMessage: "" },
  });
  if (claim.count === 0) return;

  try {
    // Import refs are already normalized as owner/repo. Resolve an existing
    // record before any GitHub, translation, or provider request.
    const existing = await duplicateService.findDuplicate(ref);
    const result = existing
      ? {
          repositoryId: existing.id,
          verdict: existing.verdict,
          finalPriorityScore: existing.finalPriorityScore,
        }
      : await analyzeRepoPipeline(ref, { force: false });
    await db.repositoryImportItem.update({
      where: { id: itemId },
      data: {
        status: "done",
        repositoryId: result.repositoryId,
        verdict: result.verdict,
        finalPriorityScore: result.finalPriorityScore,
        finishedAt: new Date(),
      },
    });
    await incrementBatch(batchId, true);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.repositoryImportItem.update({
      where: { id: itemId },
      data: { status: "error", errorMessage: message.slice(0, 1000), finishedAt: new Date() },
    });
    await incrementBatch(batchId, false);
  }
}

async function runRepositoryImportBatch(batchId: string) {
  try {
    const staleBefore = new Date(Date.now() - 5 * 60_000);
    const batchClaim = await db.repositoryImportBatch.updateMany({
      where: {
        id: batchId,
        OR: [
          { status: "queued" },
          { status: "running", updatedAt: { lt: staleBefore } },
        ],
      },
      data: { status: "running", errorMessage: "", finishedAt: null },
    });
    if (batchClaim.count === 0) return;

    // Resume only stale claims. A hot reload may create a new module instance
    // while the original worker is still active, so immediately resetting every
    // "analyzing" item would execute the same repository twice.
    await db.repositoryImportItem.updateMany({
      where: { batchId, status: "analyzing", startedAt: { lt: staleBefore } },
      data: { status: "pending", startedAt: null },
    });
    const items = await db.repositoryImportItem.findMany({
      where: { batchId, status: "pending" },
      select: { id: true, ref: true },
      orderBy: { createdAt: "asc" },
    });

    let next = 0;
    const worker = async () => {
      while (next < items.length) {
        const item = items[next++];
        await processItem(batchId, item.id, item.ref);
      }
    };
    await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT_ANALYSES, items.length) }, worker));

    const batch = await db.repositoryImportBatch.findUnique({
      where: { id: batchId },
      select: { total: true, items: { select: { status: true } } },
    });
    if (!batch) return;
    const succeeded = batch.items.filter((item) => item.status === "done").length;
    const failed = batch.items.filter((item) => item.status === "error").length;
    const completed = succeeded + failed;
    const stillActive = batch.items.some((item) => item.status === "pending" || item.status === "analyzing");
    await db.repositoryImportBatch.update({
      where: { id: batchId },
      data: {
        completed,
        succeeded,
        failed,
        status: stillActive ? "running" : failed > 0 ? "completed_with_errors" : "completed",
        finishedAt: stillActive ? null : new Date(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[repository-import] batch failed", { batchId, error: message });
    const retryable = /connection pool|timed out fetching a new connection|emaxconn/i.test(message);
    await db.repositoryImportBatch.update({
      where: { id: batchId },
      data: {
        status: retryable ? "queued" : "failed",
        errorMessage: message.slice(0, 1000),
        finishedAt: retryable ? null : new Date(),
      },
    }).catch(() => undefined);
  } finally {
    activeBatches.delete(batchId);
  }
}

/** Start work without holding the browser upload request open. */
export function startRepositoryImportBatch(batchId: string) {
  if (activeBatches.has(batchId)) return;
  activeBatches.add(batchId);
  queueMicrotask(() => void runRepositoryImportBatch(batchId));
}

export async function getRepositoryImportBatches(batchId?: string) {
  const where = batchId ? { id: batchId } : {};
  const batches = await db.repositoryImportBatch.findMany({
    where,
    include: { items: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: batchId ? 1 : 50,
  });
  for (const batch of batches) {
    if (batch.status === "queued" || batch.status === "running") startRepositoryImportBatch(batch.id);
  }
  return batches.map((batch) => ({
    id: batch.id,
    originalName: batch.originalName,
    status: batch.status,
    total: batch.total,
    completed: batch.completed,
    succeeded: batch.succeeded,
    failed: batch.failed,
    error: batch.errorMessage,
    createdAt: batch.createdAt,
    finishedAt: batch.finishedAt,
    items: batch.items.map(snapshotItem),
  }));
}
