-- CreateTable
CREATE TABLE "WorkerSession" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "workspaceRoot" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "exitCode" INTEGER,
    "patchId" TEXT,
    "stdout" TEXT,
    "stderr" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerPatch" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "diffContent" TEXT NOT NULL,
    "changedFiles" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "securityFlags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerPatch_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WorkerPatch" ADD CONSTRAINT "WorkerPatch_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkerSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
