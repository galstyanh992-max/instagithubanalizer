// ─── Agent OS — Planning Engine ──────────────────────────────
// Creates structured plans from user messages using heuristic rules.
// Future: replace with AI-powered planning via LLM.

import type {
  OrchestratorPlan,
  TaskClassification,
  TaskSize,
  PlanEpic,
  PlanTask,
  ExecutionMode,
} from './types';
import type { Priority, RiskLevel } from '../types/domain';
import { costEstimationEngine } from './CostEstimationEngine';
import { approvalEngine } from './ApprovalEngine';
import { agentAssignmentEngine } from './AgentAssignmentEngine';

// ─── Classification Keywords ─────────────────────────────────

interface SizeKeywordGroup {
  size: TaskSize;
  keywords: string[];
  indicators: string[];
}

const SIZE_KEYWORD_GROUPS: SizeKeywordGroup[] = [
  {
    size: 'epic',
    keywords: [
      'crm', 'erp', 'platform', 'system', 'full-stack', 'end-to-end',
      'saas', 'marketplace', 'social network', 'ecommerce', 'e-commerce',
      'build from scratch', 'complete', 'entire', 'whole application',
    ],
    indicators: [
      'multiple modules', 'several features', 'many pages',
      'complex system', 'large project',
    ],
  },
  {
    size: 'large',
    keywords: [
      'dashboard', 'admin panel', 'portal', 'integration',
      'rag system', 'rag', 'ocr system', 'ocr', 'translation system',
      'authentication', 'authorization', 'payment system',
      'real-time', 'chat', 'messaging', 'notification system',
      'search engine', 'analytics', 'reporting',
    ],
    indicators: [
      'multiple features', 'several pages', 'more than one module',
      'multi-step', 'complex feature',
    ],
  },
  {
    size: 'medium',
    keywords: [
      'feature', 'page', 'component', 'api endpoint', 'form',
      'table', 'list view', 'detail view', 'settings', 'profile',
      'crud', 'filter', 'search', 'pagination', 'modal',
      'email', 'webhook', 'import', 'export',
    ],
    indicators: [
      'new feature', 'add', 'create', 'implement',
      'build a', 'make a',
    ],
  },
  {
    size: 'small',
    keywords: [
      'fix', 'bug', 'typo', 'text', 'color', 'padding', 'margin',
      'font', 'button text', 'label', 'placeholder', 'icon',
      'rename', 'update', 'change', 'adjust', 'tweak',
      'css', 'style', 'align', 'spacing', 'border',
    ],
    indicators: [
      'just', 'simply', 'quick', 'small', 'minor',
      'only', 'just need', 'simple change',
    ],
  },
];

// ─── Plan Templates ──────────────────────────────────────────

interface PlanTemplate {
  keywords: string[];
  name: string;
  epics: Omit<PlanEpic, 'priority'>[];
}

