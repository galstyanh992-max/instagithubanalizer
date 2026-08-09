import { db } from '@/lib/db'
import type { DecisionLogEntry } from './types';

export interface RecordDecisionInput {
  runId: string;
  phase: string;
  decision: string;
  rationale: string;
  alternatives?: string[];
}

// ─── Decision Log Service ────────────────────────────────────

export async function recordDecision(input: RecordDecisionInput): Promise<DecisionLogEntry> {
  const entry = await db.decisionLog.create({
    data: {
      runId: input.runId,
      phase: input.phase,
      decision: input.decision,
      rationale: input.rationale,
      alternatives: JSON.stringify(input.alternatives ?? []),
    },
  });

  return mapDbDecision(entry);
}

export async function listDecisions(runId: string): Promise<DecisionLogEntry[]> {
  const entries = await db.decisionLog.findMany({
    where: { runId },
    orderBy: { createdAt: 'asc' },
  });

  return entries.map(mapDbDecision);
}

export async function getDecision(decisionId: string): Promise<DecisionLogEntry | null> {
  const entry = await db.decisionLog.findUnique({
    where: { id: decisionId },
  });
  if (!entry) return null;
  return mapDbDecision(entry);
}

// ─── Mapper ──────────────────────────────────────────────────

function mapDbDecision(
  dbEntry: Awaited<ReturnType<typeof db.decisionLog.create>>
): DecisionLogEntry {
  return {
    id: dbEntry.id,
    runId: dbEntry.runId,
    phase: dbEntry.phase,
    decision: dbEntry.decision,
    rationale: dbEntry.rationale,
    alternatives: JSON.parse(dbEntry.alternatives) as string[],
    createdAt: dbEntry.createdAt,
  };
}
