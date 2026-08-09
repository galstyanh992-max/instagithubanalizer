-- JARVIS Phase C: owner-scoped capability-intelligence metadata.
-- Raw prompts, outputs, messages, repository source and credentials are prohibited.

CREATE TABLE "capability_repository_records" (
  "id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "repository" TEXT NOT NULL,
  "lifecycle" TEXT NOT NULL DEFAULT 'UNVERIFIED', "tier" TEXT NOT NULL, "capabilities" TEXT NOT NULL DEFAULT '[]',
  "integrationMode" TEXT NOT NULL, "license" TEXT NOT NULL DEFAULT 'UNKNOWN', "licensePolicy" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "sourceCommit" TEXT, "artifactDigest" TEXT, "metadata" TEXT NOT NULL DEFAULT '{}', "lastVerifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "capability_repository_records_ownerUserId_repository_key" ON "capability_repository_records"("ownerUserId","repository");
CREATE INDEX "capability_repository_records_ownerUserId_lifecycle_idx" ON "capability_repository_records"("ownerUserId","lifecycle");

CREATE TABLE "repository_curator_assessments" (
  "id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "repository" TEXT NOT NULL,
  "verdict" TEXT NOT NULL, "risk" TEXT NOT NULL, "licensePolicy" TEXT NOT NULL,
  "findingClasses" TEXT NOT NULL DEFAULT '[]', "stagedRef" TEXT, "sourceCommit" TEXT, "artifactDigest" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "repository_curator_assessments_ownerUserId_verdict_createdAt_idx" ON "repository_curator_assessments"("ownerUserId","verdict","createdAt");

CREATE TABLE "capability_execution_feedback" (
  "id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "capabilityId" TEXT NOT NULL,
  "taskClass" TEXT NOT NULL, "success" BOOLEAN NOT NULL, "durationMs" INTEGER NOT NULL,
  "failureClass" TEXT, "operationalMeta" TEXT NOT NULL DEFAULT '{}', "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "capability_execution_feedback_owner_capability_task_time_idx" ON "capability_execution_feedback"("ownerUserId","capabilityId","taskClass","occurredAt");

CREATE TABLE "capability_routing_decisions" (
  "id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "taskClass" TEXT NOT NULL,
  "requiredCapabilities" TEXT NOT NULL DEFAULT '[]', "selectedId" TEXT, "fallbackChain" TEXT NOT NULL DEFAULT '[]',
  "factorScores" TEXT NOT NULL DEFAULT '{}', "status" TEXT NOT NULL DEFAULT 'planned',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "capability_routing_decisions_ownerUserId_taskClass_createdAt_idx" ON "capability_routing_decisions"("ownerUserId","taskClass","createdAt");

DO $phase_c_rls$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'capability_repository_records','repository_curator_assessments',
    'capability_execution_feedback','capability_routing_decisions'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING ((select auth.uid())::text = "ownerUserId") WITH CHECK ((select auth.uid())::text = "ownerUserId")',
      'owner_all_' || table_name, table_name
    );
  END LOOP;
END
$phase_c_rls$;
