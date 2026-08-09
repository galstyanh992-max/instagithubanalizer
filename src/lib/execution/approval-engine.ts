import crypto from 'crypto';
import { PrismaClient, ExecutionPlan, ExecutionStep } from '@/generated/prisma';

const prisma = new PrismaClient();

export class ApprovalEngine {
  /**
   * Generates a deterministic SHA-256 fingerprint for an Execution Plan.
   * Any change in steps, capabilities, or limits will result in a different fingerprint.
   */
  public static generateFingerprint(plan: ExecutionPlan, steps: ExecutionStep[]): string {
    const payload = {
      workerType: plan.workerType,
      capabilityIds: plan.capabilityIds,
      riskLevel: plan.riskLevel,
      limits: plan.limits,
      steps: steps.map(s => ({
        type: s.type,
        executableId: s.executableId,
        args: s.args,
        cwdRelative: s.cwdRelative,
        environmentProfile: s.environmentProfile,
        timeoutMs: s.timeoutMs,
        expectedOutputs: s.expectedOutputs,
        sequence: s.sequence
      })).sort((a, b) => a.sequence - b.sequence)
    };

    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(payload));
    return hash.digest('hex');
  }

  /**
   * Validates if a given Execution Plan has a valid, consumed ApprovalRequest
   * that matches its fingerprint.
   */
  public static async validateApproval(planId: string, expectedFingerprint: string): Promise<boolean> {
    const approval = await prisma.approvalRequest.findFirst({
      where: {
        planId: planId,
        status: 'approved',
        actionFingerprint: expectedFingerprint,
      }
    });

    if (!approval) {
      return false;
    }

    // Ensure it hasn't expired
    if (approval.expiresAt && approval.expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Consumes an approval atomically.
   */
  public static async consumeApproval(approvalId: string): Promise<boolean> {
    const res = await prisma.approvalRequest.updateMany({
      where: {
        id: approvalId,
        status: 'approved',
        consumedAt: null
      },
      data: {
        status: 'consumed',
        consumedAt: new Date()
      }
    });

    return res.count > 0;
  }
}
