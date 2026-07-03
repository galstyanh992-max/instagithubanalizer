// ─── Marketing Department — Internal Types ───────────────────
// Types specific to the Marketing Department bounded context.
// These are NOT shared with the Dev Department.

import type { HandoffArtifact, HandoffContract } from '../types/departments';

// ─── Marketing Workflow States ───────────────────────────────

export type MarketingWorkflowState =
  | 'idle'                    // No active marketing work
  | 'awaiting_handoff'        // Waiting for Dev Department artifacts
  | 'researching'             // Market Research & ICP in progress
  | 'messaging'               // Content Strategy in progress
  | 'planning_launch'         // Growth & Distribution planning
  | 'executing_campaign'      // Campaigns are live
  | 'measuring'               // Analytics & Feedback collection
  | 'feedback_loop'           // Sending feedback back to Dev
  | 'post_launch_review'      // Post-launch analysis complete
  | 'trend_scanning'           // Trend Analyst scanning platforms
  | 'copywriting'              // Copywriter producing text
  | 'visual_production'        // Visual Designer creating assets
  | 'video_production'         // Video Editor producing clips
  | 'brand_review'             // Brand Guardian reviewing content
  | 'publishing'               // Publisher scheduling/posting
  | 'community_response'       // Community Manager responding
  | 'support_triage'           // Messenger Support handling DMs
  | 'sales_followup'           // Sales Agent working lead
  | 'human_escalation';        // Escalated to human operator

// ─── Marketing Agent Capabilities ────────────────────────────

export interface MarketingAgentCapability {
  agentId: string;
  role: string;
  capabilities: string[];
  memoryScope: string[];
  toolPermissions: string[];
  successMetrics: string[];
  escalationRules: EscalationRule[];
}

