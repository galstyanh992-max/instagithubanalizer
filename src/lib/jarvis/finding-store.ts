import { db } from '@/lib/db'
import type { Finding, FindingSeverity, FindingStatus } from './types';

export interface CreateFindingInput {
  runId: string;
  severity: FindingSeverity;
  evidence: string;
  rootCause?: string;
  fixSummary?: string;
  fixArtifactId?: string;
}

export interface FindingFilter {
  runId: string;
  severity?: FindingSeverity;
  status?: FindingStatus;
}

// ─── Finding Store ───────────────────────────────────────────

export async function createFinding(input: CreateFindingInput): Promise<Finding> {
  const finding = await db.finding.create({
    data: {
      runId: input.runId,
      severity: input.severity,
      status: 'open',
      evidence: input.evidence,
      rootCause: input.rootCause,
      fixSummary: input.fixSummary,
      fixArtifactId: input.fixArtifactId,
    },
  });

  return mapDbFinding(finding);
}

export async function listFindings(filter: FindingFilter): Promise<Finding[]> {
  const findings = await db.finding.findMany({
    where: {
      runId: filter.runId,
      ...(filter.severity ? { severity: filter.severity } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  return findings.map(mapDbFinding);
}

export async function getFinding(findingId: string): Promise<Finding | null> {
  const finding = await db.finding.findUnique({
    where: { id: findingId },
  });
  if (!finding) return null;
  return mapDbFinding(finding);
}

export async function updateFindingStatus(
  findingId: string,
  status: FindingStatus,
  updates?: {
    fixSummary?: string;
    fixArtifactId?: string;
    verificationId?: string;
  }
): Promise<Finding> {
  const finding = await db.finding.update({
    where: { id: findingId },
    data: {
      status,
      ...(updates?.fixSummary !== undefined ? { fixSummary: updates.fixSummary } : {}),
      ...(updates?.fixArtifactId !== undefined ? { fixArtifactId: updates.fixArtifactId } : {}),
      ...(updates?.verificationId !== undefined ? { verificationId: updates.verificationId } : {}),
    },
  });

  return mapDbFinding(finding);
}

export async function deleteFinding(findingId: string): Promise<void> {
  await db.finding.delete({ where: { id: findingId } });
}

// ─── Mapper ──────────────────────────────────────────────────

function mapDbFinding(
  dbFinding: Awaited<ReturnType<typeof db.finding.create>>
): Finding {
  return {
    id: dbFinding.id,
    runId: dbFinding.runId,
    severity: dbFinding.severity as FindingSeverity,
    status: dbFinding.status as FindingStatus,
    evidence: dbFinding.evidence,
    rootCause: dbFinding.rootCause ?? undefined,
    fixSummary: dbFinding.fixSummary ?? undefined,
    fixArtifactId: dbFinding.fixArtifactId ?? undefined,
    verificationId: dbFinding.verificationId ?? undefined,
    createdAt: dbFinding.createdAt,
    updatedAt: dbFinding.updatedAt,
  };
}