const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    keywords: ['crm'],
    name: 'CRM System',
    epics: [
      {
        title: 'CRM Foundation',
        description: 'Core data models, database schema, and API for contacts, companies, and deals',
        tasks: [
          { title: 'Design CRM database schema', description: 'Contacts, Companies, Deals, Activities tables', priority: 'high' as Priority, assignedAgentRole: 'data_engineer', riskLevel: 'low' as RiskLevel, requiresApproval: false },
          { title: 'Implement CRM API endpoints', description: 'CRUD operations for all CRM entities', priority: 'high' as Priority, assignedAgentRole: 'backend_engineer', riskLevel: 'low' as RiskLevel, requiresApproval: false },
          { title: 'Build CRM contacts list UI', description: 'Contact list with search, filter, pagination', priority: 'high' as Priority, assignedAgentRole: 'frontend_engineer', riskLevel: 'low' as RiskLevel, requiresApproval: false },
        ],
      },
      {
        title: 'CRM Pipeline & Deals',
        description: 'Sales pipeline, deal stages, and activity tracking',
        tasks: [
          { title: 'Design pipeline data model', description: 'Deal stages, pipeline configuration', priority: 'high' as Priority, assignedAgentRole: 'data_engineer', riskLevel: 'low' as RiskLevel, requiresApproval: false },
          { title: 'Build pipeline API', description: 'Deal management and stage transitions', priority: 'medium' as Priority, assignedAgentRole: 'backend_engineer', riskLevel: 'low' as RiskLevel, requiresApproval: false },
          { title: 'Build pipeline kanban UI', description: 'Drag-and-drop pipeline board', priority: 'medium' as Priority, assignedAgentRole: 'frontend_engineer', riskLevel: 'low' as RiskLevel, requiresApproval: false },
        ],
      },
    ],
  },
  {
    keywords: ['dashboard', 'admin'],
    name: 'Dashboard',
    epics: [
      {
        title: 'Dashboard Data Layer',
        description: 'API and data aggregation for dashboard metrics',
        tasks: [
          { title: 'Design dashboard API', description: 'Aggregation endpoints for metrics, charts, and KPIs', priority: 'high' as Priority, assignedAgentRole: 'backend_engineer', riskLevel: 'low' as RiskLevel, requiresApproval: false },
          { title: 'Implement data aggregation queries', description: 'Efficient queries for dashboard statistics', priority: 'high' as Priority, assignedAgentRole: 'data_engineer', riskLevel: 'low' as RiskLevel, requiresApproval: false },
        ],
      },
      {
        title: 'Dashboard UI',
        description: 'Visual dashboard with charts and KPI cards',
        tasks: [
          { title: 'Design dashboard layout', description: 'Wireframes for dashboard cards, charts, and layout', priority: 'high' as Priority, assignedAgentRole: 'designer', riskLevel: 'low' as RiskLevel, requiresApproval: false },
          { title: 'Build dashboard components', description: 'KPI cards, charts, date pickers, filters', priority: 'high' as Priority, assignedAgentRole: 'frontend_engineer', riskLevel: 'low' as RiskLevel, requiresApproval: false },
        ],
      },
    ],
  },
  {
    keywords: ['rag', 'vector', 'embedding'],
    name: 'RAG System',
    epics: [
      {
        title: 'RAG Infrastructure',
        description: 'Vector store setup, embedding pipeline, and indexing',
        tasks: [
          { title: 'Research RAG architecture', description: 'Evaluate vector DBs, embedding models, and chunking strategies', priority: 'high' as Priority, assignedAgentRole: 'researcher', riskLevel: 'low' as RiskLevel, requiresApproval: false },
          { title: 'Set up vector store', description: 'Configure vector database and indexing', priority: 'high' as Priority, assignedAgentRole: 'data_engineer', riskLevel: 'medium' as RiskLevel, requiresApproval: false },
          { title: 'Build embedding pipeline', description: 'Document chunking and embedding generation', priority: 'high' as Priority, assignedAgentRole: 'backend_engineer', riskLevel: 'medium' as RiskLevel, requiresApproval: false },
        ],
      },
      {
        title: 'RAG Query & Retrieval',
        description: 'Query processing, retrieval, and answer generation',
        tasks: [
          { title: 'Build retrieval API', description: 'Query endpoint with similarity search and context assembly', priority: 'high' as Priority, assignedAgentRole: 'backend_engineer', riskLevel: 'low' as RiskLevel, requiresApproval: false },
          { title: 'Build RAG UI', description: 'Chat interface for RAG queries', priority: 'medium' as Priority, assignedAgentRole: 'frontend_engineer', riskLevel: 'low' as RiskLevel, requiresApproval: false },
        ],
      },
    ],
  },
  {
    keywords: ['auth', 'authentication', 'login', 'signup'],
    name: 'Authentication System',
    epics: [
      {
        title: 'Auth Backend',
        description: 'Authentication API and session management',
        tasks: [
          { title: 'Design auth architecture', description: 'Choose auth strategy (JWT, session, OAuth), define flows', priority: 'high' as Priority, assignedAgentRole: 'architect', riskLevel: 'low' as RiskLevel, requiresApproval: false },
          { title: 'Implement auth API', description: 'Login, signup, logout, password reset, email verification', priority: 'high' as Priority, assignedAgentRole: 'backend_engineer', riskLevel: 'high' as RiskLevel, requiresApproval: true },
          { title: 'Set up auth database schema', description: 'Users, sessions, accounts tables', priority: 'high' as Priority, assignedAgentRole: 'data_engineer', riskLevel: 'low' as RiskLevel, requiresApproval: false },
        ],
      },
      {
        title: 'Auth UI',
        description: 'Login, signup, and profile UI',
        tasks: [
          { title: 'Design auth UI flows', description: 'Login, signup, password reset wireframes', priority: 'high' as Priority, assignedAgentRole: 'designer', riskLevel: 'low' as RiskLevel, requiresApproval: false },
          { title: 'Build auth pages', description: 'Login, signup, forgot password, profile pages', priority: 'high' as Priority, assignedAgentRole: 'frontend_engineer', riskLevel: 'low' as RiskLevel, requiresApproval: false },
        ],
      },
    ],
  },
];

class PlanningEngine {
  private static instance: PlanningEngine | null = null;

  private constructor() {}

  static getInstance(): PlanningEngine {
    if (!PlanningEngine.instance) {
      PlanningEngine.instance = new PlanningEngine();
    }
    return PlanningEngine.instance;
  }

