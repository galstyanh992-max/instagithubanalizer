import { db } from '@/lib/db'
import type { VerificationResult, VerificationStatus, VerificationType } from './types';

export interface CreateVerificationInput {
  runId: string;
  type: VerificationType;
  status: VerificationStatus;
  evidence: string;
  findings?: string[];
  durationMs?: number;
}

// ─── Verification Store ──────────────────────────────────────

export async function createVerificationResult(
  input: CreateVerificationInput
): Promise<VerificationResult> {
  const record = await db.verificationResult.create({
    data: {
      runId: input.runId,
      type: input.type,
      status: input.status,
      evidence: input.evidence,
      findings: JSON.stringify(input.findings ?? []),
      durationMs: input.durationMs,
    },
  });

  return mapDbVerification(record);
}

export async function listVerificationResults(runId: string): Promise<VerificationResult[]> {
  const records = await db.verificationResult.findMany({
    where: { runId },
    orderBy: { createdAt: 'asc' },
  });

  return records.map(mapDbVerification);
}

export async function getVerificationResult(id: string): Promise<VerificationResult | null> {
  const record = await db.verificationResult.findUnique({ where: { id } });
  if (!record) return null;
  return mapDbVerification(record);
}

// ─── Mapper ──────────────────────────────────────────────────

function mapDbVerification(
  dbRecord: Awaited<ReturnType<typeof db.verificationResult.create>>
): VerificationResult {
  return {
    id: dbRecord.id,
    runId: dbRecord.runId,
    type: dbRecord.type as VerificationType,
    status: dbRecord.status as VerificationStatus,
    evidence: dbRecord.evidence,
    findings: JSON.parse(dbRecord.findings) as string[],
    durationMs: dbRecord.durationMs ?? undefined,
    createdAt: dbRecord.createdAt,
  };
}

