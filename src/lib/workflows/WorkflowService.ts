// ─── Agent OS — Workflow Template Service ─────────────────────
// Manages workflow templates: listing, creating, executing,
// and seeding default templates for common multi-agent workflows.

import { db } from '../db';
import { loggers } from '@/lib/logger';

// ─── Types ──────────────────────────────────────────────────

export interface WorkflowStep {
  stepNumber: number;
  agentRole: string;
  skillKey: string;
  toolKey: string;
  description: string;
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  steps: WorkflowStep[];
  category?: string;
  icon?: string;
  version?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowTemplateWithSteps {
  id: string;
  name: string;
  description: string | null;
  steps: WorkflowStep[];
  category: string | null;
  icon: string | null;
  version: string;
  status: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStepResult {
  stepNumber: number;
  agentRole: string;
  description: string;
  status: 'completed' | 'failed' | 'skipped';
  result?: string;
  error?: string;
  durationMs: number;
}

export interface ExecutionResult {
  templateId: string;
  templateName: string;
  status: 'completed' | 'failed' | 'partial';
  message: string;
  input: Record<string, unknown>;
  stepResults: WorkflowStepResult[];
  completedSteps: number;
  totalSteps: number;
  startedAt: Date;
  completedAt: Date;
  totalDurationMs: number;
}

// ─── Default Workflow Definitions ────────────────────────────

const DEFAULT_WORKFLOWS: CreateWorkflowInput[] = [
  {
    name: 'Feature Development',
    description:
      'End-to-end feature development workflow: Architect designs the solution, Frontend/Backend engineers implement it, QA validates the result.',
    category: 'development',
    icon: '🚀',
    steps: [
      {
        stepNumber: 1,
        agentRole: 'architect',
        skillKey: 'planning',
        toolKey: 'calculator',
        description: 'Design the feature architecture and create implementation plan',
      },
      {
        stepNumber: 2,
        agentRole: 'frontend_engineer',
        skillKey: 'validation',
        toolKey: 'file_reader',
        description: 'Implement frontend components and user interface',
      },
      {
        stepNumber: 3,
        agentRole: 'backend_engineer',
        skillKey: 'validation',
        toolKey: 'http_request',
        description: 'Implement backend API endpoints and business logic',
      },
      {
        stepNumber: 4,
        agentRole: 'qa_engineer',
        skillKey: 'planning',
        toolKey: 'calculator',
        description: 'Write and execute tests, validate the feature meets requirements',
      },
    ],
  },
  {
    name: 'Bug Investigation',
    description:
      'Systematic bug investigation: Analyst reproduces and analyzes the bug, Developer implements a fix, QA verifies the fix.',
    category: 'development',
    icon: '🐛',
    steps: [
      {
        stepNumber: 1,
        agentRole: 'analyst',
        skillKey: 'planning',
        toolKey: 'http_request',
        description: 'Reproduce the bug, analyze root cause, and document findings',
      },
      {
        stepNumber: 2,
        agentRole: 'backend_engineer',
        skillKey: 'validation',
        toolKey: 'file_reader',
        description: 'Implement the bug fix based on analysis findings',
      },
      {
        stepNumber: 3,
        agentRole: 'qa_engineer',
        skillKey: 'planning',
        toolKey: 'calculator',
        description: 'Verify the fix resolves the bug without regressions',
      },
    ],
  },
  {
    name: 'Research Report',
    description:
      'Research and report generation: Researcher gathers information, Analyst synthesizes findings, Designer formats the final report.',
    category: 'research',
    icon: '📊',
    steps: [
      {
        stepNumber: 1,
        agentRole: 'researcher',
        skillKey: 'summarization',
        toolKey: 'http_request',
        description: 'Conduct research and gather relevant information from sources',
      },
      {
        stepNumber: 2,
        agentRole: 'analyst',
        skillKey: 'planning',
        toolKey: 'calculator',
        description: 'Analyze findings, identify patterns, and synthesize key insights',
      },
      {
        stepNumber: 3,
        agentRole: 'designer',
        skillKey: 'summarization',
        toolKey: 'file_reader',
        description: 'Format and design the final research report with visual elements',
      },
    ],
  },
  {
    name: 'Code Review',
    description:
      'Structured code review: Developer reviews code changes, Security Engineer checks for vulnerabilities, QA validates test coverage.',
    category: 'review',
    icon: '🔍',
    steps: [
      {
        stepNumber: 1,
        agentRole: 'backend_engineer',
        skillKey: 'validation',
        toolKey: 'file_reader',
        description: 'Review code changes for correctness, style, and best practices',
      },
      {
        stepNumber: 2,
        agentRole: 'security_engineer',
        skillKey: 'validation',
        toolKey: 'http_request',
        description: 'Analyze code for security vulnerabilities and compliance issues',
      },
      {
        stepNumber: 3,
        agentRole: 'qa_engineer',
        skillKey: 'planning',
        toolKey: 'calculator',
        description: 'Verify test coverage and validate test quality',
      },
    ],
  },
  {
    name: 'Deployment Pipeline',
    description:
      'Production deployment workflow: Developer prepares the release, DevOps Engineer handles infrastructure deployment, Security Engineer performs final checks.',
    category: 'deployment',
    icon: '🚢',
    steps: [
      {
        stepNumber: 1,
        agentRole: 'backend_engineer',
        skillKey: 'validation',
        toolKey: 'file_reader',
        description: 'Prepare release artifacts and verify build integrity',
      },
      {
        stepNumber: 2,
        agentRole: 'devops_engineer',
        skillKey: 'planning',
        toolKey: 'http_request',
        description: 'Deploy to staging, run smoke tests, and promote to production',
      },
      {
        stepNumber: 3,
        agentRole: 'security_engineer',
        skillKey: 'validation',
        toolKey: 'http_request',
        description: 'Perform post-deployment security validation and monitoring setup',
      },
    ],
  },
];

// ─── WorkflowService ──────────────────────────────────────

class WorkflowService {
  private static instance: WorkflowService | null = null;

  private constructor() {}

  static getInstance(): WorkflowService {
    if (!WorkflowService.instance) {
      WorkflowService.instance = new WorkflowService();
    }
    return WorkflowService.instance;
  }

  // ─── List Templates ──────────────────────────────────

  /**
   * List workflow templates, optionally filtered by category.
   */
  async listTemplates(category?: string): Promise<WorkflowTemplateWithSteps[]> {
    const where = category ? { category } : {};

    const templates = await db.workflowTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return templates.map((t) => this.parseTemplate(t));
  }

  // ─── Get Template ──────────────────────────────────

  /**
   * Get a single workflow template by ID with parsed steps.
   */
  async getTemplate(id: string): Promise<WorkflowTemplateWithSteps | null> {
    const template = await db.workflowTemplate.findUnique({
      where: { id },
    });

    if (!template) return null;
    return this.parseTemplate(template);
  }

  // ─── Create Template ──────────────────────────────────

  /**
   * Create a new workflow template from the given input data.
   */
  async createTemplate(data: CreateWorkflowInput): Promise<WorkflowTemplateWithSteps> {
    const template = await db.workflowTemplate.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        steps: JSON.stringify(data.steps),
        category: data.category ?? null,
        icon: data.icon ?? null,
        version: data.version ?? '1.0.0',
        status: 'available',
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });

    return this.parseTemplate(template);
  }

