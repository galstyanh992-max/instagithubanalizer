-- CreateTable
CREATE TABLE "execution_plans" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "ownerUserId" TEXT NOT NULL,
    "taskId" TEXT,
    "runId" TEXT,
    "deviceId" TEXT,
    "workerType" TEXT NOT NULL DEFAULT 'system',
    "capabilityIds" TEXT NOT NULL DEFAULT '[]',
    "riskLevel" TEXT NOT NULL DEFAULT 'R1_LOW',
    "workspaceRoot" TEXT NOT NULL,
    "limits" TEXT NOT NULL DEFAULT '{}',
    "fingerprint" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "execution_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_steps" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "executableId" TEXT NOT NULL,
    "args" TEXT NOT NULL DEFAULT '[]',
    "cwdRelative" TEXT NOT NULL DEFAULT '.',
    "environmentProfile" TEXT NOT NULL DEFAULT 'MINIMAL',
    "timeoutMs" INTEGER NOT NULL DEFAULT 30000,
    "expectedOutputs" TEXT NOT NULL DEFAULT '[]',
    "dependencies" TEXT NOT NULL DEFAULT '[]',
    "sequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "execution_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "executable_registry" (
    "id" TEXT NOT NULL,
    "resolvedPath" TEXT NOT NULL,
    "versionCommand" TEXT,
    "allowedArguments" TEXT NOT NULL DEFAULT '[]',
    "allowedCwdRoots" TEXT NOT NULL DEFAULT '[]',
    "environmentProfile" TEXT NOT NULL DEFAULT 'MINIMAL',
    "networkPolicy" TEXT NOT NULL DEFAULT 'DENIED',
    "maxRuntime" INTEGER NOT NULL DEFAULT 60000,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "executable_registry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "execution_plans_fingerprint_key" ON "execution_plans"("fingerprint");

-- CreateIndex
CREATE INDEX "execution_plans_taskId_idx" ON "execution_plans"("taskId");

-- CreateIndex
CREATE INDEX "execution_plans_runId_idx" ON "execution_plans"("runId");

-- CreateIndex
CREATE INDEX "execution_plans_ownerUserId_idx" ON "execution_plans"("ownerUserId");

-- CreateIndex
CREATE INDEX "execution_steps_planId_idx" ON "execution_steps"("planId");

-- AlterTable
ALTER TABLE "approval_requests" ADD COLUMN "planId" TEXT;

-- AddForeignKey
ALTER TABLE "execution_steps" ADD CONSTRAINT "execution_steps_planId_fkey" FOREIGN KEY ("planId") REFERENCES "execution_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_planId_fkey" FOREIGN KEY ("planId") REFERENCES "execution_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
