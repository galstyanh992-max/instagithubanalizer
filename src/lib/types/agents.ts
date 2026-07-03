// ─── Agent OS — Agent Configuration Types ────────────────────

import type { AgentStatus, OfficeZone, AgentType } from './domain';

// ─── Default Agent Definitions ───────────────────────────────

export interface DefaultAgentConfig {
  name: string;
  role: string;
  type: AgentType;
  professionalStyle: {
    communicationStyle: string;
    decisionMaking: string;
    attentionToDetail: string;
    collaborationStyle: string;
  };
  visualProfile: {
    color: string;       // Agent's theme color (hex)
    icon: string;        // Lucide icon name
    avatarEmoji: string; // Emoji representation
  };
  defaultStatus: AgentStatus;
  defaultLocationZone: OfficeZone;
  systemPrompt: string;
}

// ─── Agent Role Constants ────────────────────────────────────

export const AgentRoles = {
  ORCHESTRATOR: 'orchestrator',
  ANALYST: 'analyst',
  ARCHITECT: 'architect',
  DESIGNER: 'designer',
  FRONTEND_ENGINEER: 'frontend_engineer',
  BACKEND_ENGINEER: 'backend_engineer',
  DATA_ENGINEER: 'data_engineer',
  QA_ENGINEER: 'qa_engineer',
  DEVOPS_ENGINEER: 'devops_engineer',
  SECURITY_ENGINEER: 'security_engineer',
  RESEARCHER: 'researcher',
  MARKETING_LEAD: 'marketing_lead',
  MARKET_RESEARCHER: 'market_researcher',
  CONTENT_STRATEGIST: 'content_strategist',
  GROWTH_MANAGER: 'growth_manager',
  MARKETING_ANALYST: 'marketing_analyst',
  // New full marketing team
  TREND_ANALYST: 'trend_analyst',
  COPYWRITER: 'copywriter',
  VISUAL_DESIGNER: 'visual_designer',
  VIDEO_EDITOR: 'video_editor',
  PUBLISHER: 'publisher',
  COMMUNITY_MANAGER: 'community_manager',
  MESSENGER_SUPPORT: 'messenger_support',
  SALES_AGENT: 'sales_agent',
  BRAND_GUARDIAN: 'brand_guardian',
} as const;

export type AgentRole = (typeof AgentRoles)[keyof typeof AgentRoles];

// ─── Zone-Agent Mapping ──────────────────────────────────────

export const ZoneDefaultAgents: Record<OfficeZone, string[]> = {
  command_area: [AgentRoles.ORCHESTRATOR],
  situation_room: [AgentRoles.ANALYST, AgentRoles.ORCHESTRATOR],
  development_area: [AgentRoles.FRONTEND_ENGINEER, AgentRoles.BACKEND_ENGINEER],
  design_area: [AgentRoles.DESIGNER],
  research_area: [AgentRoles.RESEARCHER, AgentRoles.ANALYST],
  server_room: [AgentRoles.DEVOPS_ENGINEER, AgentRoles.DATA_ENGINEER, AgentRoles.SECURITY_ENGINEER],
  meeting_room: [AgentRoles.ARCHITECT, AgentRoles.ANALYST],
  lounge_area: [],
  marketing_area: [AgentRoles.MARKETING_LEAD, AgentRoles.MARKET_RESEARCHER, AgentRoles.TREND_ANALYST],
  content_studio: [AgentRoles.CONTENT_STRATEGIST],
  growth_lab: [AgentRoles.GROWTH_MANAGER, AgentRoles.MARKETING_ANALYST, AgentRoles.PUBLISHER, AgentRoles.SALES_AGENT],
  brand_studio: [AgentRoles.BRAND_GUARDIAN, AgentRoles.COPYWRITER, AgentRoles.VISUAL_DESIGNER, AgentRoles.VIDEO_EDITOR, AgentRoles.COMMUNITY_MANAGER, AgentRoles.MESSENGER_SUPPORT],
};