  // ─── Execute Template (Real Implementation) ──────────────────

  /**
   * Execute a workflow template step-by-step via OrchestratorChatEngine.
   *
   * Each WorkflowStep becomes a targeted chat() call. The output of each
   * step is appended to a rolling context string passed into the next step,
   * enabling information chaining across agents.
   *
   * Failure policy: step failure → marks workflow 'partial', continues
   * remaining steps. Caller receives full per-step breakdown.
   */
  async executeTemplate(
    templateId: string,
    input: Record<string, unknown>,
    workspaceId?: string
  ): Promise<ExecutionResult> {
    const startedAt = new Date();

    // 1. Load template
    const template = await db.workflowTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new Error(`Workflow template not found: ${templateId}`);

    const parsed = this.parseTemplate({
      ...template,
      steps: typeof template.steps === 'string' ? template.steps : JSON.stringify(template.steps),
      description: template.description ?? null,
      category: template.category ?? null,
      icon: template.icon ?? null,
      version: template.version ?? '1.0.0',
      metadata: template.metadata ?? null,
    });

    if (parsed.steps.length === 0) {
      return {
        templateId, templateName: template.name, status: 'failed',
        message: 'Workflow template has no steps defined.',
        input, stepResults: [], completedSteps: 0, totalSteps: 0,
        startedAt, completedAt: new Date(), totalDurationMs: 0,
      };
    }

    // 2. Lazy-import to avoid circular dependency
    const { orchestratorChatEngine } = await import('../orchestrator/OrchestratorChatEngine');

    // 3. Rolling context — seeded with caller input, grows with each step output
    let rollingContext =
      `Workflow: "${template.name}"\n` +
      (template.description ? `Description: ${template.description}\n` : '') +
      `Input: ${JSON.stringify(input, null, 2)}`;

    const stepResults: WorkflowStepResult[] = [];
    let completedSteps = 0;
    let overallStatus: ExecutionResult['status'] = 'completed';

    // 4. Sequential step execution
    for (const step of parsed.steps) {
      const stepStart = Date.now();
      loggers.orchestrator.info(
        `[Workflow] Step ${step.stepNumber}/${parsed.steps.length}: ${step.agentRole} — ${step.description}`
      );

      const stepMessage =
        `[Workflow Step ${step.stepNumber}/${parsed.steps.length}] ${step.description}\n\n` +
        `Context from previous steps:\n${rollingContext}`;

      try {
        const chatResponse = await orchestratorChatEngine.chat({
          message: stepMessage,
          workspaceId,
          mode: 'auto',
        });

        stepResults.push({
          stepNumber: step.stepNumber,
          agentRole: step.agentRole,
          description: step.description,
          status: 'completed',
          result: chatResponse.orchestratorResponse,
          durationMs: Date.now() - stepStart,
        });
        completedSteps++;

        // Chain output into next step context (capped at 1500 chars)
        rollingContext +=
          `\n\n--- Step ${step.stepNumber} (${step.agentRole}) ---\n` +
          chatResponse.orchestratorResponse.slice(0, 1500);

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        loggers.orchestrator.error({ err }, `[Workflow] Step ${step.stepNumber} failed`);
        stepResults.push({
          stepNumber: step.stepNumber, agentRole: step.agentRole,
          description: step.description, status: 'failed',
          error: errorMsg, durationMs: Date.now() - stepStart,
        });
        overallStatus = 'partial';
      }
    }

    if (completedSteps === 0) overallStatus = 'failed';
    const completedAt = new Date();
    const totalDurationMs = completedAt.getTime() - startedAt.getTime();

    loggers.orchestrator.info(
      `[Workflow] "${template.name}" — ${completedSteps}/${parsed.steps.length} steps in ${totalDurationMs}ms`
    );

    return {
      templateId, templateName: template.name,
      status: overallStatus,
      message:
        overallStatus === 'completed'
          ? `Workflow "${template.name}" completed (${completedSteps}/${parsed.steps.length} steps).`
          : overallStatus === 'partial'
          ? `Workflow "${template.name}" partial (${completedSteps}/${parsed.steps.length} steps succeeded).`
          : `Workflow "${template.name}" failed — 0 steps completed.`,
      input, stepResults, completedSteps,
      totalSteps: parsed.steps.length,
      startedAt, completedAt, totalDurationMs,
    };
  }

