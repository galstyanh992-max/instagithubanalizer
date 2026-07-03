// ─── Agent OS — Agent Config Definitions ────────────────────
// Barrel export for all agent config definitions.
// Add new agent configs here when creating new agents.

import type { AgentConfig } from '../agent-core/types';
import { normalizeOpenRouterModelConfig } from '../ai-provider/model-registry';
import { orchestratorConfig } from './orchestrator';
import { researcherConfig } from './researcher';
import { frontendEngineerConfig } from './frontend-engineer';
import { analystConfig } from './analyst';
import { architectConfig } from './architect';
import { designerConfig } from './designer';
import { backendEngineerConfig } from './backend-engineer';
import { dataEngineerConfig } from './data-engineer';
import { qaEngineerConfig } from './qa-engineer';
import { devopsEngineerConfig } from './devops-engineer';
import { securityEngineerConfig } from './security-engineer';
import { marketingLeadConfig } from './marketing-lead';
import { marketResearcherConfig } from './market-researcher';
import { contentStrategistConfig } from './content-strategist';
import { growthManagerConfig } from './growth-manager';
import { marketingAnalystConfig } from './marketing-analyst';
import { trendAnalystConfig } from './trend-analyst';
import { copywriterConfig } from './copywriter';
import { visualDesignerMarketingConfig } from './visual-designer-marketing';
import { videoEditorConfig } from './video-editor';
import { publisherConfig } from './publisher';
import { communityManagerConfig } from './community-manager';
import { messengerSupportConfig } from './messenger-support';
import { salesAgentConfig } from './sales-agent';
import { brandGuardianConfig } from './brand-guardian';
import { competitorAnalystConfig } from './competitor-analyst';
import { seoSpecialistConfig } from './seo-specialist';
import { ppcSpecialistConfig } from './ppc-specialist';
import { crmMarketerConfig } from './crm-marketer';
import { prManagerConfig } from './pr-manager';
import { influencerManagerConfig } from './influencer-manager';
import { affiliateManagerConfig } from './affiliate-manager';
import { productMarketingManagerConfig } from './product-marketing-manager';
import { customerResearchSpecialistConfig } from './customer-research-specialist';
import { croSpecialistConfig } from './cro-specialist';
import { marketingAutomationEngineerConfig } from './marketing-automation-engineer';
import { productManagerConfig } from './product-manager';
import { databaseArchitectConfig } from './database-architect';
import { aiArchitectConfig } from './ai-architect';
import { ragEngineerConfig } from './rag-engineer';
import { promptEngineerConfig } from './prompt-engineer';
import { securityAuditorConfig } from './security-auditor';
import { technicalWriterConfig } from './technical-writer';
import { codeReviewerConfig } from './code-reviewer';
import { refactoringSpecialistConfig } from './refactoring-specialist';
import { performanceOptimizerConfig } from './performance-optimizer';
import { costOptimizerConfig } from './cost-optimizer';
import { browserOperatorAgentConfig } from './browser-operator-agent';
import { githubOperatorConfig } from './github-operator';
import { deploymentOperatorConfig } from './deployment-operator';
import { integrationEngineerConfig } from './integration-engineer';
import { aiEvaluatorConfig } from './ai-evaluator';
import { selfHealingAgentConfig } from './self-healing-agent';

/**
 * All built-in agent config definitions.
 * These are loaded into the AgentRegistry at startup.
 */
const RAW_AGENT_CONFIGS: AgentConfig[] = [
  orchestratorConfig,
  researcherConfig,
  frontendEngineerConfig,
  analystConfig,
  architectConfig,
  designerConfig,
  backendEngineerConfig,
  dataEngineerConfig,
  qaEngineerConfig,
  devopsEngineerConfig,
  securityEngineerConfig,
  marketingLeadConfig,
  marketResearcherConfig,
  contentStrategistConfig,
  growthManagerConfig,
  marketingAnalystConfig,
  // Full marketing team expansion
  trendAnalystConfig,
  copywriterConfig,
  visualDesignerMarketingConfig,
  videoEditorConfig,
  publisherConfig,
  communityManagerConfig,
  messengerSupportConfig,
  salesAgentConfig,
  brandGuardianConfig,
  competitorAnalystConfig,
  seoSpecialistConfig,
  ppcSpecialistConfig,
  crmMarketerConfig,
  prManagerConfig,
  influencerManagerConfig,
  affiliateManagerConfig,
  productMarketingManagerConfig,
  customerResearchSpecialistConfig,
  croSpecialistConfig,
  marketingAutomationEngineerConfig,
  productManagerConfig,
  databaseArchitectConfig,
  aiArchitectConfig,
  ragEngineerConfig,
  promptEngineerConfig,
  securityAuditorConfig,
  technicalWriterConfig,
  codeReviewerConfig,
  refactoringSpecialistConfig,
  performanceOptimizerConfig,
  costOptimizerConfig,
  browserOperatorAgentConfig,
  githubOperatorConfig,
  deploymentOperatorConfig,
  integrationEngineerConfig,
  aiEvaluatorConfig,
  selfHealingAgentConfig,
];

export const AGENT_CONFIGS: AgentConfig[] = RAW_AGENT_CONFIGS.map((config) => ({
  ...config,
  model: normalizeOpenRouterModelConfig(config.role, config.model),
}));

/**
 * Get a config by agent ID.
 */
export function getAgentConfig(id: string): AgentConfig | undefined {
  return AGENT_CONFIGS.find((c) => c.id === id);
}

/**
 * List all config IDs.
 */
export function listConfigIds(): string[] {
  return AGENT_CONFIGS.map((c) => c.id);
}
