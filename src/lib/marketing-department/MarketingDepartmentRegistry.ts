// ─── Marketing Department — Registry ─────────────────────────
// Manages the Marketing Department as a bounded context.
// Tracks agents, campaigns, handoff states, and workflow progression.

import type {
  MarketingWorkflowState,
  MarketingCampaign,
  MarketIntelligence,
  ContentAsset,
  FeedbackReport,
  HandoffState,
  MarketingAgentCapability,
} from './types';
import type { HandoffArtifact, HandoffContract, Department } from '../types/departments';
import { Departments, DepartmentAgents, DEV_TO_MARKETING_ARTIFACTS, MARKETING_TO_DEV_ARTIFACTS } from '../types/departments';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';

// ─── Marketing Agent Specifications ──────────────────────────

const MARKETING_AGENT_SPECS: MarketingAgentCapability[] = [
  {
    agentId: 'marketing_lead',
    role: 'marketing_lead',
    capabilities: [
      'marketing_strategy',
      'gtm_planning',
      'positioning',
      'launch_coordination',
      'handoff_management',
      'cross_department_liaison',
    ],
    memoryScope: ['department', 'project', 'workspace'],
    toolPermissions: ['files:read', 'browser:read', 'http:read'],
    successMetrics: [
      'launch_plan_completeness',
      'positioning_clarity_score',
      'handoff_success_rate',
      'time_to_gtm',
    ],
    escalationRules: [
      { condition: 'handoff_artifacts_incomplete', escalateTo: 'orchestrator', severity: 'high' },
      { condition: 'dev_feedback_urgent', escalateTo: 'orchestrator', severity: 'critical' },
    ],
  },
  {
    agentId: 'market_researcher',
    role: 'market_researcher',
    capabilities: [
      'market_research',
      'competitor_analysis',
      'icp_definition',
      'jtbd_framework',
      'market_sizing',
      'differentiation_mapping',
    ],
    memoryScope: ['department', 'project'],
    toolPermissions: ['files:read', 'browser:read', 'http:read'],
    successMetrics: [
      'research_completeness',
      'icp_accuracy',
      'competitor_coverage',
      'confidence_level',
    ],
    escalationRules: [
      { condition: 'insufficient_market_data', escalateTo: 'marketing_lead', severity: 'medium' },
      { condition: 'competitor_threat_critical', escalateTo: 'marketing_lead', severity: 'high' },
    ],
  },
  {
    agentId: 'content_strategist',
    role: 'content_strategist',
    capabilities: [
      'messaging_framework',
      'value_proposition',
      'content_planning',
      'channel_copywriting',
      'brand_voice',
      'funnel_messaging',
    ],
    memoryScope: ['department', 'project'],
    toolPermissions: ['files:read', 'http:read'],
    successMetrics: [
      'message_consistency_score',
      'content_throughput',
      'channel_coverage',
      'copy_effectiveness',
    ],
    escalationRules: [
      { condition: 'messaging_misalignment', escalateTo: 'marketing_lead', severity: 'medium' },
      { condition: 'brand_voice_violation', escalateTo: 'marketing_lead', severity: 'high' },
    ],
  },
  {
    agentId: 'growth_manager',
    role: 'growth_manager',
    capabilities: [
      'launch_execution',
      'channel_management',
      'campaign_planning',
      'seo_optimization',
      'growth_experiments',
      'community_building',
    ],
    memoryScope: ['department', 'project', 'workspace'],
    toolPermissions: ['files:read', 'browser:read', 'http:read', 'terminal:read'],
    successMetrics: [
      'campaign_roi',
      'channel_performance',
      'acquisition_rate',
      'experiment_velocity',
    ],
    escalationRules: [
      { condition: 'campaign_underperforming', escalateTo: 'marketing_lead', severity: 'medium' },
      { condition: 'budget_overrun', escalateTo: 'marketing_lead', severity: 'high' },
    ],
  },
  {
    agentId: 'marketing_analyst',
    role: 'marketing_analyst',
    capabilities: [
      'kpi_tracking',
      'market_signal_collection',
      'campaign_analysis',
      'feedback_reporting',
      'trend_detection',
      'product_feedback',
    ],
    memoryScope: ['department', 'project', 'workspace', 'global'],
    toolPermissions: ['files:read', 'http:read'],
    successMetrics: [
      'kpi_dashboard_completeness',
      'feedback_actionability',
      'signal_accuracy',
      'loop_closure_rate',
    ],
    escalationRules: [
      { condition: 'critical_market_signal', escalateTo: 'marketing_lead', severity: 'high' },
      { condition: 'product_feedback_urgent', escalateTo: 'orchestrator', severity: 'critical' },
    ],
  },
  // ─── New Full Marketing Team ──────────────────────────────
  {
    agentId: 'trend_analyst',
    role: 'trend_analyst',
    capabilities: ['trend_research', 'platform_monitoring', 'hashtag_analysis', 'viral_detection'],
    memoryScope: ['department', 'workspace'],
    toolPermissions: ['browser:read', 'http:read'],
    successMetrics: ['trend_relevance_score', 'lead_time_on_trend'],
    escalationRules: [
      { condition: 'trend_is_sensitive_topic', escalateTo: 'marketing_lead', severity: 'high' },
    ],
  },
  {
    agentId: 'copywriter',
    role: 'copywriter',
    capabilities: ['copywriting', 'social_copy', 'email_copy', 'cta_writing'],
    memoryScope: ['department', 'project'],
    toolPermissions: ['files:read'],
    successMetrics: ['copy_approval_rate', 'engagement_rate_on_copy'],
    escalationRules: [
      { condition: 'brand_voice_ambiguous', escalateTo: 'brand_guardian', severity: 'medium' },
    ],
  },
  {
    agentId: 'visual_designer',
    role: 'visual_designer',
    capabilities: ['image_prompt_creation', 'layout_design', 'brand_visual_compliance'],
    memoryScope: ['department', 'project'],
    toolPermissions: ['files:read', 'http:read'],
    successMetrics: ['visual_approval_rate', 'brand_consistency_score'],
    escalationRules: [],
  },
  {
    agentId: 'video_editor',
    role: 'video_editor',
    capabilities: ['video_scripting', 'production_package', 'hook_creation'],
    memoryScope: ['department', 'project'],
    toolPermissions: ['files:read'],
    successMetrics: ['production_package_completeness'],
    escalationRules: [
      { condition: 'source_footage_missing', escalateTo: 'human', severity: 'high' },
    ],
  },
  {
    agentId: 'publisher',
    role: 'publisher',
    capabilities: ['schedule_management', 'publication_queue', 'channel_coordination'],
    memoryScope: ['department', 'workspace'],
    toolPermissions: ['browser:write', 'http:write'],
    successMetrics: ['on_time_publish_rate', 'zero_missing_assets'],
    escalationRules: [
      { condition: 'content_not_approved', escalateTo: 'brand_guardian', severity: 'high' },
      { condition: 'platform_api_failure', escalateTo: 'human', severity: 'critical' },
    ],
  },
  {
    agentId: 'community_manager',
    role: 'community_manager',
    capabilities: ['comment_response', 'community_moderation', 'sentiment_monitoring'],
    memoryScope: ['department', 'workspace'],
    toolPermissions: [],
    successMetrics: ['response_rate', 'sentiment_score', 'escalation_accuracy'],
    escalationRules: [
      { condition: 'legal_or_financial_mention', escalateTo: 'human', severity: 'critical' },
      { condition: 'pr_crisis_detected', escalateTo: 'marketing_lead', severity: 'critical' },
    ],
  },
  {
    agentId: 'messenger_support',
    role: 'messenger_support',
    capabilities: ['lead_qualification', 'faq_response', 'contact_collection', 'inbox_triage'],
    memoryScope: ['department', 'workspace'],
    toolPermissions: [],
    successMetrics: ['lead_qualification_rate', 'response_time', 'escalation_accuracy'],
    escalationRules: [
      { condition: 'high_risk_message', escalateTo: 'human', severity: 'critical' },
      { condition: 'qualified_lead', escalateTo: 'sales_agent', severity: 'low' },
    ],
  },
  {
    agentId: 'sales_agent',
    role: 'sales_agent',
    capabilities: ['lead_conversion', 'objection_handling', 'appointment_booking'],
    memoryScope: ['department', 'workspace'],
    toolPermissions: [],
    successMetrics: ['conversion_rate', 'appointment_booking_rate'],
    escalationRules: [
      { condition: 'pricing_negotiation', escalateTo: 'human', severity: 'high' },
      { condition: 'contract_question', escalateTo: 'human', severity: 'critical' },
      { condition: 'payment_processing', escalateTo: 'human', severity: 'critical' },
    ],
  },
  {
    agentId: 'brand_guardian',
    role: 'brand_guardian',
    capabilities: ['brand_review', 'tone_check', 'legal_flag', 'content_approval'],
    memoryScope: ['department', 'workspace'],
    toolPermissions: ['files:read'],
    successMetrics: ['approval_accuracy', 'time_to_review'],
    escalationRules: [
      { condition: 'legal_claim_in_content', escalateTo: 'human', severity: 'critical' },
    ],
  },
];