  /**
   * Classify a task by size based on message content
   */
  classifyTask(message: string): TaskClassification {
    const messageLower = message.toLowerCase();
    const reasons: string[] = [];
    const matchedKeywords: string[] = [];

    // Score each size category
    const scores: Record<TaskSize, number> = {
      small: 0,
      medium: 0,
      large: 0,
      epic: 0,
    };

    for (const group of SIZE_KEYWORD_GROUPS) {
      for (const keyword of group.keywords) {
        if (messageLower.includes(keyword)) {
          scores[group.size] += 3;
          matchedKeywords.push(keyword);
        }
      }
      for (const indicator of group.indicators) {
        if (messageLower.includes(indicator)) {
          scores[group.size] += 1;
        }
      }
    }

    // Word count heuristic
    const wordCount = message.split(/\s+/).length;
    if (wordCount < 8) {
      scores.small += 2;
      reasons.push('Short message suggests a small task');
    } else if (wordCount < 20) {
      scores.medium += 1;
      reasons.push('Medium-length message suggests a moderate task');
    } else if (wordCount < 50) {
      scores.large += 1;
      reasons.push('Detailed message suggests a large task');
    } else {
      scores.epic += 2;
      reasons.push('Very detailed message suggests an epic-scale task');
    }

    // Sentence count heuristic (multiple sentences → larger task)
    const sentenceCount = message.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
    if (sentenceCount > 4) {
      scores.large += 1;
      scores.epic += 1;
      reasons.push('Multiple sentences suggest a complex request');
    }

    // Find the highest scoring size
    let bestSize: TaskSize = 'medium'; // default
    let bestScore = 0;
    for (const [size, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestSize = size as TaskSize;
      }
    }

    if (matchedKeywords.length > 0) {
      reasons.push(`Keywords matched: ${matchedKeywords.slice(0, 5).join(', ')}`);
    }

    const confidence = Math.min(bestScore / 10, 1.0);

    return {
      size: bestSize,
      confidence,
      reasons,
      keywords: matchedKeywords,
    };
  }

  /**
   * Create a plan from a user message
   */
  async createPlan(
    message: string,
    workspaceId: string
  ): Promise<OrchestratorPlan> {
    const classification = this.classifyTask(message);
    const costEstimate = costEstimationEngine.estimate(classification.size, message);
    const approvalAssessment = approvalEngine.assess(message, '');

    // Try to match a plan template
    const template = this.findTemplate(message);

    let epics: PlanEpic[];
    let assumptions: string[];
    let risks: string[];
    let executionMode: ExecutionMode;

    if (template) {
      epics = template.epics.map((e) => ({
        ...e,
        priority: 'high' as Priority,
      }));
      assumptions = [
        `Using "${template.name}" plan template as starting point`,
        'Requirements will be clarified during implementation',
      ];
      executionMode = 'mixed';
    } else {
      // Generate a generic plan based on the message
      epics = await this.generateGenericPlan(message, workspaceId, classification.size);
      assumptions = [
        'Task requirements are based on the initial message',
        'Further clarification may be needed during implementation',
      ];
      executionMode = classification.size === 'small' ? 'sequential' : 'mixed';
    }

    // Identify risks
    risks = [];
    if (approvalAssessment.requiresApproval) {
      risks.push(approvalAssessment.summary);
    }
    if (classification.size === 'epic' || classification.size === 'large') {
      risks.push('Large scope — consider breaking into smaller milestones');
    }
    if (costEstimate.level === 'high' || costEstimate.level === 'potentially_high') {
      risks.push('Potentially high cost — monitor token usage carefully');
    }

    // Identify required approvals
    const requiredApprovals: string[] = [];
    if (approvalAssessment.requiresApproval) {
      requiredApprovals.push(
        `${approvalAssessment.actionType}: ${approvalAssessment.summary}`
      );
    }

    // Identify involved agents
    const involvedAgentRoles = await this.identifyInvolvedAgents(epics, workspaceId);

    return {
      goal: message,
      assumptions,
      involvedAgentRoles,
      epics,
      risks,
      requiredApprovals,
      estimatedCost: costEstimate,
      executionMode,
      taskSize: classification.size,
    };
  }

  /**
   * Find a matching plan template
   */
  private findTemplate(message: string): PlanTemplate | null {
    const messageLower = message.toLowerCase();
    for (const template of PLAN_TEMPLATES) {
      for (const keyword of template.keywords) {
        if (messageLower.includes(keyword)) {
          return template;
        }
      }
    }
    return null;
  }

