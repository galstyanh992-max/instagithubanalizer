-- Durable queue for JSON/JSONL repository imports.
CREATE TABLE "RepositoryImportBatch" (
    "id" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "originalName" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'queued',
    "total" INTEGER NOT NULL,
    "completed" INTEGER NOT NULL DEFAULT 0,
    "succeeded" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "RepositoryImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RepositoryImportItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "repositoryId" TEXT,
    "verdict" TEXT,
    "finalPriorityScore" INTEGER,
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "RepositoryImportItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RepositoryImportItem_batchId_ref_key" ON "RepositoryImportItem"("batchId", "ref");
CREATE INDEX "RepositoryImportBatch_status_createdAt_idx" ON "RepositoryImportBatch"("status", "createdAt");
CREATE INDEX "RepositoryImportItem_batchId_status_idx" ON "RepositoryImportItem"("batchId", "status");

ALTER TABLE "RepositoryImportItem"
  ADD CONSTRAINT "RepositoryImportItem_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "RepositoryImportBatch"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
