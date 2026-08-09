-- JARVIS Phase B: single-owner control-plane metadata only.
-- No provider tokens, message bodies, SIP credentials, or full n8n execution data.

CREATE TABLE "social_accounts" (
  "id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "provider" TEXT NOT NULL,
  "externalAccountId" TEXT NOT NULL, "displayName" TEXT, "status" TEXT NOT NULL DEFAULT 'not_configured',
  "metadata" TEXT NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "social_accounts_ownerUserId_provider_externalAccountId_key" ON "social_accounts"("ownerUserId","provider","externalAccountId");
CREATE INDEX "social_accounts_ownerUserId_status_idx" ON "social_accounts"("ownerUserId","status");

CREATE TABLE "social_competitors" (
  "id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "platform" TEXT NOT NULL,
  "externalRef" TEXT NOT NULL, "label" TEXT NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT true,
  "metadata" TEXT NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "social_competitors_ownerUserId_platform_externalRef_key" ON "social_competitors"("ownerUserId","platform","externalRef");
CREATE INDEX "social_competitors_ownerUserId_enabled_idx" ON "social_competitors"("ownerUserId","enabled");

CREATE TABLE "social_sources" (
  "id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "kind" TEXT NOT NULL,
  "externalRef" TEXT NOT NULL, "label" TEXT, "status" TEXT NOT NULL DEFAULT 'active',
  "metadata" TEXT NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "social_sources_ownerUserId_kind_externalRef_key" ON "social_sources"("ownerUserId","kind","externalRef");
CREATE INDEX "social_sources_ownerUserId_status_idx" ON "social_sources"("ownerUserId","status");

CREATE TABLE "content_ideas" (
  "id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "topic" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'idea', "sourceRefs" TEXT NOT NULL DEFAULT '[]', "metadata" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "content_ideas_ownerUserId_status_idx" ON "content_ideas"("ownerUserId","status");

CREATE TABLE "content_drafts" (
  "id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "platform" TEXT NOT NULL,
  "title" TEXT NOT NULL, "body" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'draft',
  "approvalRequestId" TEXT, "published" BOOLEAN NOT NULL DEFAULT false, "metadata" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "content_drafts_ownerUserId_status_idx" ON "content_drafts"("ownerUserId","status");
CREATE INDEX "content_drafts_approvalRequestId_idx" ON "content_drafts"("approvalRequestId");

CREATE TABLE "content_assets" (
  "id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "draftId" TEXT, "kind" TEXT NOT NULL,
  "storageRef" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'ready', "metadata" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "content_assets_ownerUserId_status_idx" ON "content_assets"("ownerUserId","status");
CREATE INDEX "content_assets_draftId_idx" ON "content_assets"("draftId");

CREATE TABLE "publication_jobs" (
  "id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "draftId" TEXT NOT NULL, "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'approval_required', "approvalRequestId" TEXT, "externalJobRef" TEXT,
  "scheduledAt" TIMESTAMP(3), "lastError" TEXT, "metadata" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "publication_jobs_ownerUserId_status_idx" ON "publication_jobs"("ownerUserId","status");
CREATE INDEX "publication_jobs_draftId_idx" ON "publication_jobs"("draftId");

CREATE TABLE "social_metrics" (
  "id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "provider" TEXT NOT NULL,
  "entityRef" TEXT NOT NULL, "metric" TEXT NOT NULL, "value" DOUBLE PRECISION NOT NULL,
  "measuredAt" TIMESTAMP(3) NOT NULL, "metadata" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "social_metrics_ownerUserId_provider_measuredAt_idx" ON "social_metrics"("ownerUserId","provider","measuredAt");

CREATE TABLE "message_accounts" (
  "id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "provider" TEXT NOT NULL,
  "externalAccountId" TEXT NOT NULL, "displayName" TEXT, "status" TEXT NOT NULL DEFAULT 'not_configured',
  "metadata" TEXT NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "message_accounts_ownerUserId_provider_externalAccountId_key" ON "message_accounts"("ownerUserId","provider","externalAccountId");
CREATE INDEX "message_accounts_ownerUserId_status_idx" ON "message_accounts"("ownerUserId","status");

CREATE TABLE "messages" (
  "id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "provider" TEXT NOT NULL,
  "conversationRef" TEXT NOT NULL, "externalMessageId" TEXT NOT NULL, "direction" TEXT NOT NULL,
  "classification" TEXT, "status" TEXT NOT NULL DEFAULT 'received', "metadata" TEXT NOT NULL DEFAULT '{}',
  "occurredAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "messages_ownerUserId_provider_externalMessageId_key" ON "messages"("ownerUserId","provider","externalMessageId");
CREATE INDEX "messages_ownerUserId_conversationRef_occurredAt_idx" ON "messages"("ownerUserId","conversationRef","occurredAt");

CREATE TABLE "message_attachments" (
  "id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "messageRef" TEXT NOT NULL,
  "externalRef" TEXT NOT NULL, "mediaType" TEXT, "safetyStatus" TEXT NOT NULL DEFAULT 'unknown',
  "metadata" TEXT NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "message_attachments_ownerUserId_messageRef_idx" ON "message_attachments"("ownerUserId","messageRef");

CREATE TABLE "message_events" (
  "id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "messageRef" TEXT,
  "type" TEXT NOT NULL, "payload" TEXT NOT NULL DEFAULT '{}', "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "message_events_ownerUserId_type_occurredAt_idx" ON "message_events"("ownerUserId","type","occurredAt");

CREATE TABLE "message_escalations" (
  "id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "messageRef" TEXT NOT NULL,
  "reason" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'pending', "approvalRequestId" TEXT,
  "metadata" TEXT NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "message_escalations_ownerUserId_status_idx" ON "message_escalations"("ownerUserId","status");

CREATE TABLE "call_sessions" (
  "id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "provider" TEXT NOT NULL,
  "externalSessionId" TEXT, "mode" TEXT NOT NULL DEFAULT 'local', "status" TEXT NOT NULL DEFAULT 'created',
  "approvalRequestId" TEXT, "metadata" TEXT NOT NULL DEFAULT '{}', "startedAt" TIMESTAMP(3), "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "call_sessions_ownerUserId_status_idx" ON "call_sessions"("ownerUserId","status");

CREATE TABLE "call_events" (
  "id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "sessionId" TEXT NOT NULL,
  "type" TEXT NOT NULL, "payload" TEXT NOT NULL DEFAULT '{}', "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "call_events_ownerUserId_sessionId_occurredAt_idx" ON "call_events"("ownerUserId","sessionId","occurredAt");

CREATE TABLE "call_transcripts" (
  "id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "sessionId" TEXT NOT NULL,
  "contentRef" TEXT NOT NULL, "redactedPreview" TEXT, "privacyClass" TEXT NOT NULL DEFAULT 'sensitive',
  "metadata" TEXT NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "call_transcripts_ownerUserId_sessionId_idx" ON "call_transcripts"("ownerUserId","sessionId");

CREATE TABLE "call_summaries" (
  "id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "sessionId" TEXT NOT NULL,
  "summary" TEXT NOT NULL, "actionItems" TEXT NOT NULL DEFAULT '[]', "metadata" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "call_summaries_ownerUserId_sessionId_idx" ON "call_summaries"("ownerUserId","sessionId");

CREATE TABLE "automation_workflow_refs" (
  "id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "provider" TEXT NOT NULL DEFAULT 'n8n',
  "externalWorkflowId" TEXT NOT NULL, "name" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'registered',
  "taskId" TEXT, "lastResult" TEXT, "lastError" TEXT, "metadata" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "automation_workflow_refs_ownerUserId_provider_externalWorkflowId_key" ON "automation_workflow_refs"("ownerUserId","provider","externalWorkflowId");
CREATE INDEX "automation_workflow_refs_ownerUserId_status_idx" ON "automation_workflow_refs"("ownerUserId","status");

CREATE TABLE "automation_run_refs" (
  "id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "workflowRefId" TEXT NOT NULL,
  "externalRunId" TEXT, "status" TEXT NOT NULL, "taskId" TEXT, "lastResult" TEXT, "lastError" TEXT,
  "startedAt" TIMESTAMP(3), "finishedAt" TIMESTAMP(3), "metadata" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "automation_run_refs_ownerUserId_status_idx" ON "automation_run_refs"("ownerUserId","status");
CREATE INDEX "automation_run_refs_workflowRefId_idx" ON "automation_run_refs"("workflowRefId");

-- Existing public.conversations and public.conversation_messages remain the canonical
-- CRM conversation models; Phase B stores only external provider references in messages.
DO $phase_b_rls$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'social_accounts','social_competitors','social_sources','content_ideas','content_drafts','content_assets',
    'publication_jobs','social_metrics','message_accounts','messages','message_attachments','message_events',
    'message_escalations','call_sessions','call_events','call_transcripts','call_summaries',
    'automation_workflow_refs','automation_run_refs'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING ((select auth.uid())::text = "ownerUserId") WITH CHECK ((select auth.uid())::text = "ownerUserId")',
      'owner_all_' || table_name, table_name
    );
  END LOOP;
END
$phase_b_rls$;
