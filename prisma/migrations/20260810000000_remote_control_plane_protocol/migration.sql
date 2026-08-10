-- JARVIS remote control-plane protocol (Vercel web + local Windows runtime).
-- Purely additive/nullable columns: no data loss, no backfill required, no regression
-- to existing single-device local execution.

-- Device: protocol version so the frontend/daemon can detect skew and show
-- "UPDATE REQUIRED" instead of a silent failure (spec: protocol versioning).
ALTER TABLE "devices" ADD COLUMN "protocolVersion" TEXT NOT NULL DEFAULT '1';

-- AgentTask: device targeting, lease expiry (dead-worker recovery), idempotency.
ALTER TABLE "agent_tasks" ADD COLUMN "targetDeviceId" TEXT;
ALTER TABLE "agent_tasks" ADD COLUMN "leaseExpiresAt" TIMESTAMP(3);
ALTER TABLE "agent_tasks" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "agent_tasks_idempotencyKey_key" ON "agent_tasks"("idempotencyKey");
CREATE INDEX "agent_tasks_targetDeviceId_idx" ON "agent_tasks"("targetDeviceId");
CREATE INDEX "agent_tasks_status_leaseExpiresAt_idx" ON "agent_tasks"("status", "leaseExpiresAt");