// ─── Default Handoff Contracts ───────────────────────────────

const DEFAULT_HANDOFF_CONTRACTS: Omit<HandoffContract, 'id'>[] = [
  {
    fromDepartment: Departments.DEV,
    toDepartment: Departments.MARKETING,
    triggerEvent: EventTypes.PRODUCT_CONCEPT_READY,
    inputArtifacts: DEV_TO_MARKETING_ARTIFACTS,
    outputArtifacts: [
      { type: 'document', name: 'Initial Market Assessment', content: '', format: 'markdown' },
    ],
    receivingAgent: 'marketing_lead',
    completionConditions: ['market_assessment_complete', 'icp_draft_ready'],
  },
  {
    fromDepartment: Departments.DEV,
    toDepartment: Departments.MARKETING,
    triggerEvent: EventTypes.MVP_READY_FOR_MARKETING,
    inputArtifacts: DEV_TO_MARKETING_ARTIFACTS,
    outputArtifacts: [
      { type: 'document', name: 'Positioning Brief', content: '', format: 'markdown' },
      { type: 'document', name: 'ICP / Persona Summary', content: '', format: 'markdown' },
      { type: 'document', name: 'Messaging Framework', content: '', format: 'markdown' },
    ],
    receivingAgent: 'marketing_lead',
    completionConditions: ['positioning_approved', 'icp_validated', 'messaging_aligned'],
  },
  {
    fromDepartment: Departments.DEV,
    toDepartment: Departments.MARKETING,
    triggerEvent: EventTypes.RELEASE_CANDIDATE_READY,
    inputArtifacts: DEV_TO_MARKETING_ARTIFACTS,
    outputArtifacts: [
      { type: 'document', name: 'Launch Plan', content: '', format: 'markdown' },
      { type: 'document', name: 'Channel Strategy', content: '', format: 'markdown' },
      { type: 'document', name: 'Content Backlog', content: '', format: 'markdown' },
    ],
    receivingAgent: 'marketing_lead',
    completionConditions: ['launch_plan_approved', 'channels_configured', 'content_ready'],
  },
  {
    fromDepartment: Departments.MARKETING,
    toDepartment: Departments.DEV,
    triggerEvent: EventTypes.MARKET_FEEDBACK_COLLECTED,
    inputArtifacts: [],
    outputArtifacts: MARKETING_TO_DEV_ARTIFACTS,
    receivingAgent: 'analyst',
    completionConditions: ['feedback_delivered', 'acknowledged_by_dev'],
  },
];

