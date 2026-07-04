import { getDbConfigStatus } from "./config";

export interface ProbeResult {
  mode: "dry_run" | "live_write";
  status: "not_configured" | "planned" | "executed" | "cleanup_failed";
  steps: string[];
}

/**
 * Default: dry-run only, never touches DB.
 * Live write only if DATABASE_URL configured AND JARVIS_DB_PERSISTENCE_PROBE_WRITE==="true".
 * Cleans up the single test entry it creates; never touches user data; never runs migrations.
 */
export async function runPersistenceProbe(): Promise<ProbeResult> {
  const cfg = getDbConfigStatus();
  const writeFlag = process.env.JARVIS_DB_PERSISTENCE_PROBE_WRITE === "true";

  if (!cfg.liveCheckPossible) {
    return { mode: "dry_run", status: "not_configured", steps: ["DATABASE_URL not configured — NOT RUN."] };
  }

  if (!writeFlag) {
    return {
      mode: "dry_run", status: "planned",
      steps: [
        "DATABASE_URL configured, but JARVIS_DB_PERSISTENCE_PROBE_WRITE is not 'true'.",
        "Planned: create one test Project Brain entry, read it back, delete it.",
        "No write performed.",
      ],
    };
  }

  const steps: string[] = [];
  try {
    const { PrismaBrainAdapter } = await import("@/lib/project-brain/prisma-adapter");
    const adapter = new PrismaBrainAdapter();
    const marker = `probe-${Date.now()}`;
    const entry = await adapter.save({ type: "daily_note", title: `DB persistence probe ${marker}`, content: "test entry, safe to delete", metadata: { probe: true } });
    steps.push(`Created test entry ${entry.id}.`);
    const listed = await adapter.list(5);
    steps.push(`Read back ${listed.length} recent entries.`);

    const { db } = await import("@/lib/db");
    await db.memoryRecord.delete({ where: { id: entry.id } });
    steps.push(`Cleaned up test entry ${entry.id}.`);

    return { mode: "live_write", status: "executed", steps };
  } catch (e) {
    steps.push(`Error (non-destructive, no user data touched): ${e instanceof Error ? e.message : String(e)}`);
    return { mode: "live_write", status: "cleanup_failed", steps };
  }
}
