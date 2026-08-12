// JARVIS — OpenCode Go per-model protocol map
//
// OpenCode Go is a single API-key subscription that fronts multiple upstream
// model families, and NOT all of them speak the same wire protocol. Section
// 40 of the provider-integration master prompt gives an initial protocol
// assignment; this module implements it, and MUST be reconciled against the
// live catalog (GET OPENCODE_GO_MODELS_URL) before any model here is trusted
// blindly — see reconcileWithLiveCatalog() below.
//
// Live catalog fetched 2026-08-12 (GET https://opencode.ai/zen/go/v1/models,
// HTTP 200, 25 models total). All 18 models named in the master prompt's
// Section 40 protocol map were present in the live response. Live auth was
// also verified with real tiny completions (see
// reports/JARVIS_PROVIDER_MODEL_BENCHMARK.md): glm-5.2, kimi-k2.7-code,
// mimo-v2.5, and deepseek-v4-pro all returned HTTP 200 through
// /chat/completions. deepseek-v4-flash returned HTTP 403 RegionError
// ("only available hosted in China and requires explicit opt in") — that is
// a real, current upstream restriction, not an auth or code defect. It stays
// in the protocol map (so callers can see it exists) but is marked
// unavailable so the router does not select it by default; the equivalent
// model on OpenRouter (deepseek/deepseek-v4-flash) is unaffected and is used
// for the CLOUD_ULTRA_CHEAP tier instead.

import 'server-only';

export type OpenCodeGoProtocol = 'OPENAI_CHAT' | 'OPENAI_RESPONSES' | 'ANTHROPIC_MESSAGES';

export interface OpenCodeGoModelMeta {
  /** Model id exactly as accepted in the `model` field of a request. */
  id: string;
  protocol: OpenCodeGoProtocol;
  /**
   * false only for models with a known, currently-blocking upstream
   * restriction (e.g. deepseek-v4-flash's region opt-in). Absence from this
   * map entirely (rather than `available: false`) means "not part of the
   * curated candidate set" — legacy/preview variants live in the catalog
   * but are intentionally left out of routing.
   */
  available: boolean;
  note?: string;
}

/**
 * Curated candidate set from the master prompt (Section 12-17, 40),
 * reconciled against the live /v1/models catalog on 2026-08-12. Models that
 * exist live but were NOT in the master prompt's curated list (glm-5,
 * hy3-preview, kimi-k2.5, mimo-v2-omni, mimo-v2-pro, minimax-m2.5,
 * qwen3.5-plus) are deliberately omitted here — they read as older/preview
 * variants of models already covered, and enabling them was not part of the
 * approved scope. Add them explicitly (with a benchmark entry) if ever
 * needed.
 */
export const OPENCODE_GO_PROTOCOL_MAP: Record<string, OpenCodeGoModelMeta> = {
  // OpenAI Chat Completions compatible (POST /v1/chat/completions)
  'grok-4.5': { id: 'grok-4.5', protocol: 'OPENAI_CHAT', available: true },
  'glm-5.2': { id: 'glm-5.2', protocol: 'OPENAI_CHAT', available: true },
  'glm-5.1': { id: 'glm-5.1', protocol: 'OPENAI_CHAT', available: true },
  'kimi-k3': { id: 'kimi-k3', protocol: 'OPENAI_CHAT', available: true },
  'kimi-k2.7-code': { id: 'kimi-k2.7-code', protocol: 'OPENAI_CHAT', available: true },
  'kimi-k2.6': { id: 'kimi-k2.6', protocol: 'OPENAI_CHAT', available: true },
  'deepseek-v4-pro': { id: 'deepseek-v4-pro', protocol: 'OPENAI_CHAT', available: true },
  'deepseek-v4-flash': {
    id: 'deepseek-v4-flash',
    protocol: 'OPENAI_CHAT',
    available: false,
    note: 'HTTP 403 RegionError on 2026-08-12: hosted in China, requires explicit workspace opt-in. Use OpenRouter deepseek/deepseek-v4-flash instead until opted in.',
  },
  'mimo-v2.5': { id: 'mimo-v2.5', protocol: 'OPENAI_CHAT', available: true },
  'mimo-v2.5-pro': { id: 'mimo-v2.5-pro', protocol: 'OPENAI_CHAT', available: true },
  hy3: { id: 'hy3', protocol: 'OPENAI_CHAT', available: true },

  // OpenAI Responses API (POST /v1/responses) — do NOT call via /chat/completions.
  'gpt-5.6-luna': { id: 'gpt-5.6-luna', protocol: 'OPENAI_RESPONSES', available: true },

  // Anthropic Messages API compatible (POST /v1/messages)
  'minimax-m3': { id: 'minimax-m3', protocol: 'ANTHROPIC_MESSAGES', available: true },
  'minimax-m2.7': { id: 'minimax-m2.7', protocol: 'ANTHROPIC_MESSAGES', available: true },
  'qwen3.8-max': { id: 'qwen3.8-max', protocol: 'ANTHROPIC_MESSAGES', available: true },
  'qwen3.7-max': { id: 'qwen3.7-max', protocol: 'ANTHROPIC_MESSAGES', available: true },
  'qwen3.7-plus': { id: 'qwen3.7-plus', protocol: 'ANTHROPIC_MESSAGES', available: true },
  'qwen3.6-plus': { id: 'qwen3.6-plus', protocol: 'ANTHROPIC_MESSAGES', available: true },
};

export function getOpenCodeGoModelMeta(modelId: string): OpenCodeGoModelMeta | undefined {
  return OPENCODE_GO_PROTOCOL_MAP[modelId];
}

export function listAvailableOpenCodeGoModels(): OpenCodeGoModelMeta[] {
  return Object.values(OPENCODE_GO_PROTOCOL_MAP).filter((m) => m.available);
}

/**
 * Compares the static protocol map against a live /v1/models response.
 * Returns models present in the map but missing live (should be disabled)
 * and models present live but missing from the map (unclassified — do not
 * route to them until a protocol is assigned). Never throws: a reconciliation
 * mismatch must demote/ignore individual models, not fail JARVIS globally.
 */
export function reconcileWithLiveCatalog(liveModelIds: string[]): {
  missingLive: string[];
  unclassifiedLive: string[];
} {
  const liveSet = new Set(liveModelIds);
  const mapped = new Set(Object.keys(OPENCODE_GO_PROTOCOL_MAP));

  const missingLive = [...mapped].filter((id) => !liveSet.has(id));
  const unclassifiedLive = [...liveSet].filter((id) => !mapped.has(id));

  return { missingLive, unclassifiedLive };
}
