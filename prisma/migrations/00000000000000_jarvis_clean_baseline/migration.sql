-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "settings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "githubToken" TEXT NOT NULL DEFAULT '',
    "aiProvider" TEXT NOT NULL DEFAULT 'glm',
    "glmApiKey" TEXT NOT NULL DEFAULT '',
    "glmBaseUrl" TEXT NOT NULL DEFAULT 'https://api.z.ai/api',
    "ocrProvider" TEXT NOT NULL DEFAULT 'local',
    "ttsProvider" TEXT NOT NULL DEFAULT 'browser',
    "sttProvider" TEXT NOT NULL DEFAULT 'browser',
    "cpu" TEXT NOT NULL DEFAULT 'Intel Xeon E5-2699 v3 @ 2.30GHz',
    "ram" TEXT NOT NULL DEFAULT '64',
    "gpu" TEXT NOT NULL DEFAULT 'AMD Radeon RX 580 2048SP',
    "vram" TEXT NOT NULL DEFAULT '8',
    "os" TEXT NOT NULL DEFAULT 'Windows 11 Pro 23H2',
    "freeDiskGb" INTEGER NOT NULL DEFAULT 335,
    "dockerAvailable" BOOLEAN NOT NULL DEFAULT false,
    "pythonVersion" TEXT NOT NULL DEFAULT '',
    "nodeVersion" TEXT NOT NULL DEFAULT '',
    "gitAvailable" BOOLEAN NOT NULL DEFAULT true,
    "cudaAvailable" BOOLEAN NOT NULL DEFAULT false,
    "pcProfileName" TEXT NOT NULL DEFAULT 'Main Windows Workstation',
    "pcSystemType" TEXT NOT NULL DEFAULT '64-bit OS, x64-based processor',
    "pcCpuNotes" TEXT NOT NULL DEFAULT 'high-core-count Xeon workstation CPU',
    "pcStorageTotalGb" INTEGER NOT NULL DEFAULT 704,
    "pcStorageUsedGb" INTEGER NOT NULL DEFAULT 369,
    "pcCudaNotes" TEXT NOT NULL DEFAULT 'CUDA is not available because GPU is AMD Radeon RX 580, not NVIDIA.',
    "pcRocmAvailable" BOOLEAN NOT NULL DEFAULT false,
    "pcPreferredRunMode" TEXT NOT NULL DEFAULT 'local_or_docker_when_possible',
    "pcFallbackRunMode" TEXT NOT NULL DEFAULT 'ollama_cloud_if_local_not_possible',
    "cloudProvider" TEXT NOT NULL DEFAULT 'ollama_cloud',
    "allowedCloudProviders" TEXT NOT NULL DEFAULT 'ollama_cloud',
    "language" TEXT NOT NULL DEFAULT 'ru',
    "enable3d" BOOLEAN NOT NULL DEFAULT false,
    "reduceMotion" BOOLEAN NOT NULL DEFAULT false,
    "compactMode" BOOLEAN NOT NULL DEFAULT false,
    "neonIntensity" INTEGER NOT NULL DEFAULT 70,
    "voiceEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoSpeak" BOOLEAN NOT NULL DEFAULT false,
    "projectAgentOs" BOOLEAN NOT NULL DEFAULT true,
    "projectAiLegal" BOOLEAN NOT NULL DEFAULT true,
    "projectRagOcr" BOOLEAN NOT NULL DEFAULT true,
    "projectVideo" BOOLEAN NOT NULL DEFAULT true,
    "projectSaas" BOOLEAN NOT NULL DEFAULT true,
    "projectTrading" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "providerRoutes" TEXT NOT NULL DEFAULT '{}',
    "vercelToken" TEXT NOT NULL DEFAULT '',
    "supabaseAccessToken" TEXT NOT NULL DEFAULT '',
    "supabaseProjectUrl" TEXT NOT NULL DEFAULT '',
    "supabaseServiceRoleKey" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Screenshot" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'image/png',
    "extractedText" TEXT NOT NULL DEFAULT '',
    "confidenceAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "needsManualReview" BOOLEAN NOT NULL DEFAULT false,
    "sourceType" TEXT NOT NULL DEFAULT 'upload',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Screenshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractedCandidate" (
    "id" TEXT NOT NULL,
    "screenshotId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "candidateName" TEXT NOT NULL,
    "resolvedGithubUrl" TEXT NOT NULL DEFAULT '',
    "owner" TEXT NOT NULL DEFAULT '',
    "repo" TEXT NOT NULL DEFAULT '',
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "needsManualReview" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" TEXT NOT NULL DEFAULT 'auto',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractedCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "githubUrl" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "stars" INTEGER NOT NULL DEFAULT 0,
    "forks" INTEGER NOT NULL DEFAULT 0,
    "watchers" INTEGER NOT NULL DEFAULT 0,
    "openIssues" INTEGER NOT NULL DEFAULT 0,
    "license" TEXT NOT NULL DEFAULT 'unknown',
    "primaryLanguage" TEXT NOT NULL DEFAULT '',
    "topics" TEXT NOT NULL DEFAULT '[]',
    "createdAtGithub" TIMESTAMP(3),
    "updatedAtGithub" TIMESTAMP(3),
    "pushedAtGithub" TIMESTAMP(3),
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultBranch" TEXT NOT NULL DEFAULT 'main',
    "readmeText" TEXT NOT NULL DEFAULT '',
    "hasDocker" BOOLEAN NOT NULL DEFAULT false,
    "hasDockerCompose" BOOLEAN NOT NULL DEFAULT false,
    "hasPackageJson" BOOLEAN NOT NULL DEFAULT false,
    "hasRequirements" BOOLEAN NOT NULL DEFAULT false,
    "hasPyproject" BOOLEAN NOT NULL DEFAULT false,
    "hasEnvExample" BOOLEAN NOT NULL DEFAULT false,
    "localRunPossible" BOOLEAN NOT NULL DEFAULT true,
    "gpuRequired" BOOLEAN NOT NULL DEFAULT false,
    "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
    "usefulnessScore" INTEGER NOT NULL DEFAULT 0,
    "healthScore" INTEGER NOT NULL DEFAULT 0,
    "compatibilityScore" INTEGER NOT NULL DEFAULT 0,
    "commercialRiskScore" INTEGER NOT NULL DEFAULT 0,
    "agentOsScore" INTEGER NOT NULL DEFAULT 0,
    "aiLegalScore" INTEGER NOT NULL DEFAULT 0,
    "securityScore" INTEGER NOT NULL DEFAULT 0,
    "costScore" INTEGER NOT NULL DEFAULT 0,
    "finalPriorityScore" INTEGER NOT NULL DEFAULT 0,
    "verdict" TEXT NOT NULL DEFAULT 'TEST',
    "securityStatus" TEXT NOT NULL DEFAULT 'SAFE',
    "securityNotes" TEXT NOT NULL DEFAULT '[]',
    "commercialUseStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "commercialNotes" TEXT NOT NULL DEFAULT '',
    "costNotes" TEXT NOT NULL DEFAULT '',
    "isWatchlisted" BOOLEAN NOT NULL DEFAULT false,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepositoryAnalysis" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "problemSolved" TEXT NOT NULL DEFAULT '',
    "usefulness" TEXT NOT NULL DEFAULT '',
    "projectFit" TEXT NOT NULL DEFAULT '{}',
    "extractedIdeas" TEXT NOT NULL DEFAULT '[]',
    "risks" TEXT NOT NULL DEFAULT '[]',
    "testPlan" TEXT NOT NULL DEFAULT '{}',
    "localRunPlan" TEXT NOT NULL DEFAULT '{}',
    "securityReview" TEXT NOT NULL DEFAULT '',
    "commercialReview" TEXT NOT NULL DEFAULT '',
    "costReview" TEXT NOT NULL DEFAULT '',
    "finalRecommendation" TEXT NOT NULL DEFAULT '',
    "rawAiJson" TEXT NOT NULL DEFAULT '{}',
    "mock" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepositoryAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallPlan" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "prerequisites" TEXT NOT NULL DEFAULT '[]',
    "dockerCommands" TEXT NOT NULL DEFAULT '[]',
    "manualCommands" TEXT NOT NULL DEFAULT '[]',
    "envVars" TEXT NOT NULL DEFAULT '[]',
    "verificationSteps" TEXT NOT NULL DEFAULT '[]',
    "commonErrors" TEXT NOT NULL DEFAULT '[]',
    "cleanupSteps" TEXT NOT NULL DEFAULT '[]',
    "mock" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstallPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisRun" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "mode" TEXT NOT NULL DEFAULT 'live',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistSnapshot" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "starsDelta" INTEGER NOT NULL DEFAULT 0,
    "forksDelta" INTEGER NOT NULL DEFAULT 0,
    "issuesDelta" INTEGER NOT NULL DEFAULT 0,
    "newReleaseDetected" BOOLEAN NOT NULL DEFAULT false,
    "lastCommitDelta" TEXT NOT NULL DEFAULT '',
    "breakingChangesNote" TEXT NOT NULL DEFAULT '',
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectedProject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "localPath" TEXT NOT NULL DEFAULT '',
    "githubUrl" TEXT NOT NULL DEFAULT '',
    "techStack" TEXT NOT NULL DEFAULT '[]',
    "goals" TEXT NOT NULL DEFAULT '[]',
    "constraints" TEXT NOT NULL DEFAULT '[]',
    "importantFiles" TEXT NOT NULL DEFAULT '[]',
    "currentTasks" TEXT NOT NULL DEFAULT '[]',
    "integrationRules" TEXT NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectedProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepositoryHealthSnapshot" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "forks" INTEGER NOT NULL DEFAULT 0,
    "openIssues" INTEGER NOT NULL DEFAULT 0,
    "watchers" INTEGER NOT NULL DEFAULT 0,
    "latestRelease" TEXT NOT NULL DEFAULT '',
    "pushedAt" TIMESTAMP(3),
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepositoryHealthSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationPlan" (
    "id" TEXT NOT NULL,
    "connectedProjectId" TEXT NOT NULL,
    "repositoryId" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "usefulParts" TEXT NOT NULL DEFAULT '[]',
    "filesToInspect" TEXT NOT NULL DEFAULT '[]',
    "suggestedChanges" TEXT NOT NULL DEFAULT '[]',
    "reusableComponents" TEXT NOT NULL DEFAULT '[]',
    "apiPatterns" TEXT NOT NULL DEFAULT '[]',
    "agentWorkflowIdeas" TEXT NOT NULL DEFAULT '[]',
    "databasePatterns" TEXT NOT NULL DEFAULT '[]',
    "uiUxIdeas" TEXT NOT NULL DEFAULT '[]',
    "requiredDeps" TEXT NOT NULL DEFAULT '[]',
    "compatibilityConcerns" TEXT NOT NULL DEFAULT '[]',
    "risks" TEXT NOT NULL DEFAULT '[]',
    "implementationSteps" TEXT NOT NULL DEFAULT '[]',
    "doNotIntegrate" TEXT NOT NULL DEFAULT '[]',
    "estimatedEffort" TEXT NOT NULL DEFAULT 'MEDIUM',
    "finalRecommendation" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "mock" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryRecord" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "projectId" TEXT,
    "repositoryId" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "sensitive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeVaultSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "localPath" TEXT NOT NULL DEFAULT '',
    "githubUrl" TEXT NOT NULL DEFAULT '',
    "syncMode" TEXT NOT NULL DEFAULT 'manual',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeVaultSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'single',
    "monthlyBudgetUsd" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "spentThisMonth" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'local',
    "sourcePath" TEXT,
    "repoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "localRoot" TEXT,
    "ownerUserId" TEXT,
    "policyProfile" TEXT,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'permanent',
    "visualProfile" TEXT,
    "professionalStyle" TEXT,
    "systemPrompt" TEXT,
    "status" TEXT NOT NULL DEFAULT 'offline',
    "locationZone" TEXT NOT NULL DEFAULT 'lounge_area',
    "activeTaskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_profiles" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarKey" TEXT,
    "bio" TEXT,
    "seniority" TEXT NOT NULL DEFAULT 'senior',
    "workingStyle" TEXT,
    "strengths" TEXT,
    "limitations" TEXT,
    "responsibilities" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_capabilities" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "capabilityKey" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'intermediate',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_model_configs" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "preferenceType" TEXT NOT NULL DEFAULT 'preferred',
    "maxCostPerTask" DOUBLE PRECISION,
    "maxTokens" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_model_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_permissions" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "permissionLevel" TEXT NOT NULL DEFAULT 'none',
    "constraints" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_runtime_states" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'offline',
    "locationZone" TEXT NOT NULL DEFAULT 'lounge_area',
    "activeTaskId" TEXT,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentActivity" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_runtime_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_memory_links" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "memoryItemId" TEXT NOT NULL,
    "relevance" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_memory_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memory_items" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'workspace',
    "scopeId" TEXT,
    "workspaceId" TEXT,
    "projectId" TEXT,
    "agentId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "metadata" TEXT,
    "importance" TEXT NOT NULL DEFAULT 'medium',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "visibility" TEXT NOT NULL DEFAULT 'workspace',
    "conflictIds" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "agentId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "risk" TEXT NOT NULL DEFAULT 'medium',
    "payload" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "actorSource" TEXT,
    "commandText" TEXT,
    "intent" TEXT,
    "reason" TEXT,
    "actionFingerprint" TEXT,
    "consumedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "expectedSideEffect" TEXT,
    "expiresAt" TIMESTAMP(3),
    "ownerUserId" TEXT,
    "riskClass" TEXT,
    "rollbackSummary" TEXT,
    "target" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_logs" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "workspaceId" TEXT,
    "payload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_logs" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "tokensIn" INTEGER NOT NULL DEFAULT 0,
    "tokensOut" INTEGER NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tools" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "configSchema" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_executions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "agentId" TEXT,
    "toolId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "correlationId" TEXT,
    "inputSummary" TEXT,
    "inputFull" TEXT,
    "outputSummary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "approvalRequestId" TEXT,
    "errorMessage" TEXT,
    "metadata" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_permission_policies" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "requiredLevel" TEXT NOT NULL DEFAULT 'read',
    "constraints" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_permission_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "steps" TEXT NOT NULL,
    "category" TEXT,
    "icon" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "status" TEXT NOT NULL DEFAULT 'available',
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handoff_records" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "fromDepartment" TEXT NOT NULL,
    "toDepartment" TEXT NOT NULL,
    "triggerEvent" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "inputArtifacts" TEXT,
    "outputArtifacts" TEXT,
    "receivingAgentId" TEXT,
    "errors" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "handoff_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'system',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "targetAgentId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_versions" (
    "id" TEXT NOT NULL,
    "promptTemplateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "systemPrompt" TEXT,
    "developerPrompt" TEXT,
    "userPrompt" TEXT,
    "templateVariables" TEXT,
    "outputContract" TEXT,
    "providerAdapter" TEXT,
    "metadata" TEXT,
    "auditMetadata" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'draft',
    "createdByAgentId" TEXT,
    "updatedByAgentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_audit_logs" (
    "id" TEXT NOT NULL,
    "promptTemplateId" TEXT NOT NULL,
    "promptVersionId" TEXT,
    "action" TEXT NOT NULL,
    "agentId" TEXT,
    "agentRole" TEXT,
    "environment" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_role_bindings" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompt_role_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_cost_logs" (
    "id" TEXT NOT NULL,
    "promptTemplateId" TEXT,
    "promptVersionId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "tokensIn" INTEGER NOT NULL DEFAULT 0,
    "tokensOut" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "agentId" TEXT,
    "isDryRun" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_cost_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artifacts" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "agentId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "fileRefs" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_executions" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "request" TEXT NOT NULL,
    "result" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_tasks" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "agentId" TEXT,
    "role" TEXT NOT NULL,
    "toolKeys" TEXT NOT NULL DEFAULT '[]',
    "dependsOn" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "request" TEXT,
    "result" TEXT,
    "artifactIds" TEXT NOT NULL DEFAULT '[]',
    "findingIds" TEXT NOT NULL DEFAULT '[]',
    "checkpointId" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatAttachment" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "declaredMime" TEXT NOT NULL,
    "detectedMime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkpoints" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "taskStatuses" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codex_provider_sessions" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL DEFAULT 'codex-chatgpt-subscription',
    "cliVersion" TEXT,
    "authStatus" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "threadId" TEXT,
    "activeTurnId" TEXT,
    "model" TEXT,
    "reasoningEffort" TEXT,
    "cwd" TEXT,
    "lastEvent" TEXT,
    "failureSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "codex_provider_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_logs" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "alternatives" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "findings" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "evidence" TEXT NOT NULL,
    "rootCause" TEXT,
    "fixSummary" TEXT,
    "fixArtifactId" TEXT,
    "verificationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfrastructureOperationStep" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT NOT NULL DEFAULT '',
    "evidence" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfrastructureOperationStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfrastructureOperation" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "localPath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "requested" TEXT NOT NULL DEFAULT '{}',
    "approval" TEXT NOT NULL DEFAULT '{}',
    "compensation" TEXT NOT NULL DEFAULT '{}',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfrastructureOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrchestrationRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "projectId" TEXT,
    "user_id" TEXT,
    "goal" TEXT NOT NULL,
    "constraints" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "mode" TEXT NOT NULL DEFAULT 'balanced',
    "maxAgents" INTEGER NOT NULL DEFAULT 10,
    "maxTasks" INTEGER NOT NULL DEFAULT 50,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "timeoutMs" INTEGER NOT NULL DEFAULT 300000,
    "context" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "resumeLeaseOwner" TEXT,
    "resumeLeaseUntil" TIMESTAMP(3),

    CONSTRAINT "OrchestrationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_results" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "findings" TEXT NOT NULL DEFAULT '[]',
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "installationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "daemonVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'offline',
    "lastHeartbeatAt" TIMESTAMP(3),
    "capabilitiesSnapshot" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_fullName_key" ON "Repository"("fullName");

-- CreateIndex
CREATE INDEX "workspaces_ownerId_idx" ON "workspaces"("ownerId");

-- CreateIndex
CREATE INDEX "projects_workspaceId_idx" ON "projects"("workspaceId");

-- CreateIndex
CREATE INDEX "projects_workspaceId_status_idx" ON "projects"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "agents_workspaceId_idx" ON "agents"("workspaceId");

-- CreateIndex
CREATE INDEX "agents_workspaceId_status_idx" ON "agents"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "agents_workspaceId_role_idx" ON "agents"("workspaceId", "role");

-- CreateIndex
CREATE INDEX "agents_workspaceId_locationZone_idx" ON "agents"("workspaceId", "locationZone");

-- CreateIndex
CREATE INDEX "agents_status_idx" ON "agents"("status");

-- CreateIndex
CREATE INDEX "agents_role_idx" ON "agents"("role");

-- CreateIndex
CREATE UNIQUE INDEX "agent_profiles_agentId_key" ON "agent_profiles"("agentId");

-- CreateIndex
CREATE INDEX "agent_capabilities_agentId_idx" ON "agent_capabilities"("agentId");

-- CreateIndex
CREATE INDEX "agent_capabilities_capabilityKey_idx" ON "agent_capabilities"("capabilityKey");

-- CreateIndex
CREATE UNIQUE INDEX "agent_capabilities_agentId_capabilityKey_key" ON "agent_capabilities"("agentId", "capabilityKey");

-- CreateIndex
CREATE INDEX "agent_model_configs_agentId_idx" ON "agent_model_configs"("agentId");

-- CreateIndex
CREATE INDEX "agent_permissions_agentId_idx" ON "agent_permissions"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "agent_permissions_agentId_permissionKey_key" ON "agent_permissions"("agentId", "permissionKey");

-- CreateIndex
CREATE UNIQUE INDEX "agent_runtime_states_agentId_key" ON "agent_runtime_states"("agentId");

-- CreateIndex
CREATE INDEX "agent_runtime_states_status_idx" ON "agent_runtime_states"("status");

-- CreateIndex
CREATE INDEX "agent_memory_links_agentId_idx" ON "agent_memory_links"("agentId");

-- CreateIndex
CREATE INDEX "agent_memory_links_memoryItemId_idx" ON "agent_memory_links"("memoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "agent_memory_links_agentId_memoryItemId_key" ON "agent_memory_links"("agentId", "memoryItemId");

-- CreateIndex
CREATE INDEX "memory_items_workspaceId_idx" ON "memory_items"("workspaceId");

-- CreateIndex
CREATE INDEX "memory_items_workspaceId_type_idx" ON "memory_items"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "memory_items_workspaceId_importance_idx" ON "memory_items"("workspaceId", "importance");

-- CreateIndex
CREATE INDEX "memory_items_workspaceId_visibility_idx" ON "memory_items"("workspaceId", "visibility");

-- CreateIndex
CREATE INDEX "memory_items_agentId_idx" ON "memory_items"("agentId");

-- CreateIndex
CREATE INDEX "memory_items_projectId_idx" ON "memory_items"("projectId");

-- CreateIndex
CREATE INDEX "memory_items_type_idx" ON "memory_items"("type");

-- CreateIndex
CREATE INDEX "memory_items_createdAt_idx" ON "memory_items"("createdAt");

-- CreateIndex
CREATE INDEX "approval_requests_workspaceId_idx" ON "approval_requests"("workspaceId");

-- CreateIndex
CREATE INDEX "approval_requests_workspaceId_status_idx" ON "approval_requests"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "approval_requests_agentId_idx" ON "approval_requests"("agentId");

-- CreateIndex
CREATE INDEX "approval_requests_status_idx" ON "approval_requests"("status");

-- CreateIndex
CREATE INDEX "approval_requests_createdAt_idx" ON "approval_requests"("createdAt");

-- CreateIndex
CREATE INDEX "event_logs_workspaceId_idx" ON "event_logs"("workspaceId");

-- CreateIndex
CREATE INDEX "event_logs_workspaceId_eventType_idx" ON "event_logs"("workspaceId", "eventType");

-- CreateIndex
CREATE INDEX "event_logs_workspaceId_createdAt_idx" ON "event_logs"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "event_logs_eventType_idx" ON "event_logs"("eventType");

-- CreateIndex
CREATE INDEX "event_logs_entityType_entityId_idx" ON "event_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "event_logs_createdAt_idx" ON "event_logs"("createdAt");

-- CreateIndex
CREATE INDEX "cost_logs_agentId_idx" ON "cost_logs"("agentId");

-- CreateIndex
CREATE INDEX "cost_logs_createdAt_idx" ON "cost_logs"("createdAt");

-- CreateIndex
CREATE INDEX "tools_workspaceId_idx" ON "tools"("workspaceId");

-- CreateIndex
CREATE INDEX "tools_workspaceId_category_idx" ON "tools"("workspaceId", "category");

-- CreateIndex
CREATE INDEX "tools_workspaceId_enabled_idx" ON "tools"("workspaceId", "enabled");

-- CreateIndex
CREATE INDEX "tools_category_idx" ON "tools"("category");

-- CreateIndex
CREATE UNIQUE INDEX "tools_key_workspaceId_key" ON "tools"("key", "workspaceId");

-- CreateIndex
CREATE INDEX "tool_executions_workspaceId_idx" ON "tool_executions"("workspaceId");

-- CreateIndex
CREATE INDEX "tool_executions_workspaceId_status_idx" ON "tool_executions"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "tool_executions_workspaceId_createdAt_idx" ON "tool_executions"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "tool_executions_agentId_idx" ON "tool_executions"("agentId");

-- CreateIndex
CREATE INDEX "tool_executions_toolId_idx" ON "tool_executions"("toolId");

-- CreateIndex
CREATE INDEX "tool_executions_approvalRequestId_idx" ON "tool_executions"("approvalRequestId");

-- CreateIndex
CREATE INDEX "tool_executions_correlationId_idx" ON "tool_executions"("correlationId");

-- CreateIndex
CREATE INDEX "tool_executions_status_idx" ON "tool_executions"("status");

-- CreateIndex
CREATE INDEX "tool_executions_createdAt_idx" ON "tool_executions"("createdAt");

-- CreateIndex
CREATE INDEX "tool_permission_policies_toolId_idx" ON "tool_permission_policies"("toolId");

-- CreateIndex
CREATE UNIQUE INDEX "tool_permission_policies_toolId_permissionKey_key" ON "tool_permission_policies"("toolId", "permissionKey");

-- CreateIndex
CREATE INDEX "workflow_templates_status_idx" ON "workflow_templates"("status");

-- CreateIndex
CREATE INDEX "workflow_templates_category_idx" ON "workflow_templates"("category");

-- CreateIndex
CREATE UNIQUE INDEX "departments_key_key" ON "departments"("key");

-- CreateIndex
CREATE INDEX "handoff_records_workspaceId_idx" ON "handoff_records"("workspaceId");

-- CreateIndex
CREATE INDEX "handoff_records_workspaceId_status_idx" ON "handoff_records"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "handoff_records_fromDepartment_idx" ON "handoff_records"("fromDepartment");

-- CreateIndex
CREATE INDEX "handoff_records_toDepartment_idx" ON "handoff_records"("toDepartment");

-- CreateIndex
CREATE INDEX "handoff_records_status_idx" ON "handoff_records"("status");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_templates_key_key" ON "prompt_templates"("key");

-- CreateIndex
CREATE INDEX "prompt_templates_type_idx" ON "prompt_templates"("type");

-- CreateIndex
CREATE INDEX "prompt_templates_status_idx" ON "prompt_templates"("status");

-- CreateIndex
CREATE INDEX "prompt_versions_promptTemplateId_idx" ON "prompt_versions"("promptTemplateId");

-- CreateIndex
CREATE INDEX "prompt_versions_environment_idx" ON "prompt_versions"("environment");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_versions_promptTemplateId_version_key" ON "prompt_versions"("promptTemplateId", "version");

-- CreateIndex
CREATE INDEX "prompt_audit_logs_promptTemplateId_idx" ON "prompt_audit_logs"("promptTemplateId");

-- CreateIndex
CREATE INDEX "prompt_audit_logs_action_idx" ON "prompt_audit_logs"("action");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_role_bindings_agentId_key" ON "prompt_role_bindings"("agentId");

-- CreateIndex
CREATE INDEX "prompt_cost_logs_provider_idx" ON "prompt_cost_logs"("provider");

-- CreateIndex
CREATE INDEX "prompt_cost_logs_model_idx" ON "prompt_cost_logs"("model");

-- CreateIndex
CREATE INDEX "prompt_cost_logs_agentId_idx" ON "prompt_cost_logs"("agentId");

-- CreateIndex
CREATE INDEX "prompt_cost_logs_createdAt_idx" ON "prompt_cost_logs"("createdAt");

-- CreateIndex
CREATE INDEX "artifacts_runId_idx" ON "artifacts"("runId");

-- CreateIndex
CREATE INDEX "agent_executions_agentId_idx" ON "agent_executions"("agentId");

-- CreateIndex
CREATE INDEX "agent_executions_runId_idx" ON "agent_executions"("runId");

-- CreateIndex
CREATE INDEX "agent_tasks_agentId_idx" ON "agent_tasks"("agentId");

-- CreateIndex
CREATE INDEX "agent_tasks_runId_idx" ON "agent_tasks"("runId");

-- CreateIndex
CREATE INDEX "agent_tasks_runId_status_idx" ON "agent_tasks"("runId", "status");

-- CreateIndex
CREATE INDEX "ChatAttachment_ownerId_status_idx" ON "ChatAttachment"("ownerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ChatAttachment_ownerId_contentHash_key" ON "ChatAttachment"("ownerId", "contentHash");

-- CreateIndex
CREATE INDEX "checkpoints_runId_idx" ON "checkpoints"("runId");

-- CreateIndex
CREATE INDEX "checkpoints_runId_phase_idx" ON "checkpoints"("runId", "phase");

-- CreateIndex
CREATE UNIQUE INDEX "codex_provider_sessions_threadId_key" ON "codex_provider_sessions"("threadId");

-- CreateIndex
CREATE INDEX "codex_provider_sessions_providerId_idx" ON "codex_provider_sessions"("providerId");

-- CreateIndex
CREATE INDEX "codex_provider_sessions_status_idx" ON "codex_provider_sessions"("status");

-- CreateIndex
CREATE INDEX "decision_logs_runId_idx" ON "decision_logs"("runId");

-- CreateIndex
CREATE INDEX "findings_runId_idx" ON "findings"("runId");

-- CreateIndex
CREATE INDEX "findings_runId_status_idx" ON "findings"("runId", "status");

-- CreateIndex
CREATE INDEX "findings_severity_idx" ON "findings"("severity");

-- CreateIndex
CREATE INDEX "InfrastructureOperationStep_operationId_idx" ON "InfrastructureOperationStep"("operationId");

-- CreateIndex
CREATE UNIQUE INDEX "InfrastructureOperation_idempotencyKey_key" ON "InfrastructureOperation"("idempotencyKey");

-- CreateIndex
CREATE INDEX "InfrastructureOperation_status_idx" ON "InfrastructureOperation"("status");

-- CreateIndex
CREATE INDEX "OrchestrationRun_projectId_idx" ON "OrchestrationRun"("projectId");

-- CreateIndex
CREATE INDEX "OrchestrationRun_resumeLeaseUntil_idx" ON "OrchestrationRun"("resumeLeaseUntil");

-- CreateIndex
CREATE INDEX "OrchestrationRun_status_idx" ON "OrchestrationRun"("status");

-- CreateIndex
CREATE INDEX "OrchestrationRun_workspaceId_idx" ON "OrchestrationRun"("workspaceId");

-- CreateIndex
CREATE INDEX "verification_results_runId_idx" ON "verification_results"("runId");

-- CreateIndex
CREATE INDEX "verification_results_runId_type_idx" ON "verification_results"("runId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "devices_installationId_key" ON "devices"("installationId");

-- CreateIndex
CREATE INDEX "devices_ownerUserId_idx" ON "devices"("ownerUserId");

-- CreateIndex
CREATE INDEX "devices_status_idx" ON "devices"("status");

-- AddForeignKey
ALTER TABLE "ExtractedCandidate" ADD CONSTRAINT "ExtractedCandidate_screenshotId_fkey" FOREIGN KEY ("screenshotId") REFERENCES "Screenshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepositoryAnalysis" ADD CONSTRAINT "RepositoryAnalysis_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallPlan" ADD CONSTRAINT "InstallPlan_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistSnapshot" ADD CONSTRAINT "WatchlistSnapshot_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationPlan" ADD CONSTRAINT "IntegrationPlan_connectedProjectId_fkey" FOREIGN KEY ("connectedProjectId") REFERENCES "ConnectedProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_profiles" ADD CONSTRAINT "agent_profiles_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_capabilities" ADD CONSTRAINT "agent_capabilities_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_model_configs" ADD CONSTRAINT "agent_model_configs_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_permissions" ADD CONSTRAINT "agent_permissions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_runtime_states" ADD CONSTRAINT "agent_runtime_states_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_memory_links" ADD CONSTRAINT "agent_memory_links_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_memory_links" ADD CONSTRAINT "agent_memory_links_memoryItemId_fkey" FOREIGN KEY ("memoryItemId") REFERENCES "memory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_logs" ADD CONSTRAINT "cost_logs_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_executions" ADD CONSTRAINT "tool_executions_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "approval_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_executions" ADD CONSTRAINT "tool_executions_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_permission_policies" ADD CONSTRAINT "tool_permission_policies_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handoff_records" ADD CONSTRAINT "handoff_records_fromDepartment_fkey" FOREIGN KEY ("fromDepartment") REFERENCES "departments"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_versions" ADD CONSTRAINT "prompt_versions_promptTemplateId_fkey" FOREIGN KEY ("promptTemplateId") REFERENCES "prompt_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_audit_logs" ADD CONSTRAINT "prompt_audit_logs_promptTemplateId_fkey" FOREIGN KEY ("promptTemplateId") REFERENCES "prompt_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_cost_logs" ADD CONSTRAINT "prompt_cost_logs_promptTemplateId_fkey" FOREIGN KEY ("promptTemplateId") REFERENCES "prompt_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_runId_fkey" FOREIGN KEY ("runId") REFERENCES "OrchestrationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_executions" ADD CONSTRAINT "agent_executions_runId_fkey" FOREIGN KEY ("runId") REFERENCES "OrchestrationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_runId_fkey" FOREIGN KEY ("runId") REFERENCES "OrchestrationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_runId_fkey" FOREIGN KEY ("runId") REFERENCES "OrchestrationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_logs" ADD CONSTRAINT "decision_logs_runId_fkey" FOREIGN KEY ("runId") REFERENCES "OrchestrationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_runId_fkey" FOREIGN KEY ("runId") REFERENCES "OrchestrationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfrastructureOperationStep" ADD CONSTRAINT "InfrastructureOperationStep_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "InfrastructureOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_results" ADD CONSTRAINT "verification_results_runId_fkey" FOREIGN KEY ("runId") REFERENCES "OrchestrationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