// ─── Marketing Department Registry Singleton ─────────────────

class MarketingDepartmentRegistry {
  private static instance: MarketingDepartmentRegistry | null = null;

  private workflowStates: Map<string, MarketingWorkflowState> = new Map();
  private campaigns: Map<string, MarketingCampaign> = new Map();
  private intelligence: Map<string, MarketIntelligence> = new Map();
  private contentAssets: Map<string, ContentAsset> = new Map();
  private feedbackReports: Map<string, FeedbackReport> = new Map();
  private handoffStates: Map<string, HandoffState> = new Map();
  private agentSpecs: Map<string, MarketingAgentCapability> = new Map();

  private constructor() {
    // Initialize agent specs
    for (const spec of MARKETING_AGENT_SPECS) {
      this.agentSpecs.set(spec.agentId, spec);
    }

    // Initialize handoff contracts
    for (const contract of DEFAULT_HANDOFF_CONTRACTS) {
      const id = `handoff_${contract.triggerEvent}_${contract.toDepartment}`;
      this.handoffStates.set(id, {
        contractId: id,
        status: 'pending',
        receivedArtifacts: [],
        producedArtifacts: [],
        receivingAgentId: contract.receivingAgent,
        errors: [],
      });
    }

    // Subscribe to handoff events
    this.subscribeToHandoffEvents();
  }

