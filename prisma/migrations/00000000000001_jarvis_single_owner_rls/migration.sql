-- JARVIS Clean Baseline RLS Security Migration

-- RLS for User (mapped to User)
ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_User" ON "public"."User"
  FOR ALL
  USING ( auth.uid()::text = "id" )
  WITH CHECK ( auth.uid()::text = "id" );

-- WARNING: Model UserTask lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."UserTask" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model Setting lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."Setting" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model Screenshot lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."Screenshot" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model ExtractedCandidate lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."ExtractedCandidate" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model Repository lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."Repository" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model RepositoryAnalysis lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."RepositoryAnalysis" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model InstallPlan lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."InstallPlan" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model AnalysisRun lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."AnalysisRun" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model WatchlistSnapshot lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."WatchlistSnapshot" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model ConnectedProject lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."ConnectedProject" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model RepositoryHealthSnapshot lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."RepositoryHealthSnapshot" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model IntegrationPlan lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."IntegrationPlan" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model MemoryRecord lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."MemoryRecord" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model KnowledgeVaultSource lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."KnowledgeVaultSource" ENABLE ROW LEVEL SECURITY;

-- RLS for Workspace (mapped to workspaces)
ALTER TABLE "public"."workspaces" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_Workspace" ON "public"."workspaces"
  FOR ALL
  USING ( auth.uid()::text = "ownerId" )
  WITH CHECK ( auth.uid()::text = "ownerId" );

-- RLS for Project (mapped to projects)
ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_Project" ON "public"."projects"
  FOR ALL
  USING ( auth.uid()::text = "ownerUserId" )
  WITH CHECK ( auth.uid()::text = "ownerUserId" );

-- WARNING: Model Agent lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."agents" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model AgentProfile lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."agent_profiles" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model AgentCapability lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."agent_capabilities" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model AgentModelConfig lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."agent_model_configs" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model AgentPermission lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."agent_permissions" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model AgentRuntimeState lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."agent_runtime_states" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model AgentMemoryLink lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."agent_memory_links" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model MemoryItem lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."memory_items" ENABLE ROW LEVEL SECURITY;

-- RLS for ApprovalRequest (mapped to approval_requests)
ALTER TABLE "public"."approval_requests" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_ApprovalRequest" ON "public"."approval_requests"
  FOR ALL
  USING ( auth.uid()::text = "ownerUserId" )
  WITH CHECK ( auth.uid()::text = "ownerUserId" );

-- WARNING: Model EventLog lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."event_logs" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model CostLog lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."cost_logs" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model Tool lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."tools" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model ToolExecution lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."tool_executions" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model ToolPermissionPolicy lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."tool_permission_policies" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model WorkflowTemplate lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."workflow_templates" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model Department lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model HandoffRecord lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."handoff_records" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model PromptTemplate lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."prompt_templates" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model PromptVersion lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."prompt_versions" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model PromptAuditLog lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."prompt_audit_logs" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model PromptRoleBinding lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."prompt_role_bindings" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model PromptCostLog lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."prompt_cost_logs" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model Artifact lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."artifacts" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model AgentExecution lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."agent_executions" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model AgentTask lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."agent_tasks" ENABLE ROW LEVEL SECURITY;

-- RLS for ChatAttachment (mapped to ChatAttachment)
ALTER TABLE "public"."ChatAttachment" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_ChatAttachment" ON "public"."ChatAttachment"
  FOR ALL
  USING ( auth.uid()::text = "ownerId" )
  WITH CHECK ( auth.uid()::text = "ownerId" );

-- WARNING: Model Checkpoint lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."checkpoints" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model CodexProviderSession lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."codex_provider_sessions" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model DecisionLog lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."decision_logs" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model Finding lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."findings" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model InfrastructureOperationStep lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."InfrastructureOperationStep" ENABLE ROW LEVEL SECURITY;

-- WARNING: Model InfrastructureOperation lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."InfrastructureOperation" ENABLE ROW LEVEL SECURITY;

-- RLS for OrchestrationRun (mapped to OrchestrationRun)
ALTER TABLE "public"."OrchestrationRun" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_OrchestrationRun" ON "public"."OrchestrationRun"
  FOR ALL
  USING ( auth.uid()::text = "user_id" )
  WITH CHECK ( auth.uid()::text = "user_id" );

-- WARNING: Model VerificationResult lacks an owner field. Defaulting to deny all.
ALTER TABLE "public"."verification_results" ENABLE ROW LEVEL SECURITY;

-- RLS for Device (mapped to devices)
ALTER TABLE "public"."devices" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_Device" ON "public"."devices"
  FOR ALL
  USING ( auth.uid()::text = "ownerUserId" )
  WITH CHECK ( auth.uid()::text = "ownerUserId" );