  // ─── Seed Default Templates ──────────────────────────────────

  /**
   * Seed 5 default workflow templates if they don't already exist.
   * Uses the template name as a uniqueness check to avoid duplicates.
   */
  async seedDefaults(): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const workflow of DEFAULT_WORKFLOWS) {
      // Check if a template with this name already exists
      const existing = await db.workflowTemplate.findFirst({
        where: { name: workflow.name },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await db.workflowTemplate.create({
        data: {
          name: workflow.name,
          description: workflow.description ?? null,
          steps: JSON.stringify(workflow.steps),
          category: workflow.category ?? null,
          icon: workflow.icon ?? null,
          version: workflow.version ?? '1.0.0',
          status: 'available',
          metadata: workflow.metadata ? JSON.stringify(workflow.metadata) : null,
        },
      });

      created++;
    }

    return { created, skipped };
  }

  // ─── Private Helpers ──────────────────────────────────

  /**
   * Parse a raw database template record into a typed object with parsed steps.
   */
  private parseTemplate(raw: {
    id: string;
    name: string;
    description: string | null;
    steps: string;
    category: string | null;
    icon: string | null;
    version: string;
    status: string;
    metadata: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): WorkflowTemplateWithSteps {
    let parsedSteps: WorkflowStep[];
    try {
      parsedSteps = JSON.parse(raw.steps) as WorkflowStep[];
    } catch {
      parsedSteps = [];
    }

    let parsedMetadata: Record<string, unknown> | null = null;
    if (raw.metadata) {
      try {
        parsedMetadata = JSON.parse(raw.metadata) as Record<string, unknown>;
      } catch {
        parsedMetadata = null;
      }
    }

    return {
      id: raw.id,
      name: raw.name,
      description: raw.description,
      steps: parsedSteps,
      category: raw.category,
      icon: raw.icon,
      version: raw.version,
      status: raw.status,
      metadata: parsedMetadata,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }
}

// Export singleton instance
export const workflowService = WorkflowService.getInstance();