  static getInstance(): MarketingDepartmentRegistry {
    if (!MarketingDepartmentRegistry.instance) {
      MarketingDepartmentRegistry.instance = new MarketingDepartmentRegistry();
    }
    return MarketingDepartmentRegistry.instance;
  }

  // ── Workflow State Management ────────────────────────────

  getWorkflowState(projectId: string): MarketingWorkflowState {
    return this.workflowStates.get(projectId) ?? 'idle';
  }

  setWorkflowState(projectId: string, state: MarketingWorkflowState): void {
    this.workflowStates.set(projectId, state);
  }

  // ── Agent Specs ──────────────────────────────────────────

  getAgentSpec(agentId: string): MarketingAgentCapability | undefined {
    return this.agentSpecs.get(agentId);
  }

  getAllAgentSpecs(): MarketingAgentCapability[] {
    return Array.from(this.agentSpecs.values());
  }

  // ── Campaign Management ──────────────────────────────────

  addCampaign(campaign: MarketingCampaign): void {
    this.campaigns.set(campaign.id, campaign);
  }

  getCampaign(campaignId: string): MarketingCampaign | undefined {
    return this.campaigns.get(campaignId);
  }

  getCampaignsByProject(projectId: string): MarketingCampaign[] {
    return Array.from(this.campaigns.values()).filter(c => c.projectId === projectId);
  }

  updateCampaignStatus(campaignId: string, status: MarketingCampaign['status']): boolean {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return false;
    campaign.status = status;
    campaign.updatedAt = Date.now();
    return true;
  }

  // ── Market Intelligence ──────────────────────────────────

  addIntelligence(intel: MarketIntelligence): void {
    this.intelligence.set(intel.id, intel);
  }

  getIntelligenceByProject(projectId: string): MarketIntelligence[] {
    return Array.from(this.intelligence.values()).filter(i => i.projectId === projectId);
  }

  // ── Content Assets ───────────────────────────────────────

  addContentAsset(asset: ContentAsset): void {
    this.contentAssets.set(asset.id, asset);
  }

  getContentAssetsByProject(projectId: string): ContentAsset[] {
    return Array.from(this.contentAssets.values()).filter(a => a.projectId === projectId);
  }

  // ── Feedback Reports ─────────────────────────────────────

  addFeedbackReport(report: FeedbackReport): void {
    this.feedbackReports.set(report.id, report);
  }

  getFeedbackReportsByProject(projectId: string): FeedbackReport[] {
    return Array.from(this.feedbackReports.values()).filter(r => r.projectId === projectId);
  }

  // ── Handoff Management ───────────────────────────────────

  getHandoffState(contractId: string): HandoffState | undefined {
    return this.handoffStates.get(contractId);
  }

  getAllHandoffStates(): HandoffState[] {
    return Array.from(this.handoffStates.values());
  }

  updateHandoffState(contractId: string, updates: Partial<HandoffState>): boolean {
    const state = this.handoffStates.get(contractId);
    if (!state) return false;
    Object.assign(state, updates);
    return true;
  }

