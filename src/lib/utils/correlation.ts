// ─── Agent OS — Correlation ID Utility ────────────────────────
// Generates unique correlation IDs for tracing events across
// orchestrator → task → tool execution chains.
// Used by the Office UI animation layer to correlate related events.

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a new correlation ID.
 * Format: corr_<uuid_v4> for easy identification in logs and DB.
 */
export function generateCorrelationId(): string {
  return `corr_${uuidv4()}`;
}