export interface EscalationRule {
  condition: string;
  escalateTo: string; // agent ID
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// ─── Marketing Campaign ──────────────────────────────────────

export interface MarketingCampaign {
  id: string;
  projectId: string;
  name: string;
  type: 'launch' | 'awareness' | 'acquisition' | 'retention' | 'expansion';
  status: 'draft' | 'planned' | 'active' | 'paused' | 'completed' | 'cancelled';
  channels: CampaignChannel[];
  targetMetrics: Record<string, number>;
  startDate?: string;
  endDate?: string;
  budget?: number;
  createdAt: number;
  updatedAt: number;
}

export type CampaignChannel =
  | 'seo'
  | 'paid_search'
  | 'social_organic'
  | 'social_paid'
  | 'email'
  | 'content'
  | 'community'
  | 'partnerships'
  | 'pr'
  | 'product_hunt'
  | 'referral';

// ─── Market Intelligence ─────────────────────────────────────

export interface MarketIntelligence {
  id: string;
  projectId: string;
  type: 'competitor_analysis' | 'market_sizing' | 'icp_profile' | 'jtbd_framework' | 'differentiation_map';
  title: string;
  summary: string;
  data: Record<string, unknown>;
  confidenceLevel: number; // 0-1
  sources: string[];
  createdAt: number;
  updatedAt: number;
}

// ─── Content Asset ───────────────────────────────────────────

export interface ContentAsset {
  id: string;
  projectId: string;
  type: 'landing_page' | 'blog_post' | 'email_sequence' | 'social_post' | 'press_release' | 'ad_copy' | 'video_script' | 'one_pager';
  title: string;
  status: 'draft' | 'in_review' | 'approved' | 'published' | 'archived';
  channel: CampaignChannel;
  messagingFramework?: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

// ─── Feedback Report ─────────────────────────────────────────

export interface FeedbackReport {
  id: string;
  projectId: string;
  type: 'market_feedback' | 'campaign_results' | 'kpi_dashboard' | 'trend_analysis';
  summary: string;
  findings: FeedbackFinding[];
  recommendations: string[];
  priorityItems: string[];  // Items that need Dev Department attention
  createdAt: number;
}

export interface FeedbackFinding {
  metric: string;
  currentValue: number;
  targetValue?: number;
  trend: 'improving' | 'stable' | 'declining';
  confidence: number;
  source: string;
}

// ─── Handoff State Tracking ──────────────────────────────────

export interface HandoffState {
  contractId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  receivedArtifacts: HandoffArtifact[];
  producedArtifacts: HandoffArtifact[];
  receivingAgentId: string;
  startedAt?: number;
  completedAt?: number;
  errors: string[];
}

// ─── Risk Policy ─────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskClassification {
  level: RiskLevel;
  action: 'respond' | 'draft_and_flag' | 'escalate_to_human';
  reason: string;
  autoApproved: boolean;
}

export const RISK_POLICY: Record<RiskLevel, RiskClassification> = {
  low: {
    level: 'low',
    action: 'respond',
    reason: 'Standard question within approved scope',
    autoApproved: true,
  },
  medium: {
    level: 'medium',
    action: 'draft_and_flag',
    reason: 'Requires review before sending',
    autoApproved: false,
  },
  high: {
    level: 'high',
    action: 'escalate_to_human',
    reason: 'Legal, financial, reputational, or sensitive — human only',
    autoApproved: false,
  },
};

// HIGH RISK triggers (always escalate):
export const HIGH_RISK_TRIGGERS = [
  'legal', 'lawsuit', 'court', 'attorney', 'contract dispute',
  'payment dispute', 'refund demand', 'fraud', 'chargeback',
  'mental health', 'crisis', 'threat', 'harassment',
  'data breach', 'gdpr', 'personal data request',
  'competitor denigration', 'defamation', 'pr crisis',
  'negative press', 'journalist inquiry',
];

// ─── Marketing Workflow Chain ─────────────────────────────────

export type MarketingChainStep =
  | 'trend_analyst'
  | 'content_strategist'
  | 'copywriter'
  | 'visual_designer'
  | 'video_editor'
  | 'brand_guardian'
  | 'publisher'
  | 'growth_manager'
  | 'community_manager'
  | 'messenger_support'
  | 'sales_agent'
  | 'marketing_analyst'
  | 'marketing_lead'
  | 'human';

export interface MarketingWorkflowChain {
  name: string;
  trigger: string;
  steps: MarketingChainStep[];
  requiresHumanApproval: boolean;
  estimatedDurationMin: number;
}

export const MARKETING_WORKFLOW_CHAINS: MarketingWorkflowChain[] = [
  {
    name: 'Full Content Production',
    trigger: 'produce weekly content for channels',
    steps: ['trend_analyst', 'content_strategist', 'copywriter', 'visual_designer', 'brand_guardian', 'publisher'],
    requiresHumanApproval: true,
    estimatedDurationMin: 30,
  },
  {
    name: 'Video Content',
    trigger: 'produce reels or short videos',
    steps: ['trend_analyst', 'content_strategist', 'video_editor', 'brand_guardian', 'publisher'],
    requiresHumanApproval: true,
    estimatedDurationMin: 45,
  },
  {
    name: 'Copy Only',
    trigger: 'write posts or captions',
    steps: ['content_strategist', 'copywriter', 'brand_guardian'],
    requiresHumanApproval: false,
    estimatedDurationMin: 10,
  },
  {
    name: 'Content Plan Only',
    trigger: 'build editorial calendar',
    steps: ['trend_analyst', 'content_strategist', 'marketing_lead'],
    requiresHumanApproval: false,
    estimatedDurationMin: 15,
  },
  {
    name: 'Lead Handling',
    trigger: 'inbound DM or inquiry',
    steps: ['messenger_support', 'sales_agent'],
    requiresHumanApproval: false,
    estimatedDurationMin: 5,
  },
  {
    name: 'Community Response',
    trigger: 'comment or public reply needed',
    steps: ['community_manager'],
    requiresHumanApproval: false,
    estimatedDurationMin: 2,
  },
  {
    name: 'Analytics Report',
    trigger: 'review campaign performance',
    steps: ['marketing_analyst', 'marketing_lead'],
    requiresHumanApproval: false,
    estimatedDurationMin: 20,
  },
  {
    name: 'Brand Audit',
    trigger: 'check brand consistency',
    steps: ['brand_guardian', 'marketing_lead'],
    requiresHumanApproval: false,
    estimatedDurationMin: 10,
  },
];