  // ── Event Subscriptions ──────────────────────────────────

  private subscribeToHandoffEvents(): void {
    // When Dev emits product_concept_ready
    eventBus.on(EventTypes.PRODUCT_CONCEPT_READY, async (payload) => {
      const projectId = payload.projectId;
      this.setWorkflowState(projectId, 'awaiting_handoff');

      const contractId = `handoff_${EventTypes.PRODUCT_CONCEPT_READY}_${Departments.MARKETING}`;
      this.updateHandoffState(contractId, {
        status: 'in_progress',
        startedAt: Date.now(),
        receivedArtifacts: [
          { type: 'document', name: 'Product Brief', content: payload.productBrief, format: 'markdown' },
          { type: 'document', name: 'Target User Hypothesis', content: payload.targetUserHypothesis, format: 'markdown' },
        ],
      });

      this.setWorkflowState(projectId, 'researching');
    });

    // When Dev emits mvp_ready_for_marketing
    eventBus.on(EventTypes.MVP_READY_FOR_MARKETING, async (payload) => {
      const projectId = payload.projectId;
      this.setWorkflowState(projectId, 'researching');

      const contractId = `handoff_${EventTypes.MVP_READY_FOR_MARKETING}_${Departments.MARKETING}`;
      this.updateHandoffState(contractId, {
        status: 'in_progress',
        startedAt: Date.now(),
        receivedArtifacts: [
          { type: 'document', name: 'PRD', content: payload.prd, format: 'markdown' },
          { type: 'document', name: 'Changelog', content: payload.changelog, format: 'markdown' },
        ],
      });

      this.setWorkflowState(projectId, 'messaging');
    });

    // When Dev emits release_candidate_ready
    eventBus.on(EventTypes.RELEASE_CANDIDATE_READY, async (payload) => {
      const projectId = payload.projectId;
      this.setWorkflowState(projectId, 'planning_launch');

      const contractId = `handoff_${EventTypes.RELEASE_CANDIDATE_READY}_${Departments.MARKETING}`;
      this.updateHandoffState(contractId, {
        status: 'in_progress',
        startedAt: Date.now(),
        receivedArtifacts: [
          { type: 'document', name: 'Release Notes', content: payload.releaseNotes, format: 'markdown' },
        ],
      });
    });

    // When Marketing emits campaign_live
    eventBus.on(EventTypes.CAMPAIGN_LIVE, async (payload) => {
      this.setWorkflowState(payload.projectId, 'executing_campaign');
    });

    // When Marketing emits market_feedback_collected
    eventBus.on(EventTypes.MARKET_FEEDBACK_COLLECTED, async (payload) => {
      this.setWorkflowState(payload.projectId, 'feedback_loop');
    });

    // When post_launch_review is emitted
    eventBus.on(EventTypes.POST_LAUNCH_REVIEW, async (payload) => {
      this.setWorkflowState(payload.projectId, 'post_launch_review');
    });
  }

  // ── Department Info ──────────────────────────────────────

  getDepartmentInfo(): {
    id: Department;
    name: string;
    agentCount: number;
    agents: Array<{ id: string; role: string; capabilities: string[] }>;
    activeWorkflows: number;
    activeCampaigns: number;
    pendingHandoffs: number;
  } {
    const agents = this.getAllAgentSpecs().map(s => ({
      id: s.agentId,
      role: s.role,
      capabilities: s.capabilities,
    }));

    const activeWorkflows = Array.from(this.workflowStates.values())
      .filter(s => s !== 'idle').length;

    const activeCampaigns = Array.from(this.campaigns.values())
      .filter(c => c.status === 'active').length;

    const pendingHandoffs = Array.from(this.handoffStates.values())
      .filter(h => h.status === 'pending' || h.status === 'in_progress').length;

    return {
      id: Departments.MARKETING,
      name: 'Marketing Department',
      agentCount: agents.length,
      agents,
      activeWorkflows,
      activeCampaigns,
      pendingHandoffs,
    };
  }
}

export const marketingDepartmentRegistry = MarketingDepartmentRegistry.getInstance();
