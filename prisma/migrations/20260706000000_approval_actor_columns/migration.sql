-- Non-destructive: adds nullable columns only. Safe additive change.
-- NOT DEPLOYED in this phase (no live DATABASE_URL). Run via `prisma migrate deploy` when ready.
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "actorId" TEXT;
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "actorRole" TEXT;
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "actorSource" TEXT;
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "commandText" TEXT;
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "intent" TEXT;
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "reason" TEXT;
