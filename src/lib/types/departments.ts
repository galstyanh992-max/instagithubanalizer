// ─── Agent OS — Department Types ──────────────────────────────
// Defines the department abstraction for organizational structure.
// Each department is a bounded context with its own agents, zones,
// events, and handoff contracts.

// ─── Department Constants ─────────────────────────────────────

export const Departments = {
  DEV: 'dev_department',
  MARKETING: 'marketing_department',
} as const;

export type Department = (typeof Departments)[keyof typeof Departments];

// ─── Department Agent Mapping ────────────────────────────────

export const DepartmentAgents: Record<Department, string[]> = {
  dev_department: [
    'orchestrator',
    'analyst',
    'architect',
    'designer',
    'frontend_engineer',
    'backend_engineer',
    'data_engineer',
    'qa_engineer',
    'devops_engineer',
    'security_engineer',
    'researcher',
  ],
  marketing_department: [
    // Strategy & Intelligence
    'marketing_lead',
    'market_researcher',
    'trend_analyst',
    // Content Production
    'content_strategist',
    'copywriter',
    'visual_designer',
    'video_editor',
    // Brand & Quality
    'brand_guardian',
    // Distribution & Growth
    'publisher',
    'growth_manager',
    // Community & Sales
    'community_manager',
    'messenger_support',
    'sales_agent',
    // Measurement
    'marketing_analyst',
  ],
};

// ─── Department Zones ─────────────────────────────────────────

export const DepartmentZones: Record<Department, string[]> = {
  dev_department: [
    'command_area',
    'situation_room',
    'development_area',
    'design_area',
    'research_area',
    'server_room',
    'meeting_room',
    'lounge_area',
  ],
  marketing_department: [
    'marketing_area',
    'content_studio',
    'growth_lab',
    'brand_studio',
  ],
};

// ─── Handoff Contract Types ───────────────────────────────────

export interface HandoffArtifact {
  /** Artifact type identifier */
  type: string;
  /** Artifact name */
  name: string;
  /** Artifact content or description */
  content: string;
  /** Format of the content (markdown, json, url, etc.) */
  format: 'markdown' | 'json' | 'url' | 'text';
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

export interface HandoffContract {
  /** Unique contract ID */
  id: string;
  /** Source department */
  fromDepartment: Department;
  /** Target department */
  toDepartment: Department;
  /** Event type that triggers this handoff */
  triggerEvent: string;
  /** Required input artifacts from source */
  inputArtifacts: HandoffArtifact[];
  /** Expected output artifacts from target */
  outputArtifacts: HandoffArtifact[];
  /** Agent responsible for receiving the handoff in target department */
  receivingAgent: string;
  /** Conditions for handoff completion */
  completionConditions: string[];
}

// ─── Dev → Marketing Required Input Artifacts ─────────────────

export const DEV_TO_MARKETING_ARTIFACTS: HandoffArtifact[] = [
  { type: 'document', name: 'Product Brief', content: '', format: 'markdown' },
  { type: 'document', name: 'PRD / Feature Summary', content: '', format: 'markdown' },
  { type: 'document', name: 'Changelog / Release Notes', content: '', format: 'markdown' },
  { type: 'media', name: 'Demo / Screenshots', content: '', format: 'url' },
  { type: 'document', name: 'Target User Hypothesis', content: '', format: 'markdown' },
  { type: 'document', name: 'Known Constraints / Limitations', content: '', format: 'markdown' },
  { type: 'document', name: 'Roadmap Hints', content: '', format: 'markdown' },
];

// ─── Marketing → Dev Required Output Artifacts ────────────────

export const MARKETING_TO_DEV_ARTIFACTS: HandoffArtifact[] = [
  { type: 'document', name: 'Positioning Brief', content: '', format: 'markdown' },
  { type: 'document', name: 'ICP / Persona Summary', content: '', format: 'markdown' },
  { type: 'document', name: 'Competitor Snapshot', content: '', format: 'markdown' },
  { type: 'document', name: 'Messaging Framework', content: '', format: 'markdown' },
  { type: 'document', name: 'Launch Plan', content: '', format: 'markdown' },
  { type: 'document', name: 'Channel Strategy', content: '', format: 'markdown' },
  { type: 'document', name: 'Content Backlog', content: '', format: 'markdown' },
  { type: 'document', name: 'Campaign Experiments Backlog', content: '', format: 'markdown' },
  { type: 'document', name: 'KPI Dashboard Definition', content: '', format: 'markdown' },
  { type: 'document', name: 'Feedback Report for Product Team', content: '', format: 'markdown' },
];

// ─── Department KPI Definitions ───────────────────────────────

export interface DepartmentKPI {
  key: string;
  name: string;
  description: string;
  unit: string;
  target?: number;
}

export const DEV_DEPARTMENT_KPIS: DepartmentKPI[] = [
  { key: 'features_delivered', name: 'Features Delivered', description: 'Number of features shipped', unit: 'count' },
  { key: 'bug_resolution_time', name: 'Bug Resolution Time', description: 'Average time to resolve bugs', unit: 'hours' },
  { key: 'code_coverage', name: 'Code Coverage', description: 'Test code coverage percentage', unit: 'percent' },
  { key: 'deployment_frequency', name: 'Deployment Frequency', description: 'Deployments per week', unit: 'count' },
];

export const MARKETING_DEPARTMENT_KPIS: DepartmentKPI[] = [
  { key: 'mqls_generated', name: 'MQLs Generated', description: 'Marketing qualified leads', unit: 'count' },
  { key: 'cac', name: 'Customer Acquisition Cost', description: 'Cost to acquire a customer', unit: 'usd' },
  { key: 'channel_roi', name: 'Channel ROI', description: 'Return on investment per channel', unit: 'percent' },
  { key: 'content_engagement', name: 'Content Engagement', description: 'Engagement rate on content', unit: 'percent' },
  { key: 'brand_awareness', name: 'Brand Awareness', description: 'Brand mention/share of voice', unit: 'percent' },
  { key: 'conversion_rate', name: 'Conversion Rate', description: 'Visitor to signup conversion', unit: 'percent' },
];

// ─── Helper Functions ─────────────────────────────────────────

export function getAgentDepartment(agentRole: string): Department {
  for (const [dept, agents] of Object.entries(DepartmentAgents)) {
    if (agents.includes(agentRole)) {
      return dept as Department;
    }
  }
  return Departments.DEV; // default fallback
}

export function getDepartmentZones(department: Department): string[] {
  return DepartmentZones[department] ?? [];
}

export function isMarketingAgent(agentRole: string): boolean {
  return DepartmentAgents.marketing_department.includes(agentRole);
}

export function isDevAgent(agentRole: string): boolean {
  return DepartmentAgents.dev_department.includes(agentRole);
}
