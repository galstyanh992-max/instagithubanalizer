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
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepositoryTag" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "categoryId" TEXT,
    "tagId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepositoryTag_pkey" PRIMARY KEY ("id")
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

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "epics" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "epics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "epicId" TEXT NOT NULL,
    "parentTaskId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'backlog',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "assignedAgentId" TEXT,
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "costEstimate" DOUBLE PRECISION,
    "costActual" DOUBLE PRECISION,
    "maxCostUsd" DECIMAL(65,30) NOT NULL DEFAULT 2.00,
    "currentCostUsd" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "maxIterations" INTEGER NOT NULL DEFAULT 15,
    "iterations" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
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
    "taskId" TEXT,
    "workspaceId" TEXT,
    "agentId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "risk" TEXT NOT NULL DEFAULT 'medium',
    "payload" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
    "taskId" TEXT,
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
    "taskId" TEXT,
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
CREATE TABLE "browser_operator_tasks" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "agentId" TEXT,
    "toolExecutionId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'custom',
    "prompt" TEXT NOT NULL,
    "url" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'extract',
    "status" TEXT NOT NULL DEFAULT 'queued',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "result" TEXT,
    "error" TEXT,
    "needsHumanReason" TEXT,
    "finalUrl" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 2,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "browser_operator_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "browser_operator_logs" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "step" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "browser_operator_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "browser_operator_screenshots" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "label" TEXT,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "browser_operator_screenshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "browser_operator_provider_configs" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "headless" BOOLEAN NOT NULL DEFAULT false,
    "profileDir" TEXT,
    "viewportWidth" INTEGER NOT NULL DEFAULT 1280,
    "viewportHeight" INTEGER NOT NULL DEFAULT 720,
    "defaultTimeout" INTEGER NOT NULL DEFAULT 30000,
    "maxSessions" INTEGER NOT NULL DEFAULT 1,
    "blockedDomains" TEXT,
    "allowedDomains" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "browser_operator_provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_definitions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "icon" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "status" TEXT NOT NULL DEFAULT 'available',
    "requiredTools" TEXT,
    "tags" TEXT,
    "installCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_skill_links" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "installed" BOOLEAN NOT NULL DEFAULT true,
    "config" TEXT,
    "score" INTEGER NOT NULL DEFAULT 50,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_skill_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_usage_logs" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "agentId" TEXT,
    "taskId" TEXT,
    "action" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "durationMs" INTEGER,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_packs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "status" TEXT NOT NULL DEFAULT 'available',
    "installCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_pack_items" (
    "id" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "skill_pack_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_packs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "status" TEXT NOT NULL DEFAULT 'available',
    "installCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_pack_items" (
    "id" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tool_pack_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_capability_scores" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "capabilityKey" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "trend" TEXT NOT NULL DEFAULT 'stable',
    "evidence" TEXT,
    "lastAssessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_capability_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_tool_links" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "installed" BOOLEAN NOT NULL DEFAULT true,
    "config" TEXT,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_tool_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_items" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "author" TEXT NOT NULL DEFAULT 'Agent OS',
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "icon" TEXT,
    "color" TEXT,
    "category" TEXT,
    "tags" TEXT,
    "content" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "installCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'published',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_items_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "tool_usage_logs" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "agentId" TEXT,
    "taskId" TEXT,
    "action" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "durationMs" INTEGER,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_usage_logs_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "content_items" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'text',
    "caption" TEXT NOT NULL DEFAULT '',
    "script" TEXT NOT NULL DEFAULT '',
    "hashtags" TEXT NOT NULL DEFAULT '[]',
    "mediaUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdByAgentId" TEXT,
    "approvedByAgentId" TEXT,
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "score" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_reviews" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "agentId" TEXT,
    "agentName" TEXT,
    "status" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "notes" TEXT,
    "issues" TEXT NOT NULL DEFAULT '[]',
    "suggestions" TEXT NOT NULL DEFAULT '[]',
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publishing_queue_items" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedBy" TEXT,
    "platform" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publishing_queue_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'new',
    "assignedAgentId" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "telegramHandle" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "notes" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "role" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalThreadId" TEXT,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "agentId" TEXT,
    "agentName" TEXT,
    "content" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stage" TEXT NOT NULL DEFAULT 'discovery',
    "probability" INTEGER NOT NULL DEFAULT 0,
    "closedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_ups" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "agentId" TEXT,
    "agentName" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_fullName_key" ON "Repository"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "workspaces_ownerId_idx" ON "workspaces"("ownerId");

-- CreateIndex
CREATE INDEX "projects_workspaceId_idx" ON "projects"("workspaceId");

-- CreateIndex
CREATE INDEX "projects_workspaceId_status_idx" ON "projects"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "epics_projectId_idx" ON "epics"("projectId");

-- CreateIndex
CREATE INDEX "epics_projectId_status_idx" ON "epics"("projectId", "status");

-- CreateIndex
CREATE INDEX "epics_status_idx" ON "epics"("status");

-- CreateIndex
CREATE INDEX "tasks_epicId_idx" ON "tasks"("epicId");

-- CreateIndex
CREATE INDEX "tasks_epicId_status_idx" ON "tasks"("epicId", "status");

-- CreateIndex
CREATE INDEX "tasks_assignedAgentId_idx" ON "tasks"("assignedAgentId");

-- CreateIndex
CREATE INDEX "tasks_assignedAgentId_status_idx" ON "tasks"("assignedAgentId", "status");

-- CreateIndex
CREATE INDEX "tasks_parentTaskId_idx" ON "tasks"("parentTaskId");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_createdAt_idx" ON "tasks"("createdAt");

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
CREATE INDEX "approval_requests_taskId_idx" ON "approval_requests"("taskId");

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
CREATE INDEX "cost_logs_taskId_idx" ON "cost_logs"("taskId");

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
CREATE INDEX "tool_executions_taskId_idx" ON "tool_executions"("taskId");

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
CREATE INDEX "browser_operator_tasks_workspaceId_idx" ON "browser_operator_tasks"("workspaceId");

-- CreateIndex
CREATE INDEX "browser_operator_tasks_workspaceId_status_idx" ON "browser_operator_tasks"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "browser_operator_tasks_agentId_idx" ON "browser_operator_tasks"("agentId");

-- CreateIndex
CREATE INDEX "browser_operator_tasks_status_idx" ON "browser_operator_tasks"("status");

-- CreateIndex
CREATE INDEX "browser_operator_tasks_createdAt_idx" ON "browser_operator_tasks"("createdAt");

-- CreateIndex
CREATE INDEX "browser_operator_logs_taskId_idx" ON "browser_operator_logs"("taskId");

-- CreateIndex
CREATE INDEX "browser_operator_logs_taskId_level_idx" ON "browser_operator_logs"("taskId", "level");

-- CreateIndex
CREATE INDEX "browser_operator_logs_timestamp_idx" ON "browser_operator_logs"("timestamp");

-- CreateIndex
CREATE INDEX "browser_operator_screenshots_taskId_idx" ON "browser_operator_screenshots"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "browser_operator_provider_configs_providerId_key" ON "browser_operator_provider_configs"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "skill_definitions_key_key" ON "skill_definitions"("key");

-- CreateIndex
CREATE INDEX "skill_definitions_category_idx" ON "skill_definitions"("category");

-- CreateIndex
CREATE INDEX "skill_definitions_status_idx" ON "skill_definitions"("status");

-- CreateIndex
CREATE INDEX "agent_skill_links_agentId_idx" ON "agent_skill_links"("agentId");

-- CreateIndex
CREATE INDEX "agent_skill_links_skillId_idx" ON "agent_skill_links"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "agent_skill_links_agentId_skillId_key" ON "agent_skill_links"("agentId", "skillId");

-- CreateIndex
CREATE INDEX "skill_usage_logs_skillId_idx" ON "skill_usage_logs"("skillId");

-- CreateIndex
CREATE INDEX "skill_usage_logs_agentId_idx" ON "skill_usage_logs"("agentId");

-- CreateIndex
CREATE INDEX "skill_usage_logs_createdAt_idx" ON "skill_usage_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "skill_packs_key_key" ON "skill_packs"("key");

-- CreateIndex
CREATE INDEX "skill_packs_status_idx" ON "skill_packs"("status");

-- CreateIndex
CREATE INDEX "skill_pack_items_packId_idx" ON "skill_pack_items"("packId");

-- CreateIndex
CREATE INDEX "skill_pack_items_skillId_idx" ON "skill_pack_items"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "skill_pack_items_packId_skillId_key" ON "skill_pack_items"("packId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "tool_packs_key_key" ON "tool_packs"("key");

-- CreateIndex
CREATE INDEX "tool_packs_status_idx" ON "tool_packs"("status");

-- CreateIndex
CREATE INDEX "tool_pack_items_packId_idx" ON "tool_pack_items"("packId");

-- CreateIndex
CREATE INDEX "tool_pack_items_toolId_idx" ON "tool_pack_items"("toolId");

-- CreateIndex
CREATE UNIQUE INDEX "tool_pack_items_packId_toolId_key" ON "tool_pack_items"("packId", "toolId");

-- CreateIndex
CREATE INDEX "agent_capability_scores_agentId_idx" ON "agent_capability_scores"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "agent_capability_scores_agentId_capabilityKey_key" ON "agent_capability_scores"("agentId", "capabilityKey");

-- CreateIndex
CREATE INDEX "agent_tool_links_agentId_idx" ON "agent_tool_links"("agentId");

-- CreateIndex
CREATE INDEX "agent_tool_links_toolId_idx" ON "agent_tool_links"("toolId");

-- CreateIndex
CREATE UNIQUE INDEX "agent_tool_links_agentId_toolId_key" ON "agent_tool_links"("agentId", "toolId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_items_key_key" ON "marketplace_items"("key");

-- CreateIndex
CREATE INDEX "marketplace_items_type_idx" ON "marketplace_items"("type");

-- CreateIndex
CREATE INDEX "marketplace_items_status_idx" ON "marketplace_items"("status");

-- CreateIndex
CREATE INDEX "marketplace_items_category_idx" ON "marketplace_items"("category");

-- CreateIndex
CREATE INDEX "workflow_templates_status_idx" ON "workflow_templates"("status");

-- CreateIndex
CREATE INDEX "workflow_templates_category_idx" ON "workflow_templates"("category");

-- CreateIndex
CREATE INDEX "tool_usage_logs_toolId_idx" ON "tool_usage_logs"("toolId");

-- CreateIndex
CREATE INDEX "tool_usage_logs_agentId_idx" ON "tool_usage_logs"("agentId");

-- CreateIndex
CREATE INDEX "tool_usage_logs_createdAt_idx" ON "tool_usage_logs"("createdAt");

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
CREATE INDEX "content_items_workspaceId_idx" ON "content_items"("workspaceId");

-- CreateIndex
CREATE INDEX "content_items_workspaceId_status_idx" ON "content_items"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "content_items_workspaceId_platform_idx" ON "content_items"("workspaceId", "platform");

-- CreateIndex
CREATE INDEX "content_items_workspaceId_scheduledAt_idx" ON "content_items"("workspaceId", "scheduledAt");

-- CreateIndex
CREATE INDEX "content_items_createdByAgentId_idx" ON "content_items"("createdByAgentId");

-- CreateIndex
CREATE INDEX "content_items_status_idx" ON "content_items"("status");

-- CreateIndex
CREATE INDEX "content_items_scheduledAt_idx" ON "content_items"("scheduledAt");

-- CreateIndex
CREATE INDEX "content_reviews_contentItemId_idx" ON "content_reviews"("contentItemId");

-- CreateIndex
CREATE INDEX "content_reviews_contentItemId_status_idx" ON "content_reviews"("contentItemId", "status");

-- CreateIndex
CREATE INDEX "publishing_queue_items_workspaceId_idx" ON "publishing_queue_items"("workspaceId");

-- CreateIndex
CREATE INDEX "publishing_queue_items_workspaceId_isPublished_idx" ON "publishing_queue_items"("workspaceId", "isPublished");

-- CreateIndex
CREATE INDEX "publishing_queue_items_workspaceId_scheduledAt_idx" ON "publishing_queue_items"("workspaceId", "scheduledAt");

-- CreateIndex
CREATE INDEX "publishing_queue_items_contentItemId_idx" ON "publishing_queue_items"("contentItemId");

-- CreateIndex
CREATE INDEX "publishing_queue_items_scheduledAt_idx" ON "publishing_queue_items"("scheduledAt");

-- CreateIndex
CREATE INDEX "leads_workspaceId_idx" ON "leads"("workspaceId");

-- CreateIndex
CREATE INDEX "leads_workspaceId_status_idx" ON "leads"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "leads_workspaceId_source_idx" ON "leads"("workspaceId", "source");

-- CreateIndex
CREATE INDEX "leads_workspaceId_score_idx" ON "leads"("workspaceId", "score");

-- CreateIndex
CREATE INDEX "leads_assignedAgentId_idx" ON "leads"("assignedAgentId");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_nextFollowUpAt_idx" ON "leads"("nextFollowUpAt");

-- CreateIndex
CREATE INDEX "contacts_leadId_idx" ON "contacts"("leadId");

-- CreateIndex
CREATE INDEX "conversations_leadId_idx" ON "conversations"("leadId");

-- CreateIndex
CREATE INDEX "conversation_messages_conversationId_idx" ON "conversation_messages"("conversationId");

-- CreateIndex
CREATE INDEX "conversation_messages_conversationId_direction_idx" ON "conversation_messages"("conversationId", "direction");

-- CreateIndex
CREATE INDEX "conversation_messages_timestamp_idx" ON "conversation_messages"("timestamp");

-- CreateIndex
CREATE INDEX "deals_leadId_idx" ON "deals"("leadId");

-- CreateIndex
CREATE INDEX "deals_leadId_stage_idx" ON "deals"("leadId", "stage");

-- CreateIndex
CREATE INDEX "deals_stage_idx" ON "deals"("stage");

-- CreateIndex
CREATE INDEX "follow_ups_leadId_idx" ON "follow_ups"("leadId");

-- CreateIndex
CREATE INDEX "follow_ups_leadId_done_idx" ON "follow_ups"("leadId", "done");

-- CreateIndex
CREATE INDEX "follow_ups_date_idx" ON "follow_ups"("date");

-- CreateIndex
CREATE INDEX "follow_ups_done_idx" ON "follow_ups"("done");

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

-- AddForeignKey
ALTER TABLE "ExtractedCandidate" ADD CONSTRAINT "ExtractedCandidate_screenshotId_fkey" FOREIGN KEY ("screenshotId") REFERENCES "Screenshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepositoryAnalysis" ADD CONSTRAINT "RepositoryAnalysis_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallPlan" ADD CONSTRAINT "InstallPlan_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepositoryTag" ADD CONSTRAINT "RepositoryTag_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepositoryTag" ADD CONSTRAINT "RepositoryTag_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepositoryTag" ADD CONSTRAINT "RepositoryTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "epics" ADD CONSTRAINT "epics_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_epicId_fkey" FOREIGN KEY ("epicId") REFERENCES "epics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_logs" ADD CONSTRAINT "cost_logs_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_logs" ADD CONSTRAINT "cost_logs_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_executions" ADD CONSTRAINT "tool_executions_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_executions" ADD CONSTRAINT "tool_executions_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "approval_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_permission_policies" ADD CONSTRAINT "tool_permission_policies_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browser_operator_logs" ADD CONSTRAINT "browser_operator_logs_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "browser_operator_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browser_operator_screenshots" ADD CONSTRAINT "browser_operator_screenshots_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "browser_operator_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_skill_links" ADD CONSTRAINT "agent_skill_links_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_skill_links" ADD CONSTRAINT "agent_skill_links_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skill_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_usage_logs" ADD CONSTRAINT "skill_usage_logs_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skill_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_pack_items" ADD CONSTRAINT "skill_pack_items_packId_fkey" FOREIGN KEY ("packId") REFERENCES "skill_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_pack_items" ADD CONSTRAINT "skill_pack_items_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skill_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_pack_items" ADD CONSTRAINT "tool_pack_items_packId_fkey" FOREIGN KEY ("packId") REFERENCES "tool_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_pack_items" ADD CONSTRAINT "tool_pack_items_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_capability_scores" ADD CONSTRAINT "agent_capability_scores_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tool_links" ADD CONSTRAINT "agent_tool_links_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tool_links" ADD CONSTRAINT "agent_tool_links_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_usage_logs" ADD CONSTRAINT "tool_usage_logs_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handoff_records" ADD CONSTRAINT "handoff_records_fromDepartment_fkey" FOREIGN KEY ("fromDepartment") REFERENCES "departments"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publishing_queue_items" ADD CONSTRAINT "publishing_queue_items_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_versions" ADD CONSTRAINT "prompt_versions_promptTemplateId_fkey" FOREIGN KEY ("promptTemplateId") REFERENCES "prompt_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_audit_logs" ADD CONSTRAINT "prompt_audit_logs_promptTemplateId_fkey" FOREIGN KEY ("promptTemplateId") REFERENCES "prompt_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_cost_logs" ADD CONSTRAINT "prompt_cost_logs_promptTemplateId_fkey" FOREIGN KEY ("promptTemplateId") REFERENCES "prompt_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