  /**
   * Generate a generic plan for messages without a template match
   */
  private async generateGenericPlan(
    message: string,
    workspaceId: string,
    taskSize: TaskSize
  ): Promise<PlanEpic[]> {
    // Get agent assignment for the whole task
    const assignment = await agentAssignmentEngine.findAssignment(
      message,
      message,
      workspaceId
    );

    const approvalAssessment = approvalEngine.assess(message, '');

    if (taskSize === 'small') {
      return [
        {
          title: `Task: ${message.slice(0, 60)}`,
          description: message,
          priority: 'medium',
          tasks: [
            {
              title: message.slice(0, 100),
              description: message,
              priority: 'medium',
              assignedAgentRole: assignment.agentRole,
              riskLevel: approvalAssessment.riskLevel,
              requiresApproval: approvalAssessment.requiresApproval,
            },
          ],
        },
      ];
    }

    if (taskSize === 'medium') {
      return [
        {
          title: `Design & Plan: ${message.slice(0, 50)}`,
          description: `Design and planning for: ${message}`,
          priority: 'high',
          tasks: [
            {
              title: `Analyze requirements for: ${message.slice(0, 60)}`,
              description: 'Gather requirements and create specification',
              priority: 'high',
              assignedAgentRole: 'analyst',
              riskLevel: 'low',
              requiresApproval: false,
            },
            {
              title: `Implement: ${message.slice(0, 60)}`,
              description: `Implementation of: ${message}`,
              priority: 'high',
              assignedAgentRole: assignment.agentRole,
              riskLevel: approvalAssessment.riskLevel,
              requiresApproval: approvalAssessment.requiresApproval,
            },
            {
              title: `Test: ${message.slice(0, 60)}`,
              description: 'Verify the implementation meets requirements',
              priority: 'medium',
              assignedAgentRole: 'qa_engineer',
              riskLevel: 'low',
              requiresApproval: false,
            },
          ],
        },
      ];
    }

    // Large / Epic tasks
    return [
      {
        title: `Analysis & Architecture: ${message.slice(0, 40)}`,
        description: 'Requirements analysis and architectural decisions',
        priority: 'critical',
        tasks: [
          {
            title: `Gather requirements for: ${message.slice(0, 60)}`,
            description: 'Detailed requirement analysis and specification',
            priority: 'high',
            assignedAgentRole: 'analyst',
            riskLevel: 'low',
            requiresApproval: false,
          },
          {
            title: `Design architecture for: ${message.slice(0, 60)}`,
            description: 'System architecture and technical design',
            priority: 'high',
            assignedAgentRole: 'architect',
            riskLevel: 'low',
            requiresApproval: false,
          },
          {
            title: 'Research technologies and approaches',
            description: 'Evaluate technical options and provide recommendations',
            priority: 'medium',
            assignedAgentRole: 'researcher',
            riskLevel: 'low',
            requiresApproval: false,
          },
        ],
      },
      {
        title: `Implementation: ${message.slice(0, 40)}`,
        description: 'Core implementation of the feature/system',
        priority: 'high',
        tasks: [
          {
            title: `Implement backend: ${message.slice(0, 60)}`,
            description: 'Server-side implementation, API, data layer',
            priority: 'high',
            assignedAgentRole: 'backend_engineer',
            riskLevel: approvalAssessment.riskLevel,
            requiresApproval: approvalAssessment.requiresApproval,
          },
          {
            title: `Implement frontend: ${message.slice(0, 60)}`,
            description: 'Client-side UI components and pages',
            priority: 'high',
            assignedAgentRole: 'frontend_engineer',
            riskLevel: 'low',
            requiresApproval: false,
          },
          {
            title: 'Design UI/UX',
            description: 'User interface design and wireframes',
            priority: 'medium',
            assignedAgentRole: 'designer',
            riskLevel: 'low',
            requiresApproval: false,
          },
        ],
      },
      {
        title: `Testing & Deployment: ${message.slice(0, 40)}`,
        description: 'Quality assurance and deployment',
        priority: 'high',
        tasks: [
          {
            title: `Write tests for: ${message.slice(0, 60)}`,
            description: 'Unit, integration, and e2e tests',
            priority: 'medium',
            assignedAgentRole: 'qa_engineer',
            riskLevel: 'low',
            requiresApproval: false,
          },
          {
            title: `Deploy: ${message.slice(0, 60)}`,
            description: 'Deployment to staging and production',
            priority: 'medium',
            assignedAgentRole: 'devops_engineer',
            riskLevel: 'high',
            requiresApproval: true,
          },
        ],
      },
    ];
  }

  /**
   * Identify all unique agent roles involved in a plan
   */
  private async identifyInvolvedAgents(
    epics: PlanEpic[],
    _workspaceId: string
  ): Promise<string[]> {
    const roles = new Set<string>();
    for (const epic of epics) {
      for (const task of epic.tasks) {
        if (task.assignedAgentRole) {
          roles.add(task.assignedAgentRole);
        }
        if (task.subtasks) {
          for (const subtask of task.subtasks) {
            if (subtask.assignedAgentRole) {
              roles.add(subtask.assignedAgentRole);
            }
          }
        }
      }
    }
    return Array.from(roles);
  }
}

export const planningEngine = PlanningEngine.getInstance();
