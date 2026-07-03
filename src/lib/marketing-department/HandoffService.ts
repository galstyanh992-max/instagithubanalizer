// ─── Marketing Department — Handoff Service ──────────────────
// Manages cross-department handoffs between Dev and Marketing.
// All inter-department communication flows through this service.

import { marketingDepartmentRegistry } from './MarketingDepartmentRegistry';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import { Departments, DEV_TO_MARKETING_ARTIFACTS, MARKETING_TO_DEV_ARTIFACTS } from '../types/departments';
import type { HandoffArtifact, HandoffContract } from '../types/departments';
import type { FeedbackReport } from './types';

// ─── Handoff Result ──────────────────────────────────────────

export interface HandoffResult {
  success: boolean;
  contractId: string;
  message: string;
  artifactsReceived?: HandoffArtifact[];
  artifactsProduced?: HandoffArtifact[];
  errors?: string[];
}

// ─── Handoff Service Singleton ───────────────────────────────

class HandoffService {
  private static instance: HandoffService | null = null;

  private constructor() {}

  static getInstance(): HandoffService {
    if (!HandoffService.instance) {
      HandoffService.instance = new HandoffService();
    }
    return HandoffService.instance;
  }

  /**
   * Initiate a handoff from Dev to Marketing.
   * Called by the orchestrator when a Dev milestone is reached.
   */
  async initiateDevToMarketingHandoff(
    eventType: string,
    workspaceId: string,
    projectId: string,
    artifacts: HandoffArtifact[],
    emittedBy: string,
  ): Promise<HandoffResult> {
    const contractId = `handoff_${eventType}_${Departments.MARKETING}`;

    // Validate required artifacts
    const missingArtifacts = this.validateRequiredArtifacts(
      artifacts,
      DEV_TO_MARKETING_ARTIFACTS,
    );

    if (missingArtifacts.length > 0) {
      // Still proceed but log missing artifacts
      marketingDepartmentRegistry.updateHandoffState(contractId, {
        status: 'in_progress',
        startedAt: Date.now(),
        receivedArtifacts: artifacts,
        errors: [`Missing recommended artifacts: ${missingArtifacts.join(', ')}`],
      });
    } else {
      marketingDepartmentRegistry.updateHandoffState(contractId, {
        status: 'in_progress',
        startedAt: Date.now(),
        receivedArtifacts: artifacts,
        errors: [],
      });
    }

    // Emit the handoff event so marketing agents can react
    try {
      await eventBus.emit(eventType as import('../types/events').EventType, {
        workspaceId,
        projectId,
        ...this.buildEventPayload(eventType, projectId, artifacts, emittedBy),
        timestamp: Date.now(),
        source: 'handoff-service',
      } as any);
    } catch (error) {
      return {
        success: false,
        contractId,
        message: `Failed to emit handoff event: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errors: [String(error)],
      };
    }

    return {
      success: true,
      contractId,
      message: `Handoff initiated: ${eventType}. Marketing Lead will receive artifacts.`,
      artifactsReceived: artifacts,
    };
  }

  /**
   * Send feedback from Marketing back to Dev.
   * This is the feedback loop that closes the cycle.
   */
  async sendFeedbackToDev(
    workspaceId: string,
    projectId: string,
    feedbackReport: FeedbackReport,
  ): Promise<HandoffResult> {
    const contractId = `handoff_${EventTypes.MARKET_FEEDBACK_COLLECTED}_${Departments.DEV}`;

    // Create feedback artifacts
    const feedbackArtifacts: HandoffArtifact[] = [
      {
        type: 'document',
        name: 'Feedback Report for Product Team',
        content: feedbackReport.summary,
        format: 'markdown',
      },
      ...feedbackReport.priorityItems.map((item, idx) => ({
        type: 'document' as const,
        name: `Priority Item ${idx + 1}`,
        content: item,
        format: 'markdown' as const,
      })),
    ];

    // Emit the market_feedback_collected event
    try {
      await eventBus.emit(EventTypes.MARKET_FEEDBACK_COLLECTED, {
        workspaceId,
        projectId,
        feedbackType: feedbackReport.type,
        summary: feedbackReport.summary,
        dataPoints: feedbackReport.findings.length,
        emittedBy: 'marketing_analyst',
        timestamp: Date.now(),
        source: 'handoff-service',
      });
    } catch (error) {
      return {
        success: false,
        contractId,
        message: `Failed to send feedback: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errors: [String(error)],
      };
    }

    // Update handoff state
    marketingDepartmentRegistry.updateHandoffState(contractId, {
      status: 'completed',
      completedAt: Date.now(),
      producedArtifacts: feedbackArtifacts,
    });

    return {
      success: true,
      contractId,
      message: 'Feedback delivered to Dev Department via orchestrator.',
      artifactsProduced: feedbackArtifacts,
    };
  }

  /**
   * Complete a handoff by producing output artifacts.
   */
  async completeHandoff(
    contractId: string,
    producedArtifacts: HandoffArtifact[],
  ): Promise<HandoffResult> {
    const updated = marketingDepartmentRegistry.updateHandoffState(contractId, {
      status: 'completed',
      completedAt: Date.now(),
      producedArtifacts,
    });

    if (!updated) {
      return {
        success: false,
        contractId,
        message: `Handoff state not found: ${contractId}`,
        errors: ['Handoff state not found'],
      };
    }

    return {
      success: true,
      contractId,
      message: 'Handoff completed successfully.',
      artifactsProduced: producedArtifacts,
    };
  }

  // ── Helpers ──────────────────────────────────────────────

  private validateRequiredArtifacts(
    provided: HandoffArtifact[],
    required: HandoffArtifact[],
  ): string[] {
    const providedNames = new Set(provided.map(a => a.name));
    return required
      .filter(r => !providedNames.has(r.name))
      .map(r => r.name);
  }

  private buildEventPayload(
    eventType: string,
    projectId: string,
    artifacts: HandoffArtifact[],
    emittedBy: string,
  ): Record<string, unknown> {
    const base = { projectId, emittedBy };

    switch (eventType) {
      case EventTypes.PRODUCT_CONCEPT_READY:
        return {
          ...base,
          productBrief: artifacts.find(a => a.name === 'Product Brief')?.content ?? '',
          targetUserHypothesis: artifacts.find(a => a.name === 'Target User Hypothesis')?.content ?? '',
          knownConstraints: artifacts.find(a => a.name === 'Known Constraints / Limitations')?.content?.split('\n') ?? [],
        };
      case EventTypes.MVP_READY_FOR_MARKETING:
        return {
          ...base,
          prd: artifacts.find(a => a.name === 'PRD / Feature Summary')?.content ?? '',
          changelog: artifacts.find(a => a.name === 'Changelog / Release Notes')?.content ?? '',
          demoUrl: artifacts.find(a => a.name === 'Demo / Screenshots')?.content,
        };
      case EventTypes.RELEASE_CANDIDATE_READY:
        return {
          ...base,
          releaseNotes: artifacts.find(a => a.name === 'Changelog / Release Notes')?.content ?? '',
          version: '1.0.0',
          features: [],
          knownIssues: [],
        };
      default:
        return base;
    }
  }
}

export const handoffService = HandoffService.getInstance();
