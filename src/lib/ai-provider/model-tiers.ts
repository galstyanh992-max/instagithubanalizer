// JARVIS — cost-aware model tiers
//
// This module is the "ask for a tier, Provider Router picks the
// implementation" layer requested by the provider-integration master prompt
// (Sections 18-19, 22-23, 29-31). It does NOT replace AiProviderRouter — it
// is a lookup table + a couple of pure helper functions that
// getProviderForIntent()-style callers (or future callers) can consult
// instead of hardcoding provider names for every task.
//
// IMPORTANT — this is explicitly an INITIAL, benchmark-informed mapping, not
// a permanently fixed one (master prompt Section 60's absolute rule). It is
// built from real, live-verified data captured 2026-08-12:
//   - OpenRouter catalog (406 models) + real pricing/context/tool-support
//     pulled per candidate.
//   - OpenCode Go catalog (25 models) + real auth/completion tests across
//     all three protocols (OPENAI_CHAT, OPENAI_RESPONSES, ANTHROPIC_MESSAGES).
// Full evidence: reports/JARVIS_PROVIDER_MODEL_BENCHMARK.md and
// reports/JARVIS_PROVIDER_ROUTING.md.

import 'server-only';

export type ModelTier =
  | 'LOCAL_FAST'
  | 'CLOUD_ULTRA_CHEAP'
  | 'CLOUD_CHEAP'
  | 'CLOUD_BALANCED'
  | 'CLOUD_STRONG'
  | 'CODING_FAST'
  | 'CODING_STRONG'
  | 'LONG_CONTEXT'
  | 'MULTIMODAL';

/** Task quality floor — Section 22-23. Q1 lowest, Q4 highest. */
export type TaskQualityClass = 'Q1_LOW' | 'Q2_MEDIUM' | 'Q3_HIGH' | 'Q4_CRITICAL';

/** Privacy class — Section 35-36. LOCAL_ONLY must never reach a cloud provider. */
export type PrivacyClass = 'LOCAL_ONLY' | 'CLOUD_ALLOWED' | 'CLOUD_PREFERRED';

export interface TierCandidate {
  providerId: 'ollama-local' | 'opencode-go' | 'openrouter';
  model: string;
  /** Human-readable justification, kept short for logs/reports. */
  reason: string;
}

/**
 * Provider IDs that are network calls to a third party. Used to hard-gate
 * PrivacyClass "LOCAL_ONLY" — those requests must never reach a
 * TIER_CANDIDATES entry pointing at one of these, regardless of tier.
 */
const CLOUD_PROVIDER_IDS = new Set<TierCandidate['providerId']>(['opencode-go', 'openrouter']);

/**
 * Ordered fallback chains per tier. First entry is primary. Cross-provider
 * fallback (Section 30-31) is used deliberately: the same model family often
 * exists on both OpenCode Go and OpenRouter, so a regional block or outage
 * on one does not take the tier down.
 */
export const TIER_CANDIDATES: Record<ModelTier, TierCandidate[]> = {
  LOCAL_FAST: [
    { providerId: 'ollama-local', model: 'phi4-mini', reason: 'Local, zero cost, zero data egress — classification/tagging/small summaries.' },
  ],

  CLOUD_ULTRA_CHEAP: [
    {
      providerId: 'openrouter',
      model: 'deepseek/deepseek-v4-flash',
      reason: 'Verified live 2026-08-12: cheapest prompt+completion pricing in the candidate set (~$0.14/$0.28 per 1M tokens), tools-capable, ~1M context.',
    },
    {
      providerId: 'openrouter',
      model: 'xiaomi/mimo-v2.5',
      reason: 'Tied cheapest on OpenRouter, tools-capable, ~1M context.',
    },
    {
      providerId: 'opencode-go',
      model: 'mimo-v2.5',
      reason: 'OpenCode Go equivalent, auth-verified live (HTTP 200). Not deepseek-v4-flash: that model returns HTTP 403 RegionError on OpenCode Go (hosted in China, requires opt-in) — routed through OpenRouter instead.',
    },
  ],

  CLOUD_CHEAP: [
    {
      providerId: 'opencode-go',
      model: 'deepseek-v4-pro',
      reason: 'Auth-verified live (HTTP 200) via /chat/completions, no observed regional restriction, subscription-billed.',
    },
    {
      providerId: 'openrouter',
      model: 'deepseek/deepseek-v4-pro',
      reason: 'Verified live in catalog, ~$0.63/$1.75 per 1M tokens, tools-capable, ~1M context.',
    },
  ],

  CLOUD_BALANCED: [
    {
      providerId: 'opencode-go',
      model: 'mimo-v2.5-pro',
      reason: 'Auth-verified live: real JSON-extraction test returned valid `{"status":"ok"}` with no extra text.',
    },
    {
      providerId: 'openrouter',
      model: 'xiaomi/mimo-v2.5-pro',
      reason: 'OpenRouter equivalent, verified live in catalog, tools-capable, ~1M context.',
    },
    {
      providerId: 'opencode-go',
      model: 'gpt-5.6-luna',
      reason: 'Auth-verified live via the Responses API protocol (distinct from chat/completions) — optional balanced candidate from Section 17.',
    },
  ],

  CLOUD_STRONG: [
    {
      providerId: 'opencode-go',
      model: 'glm-5.2',
      reason: 'Auth-verified live (HTTP 200). Reserve for difficult reasoning/architecture — do not route ordinary cheap tasks here (master prompt Section 11).',
    },
    {
      providerId: 'openrouter',
      model: 'z-ai/glm-5.2',
      reason: 'OpenRouter equivalent, verified live in catalog, ~$0.56/$1.76 per 1M tokens, ~1M context, tools-capable.',
    },
  ],

  CODING_FAST: [
    {
      providerId: 'opencode-go',
      model: 'kimi-k2.7-code',
      reason: 'Auth-verified live (HTTP 200). Coding-specialized model for small fixes/codegen/tests.',
    },
    {
      providerId: 'opencode-go',
      model: 'deepseek-v4-pro',
      reason: 'Fallback if Kimi is unavailable — general-purpose but strong at code per OpenRouter/OpenCode Go catalog metadata.',
    },
  ],

  // NOTE: local coding *agents* (Codex CLI, Claude Code, Antigravity via
  // src/lib/worker-registry) remain the primary path for real repository
  // changes per master prompt Section 21 — they are a different layer
  // (produce diffs/patches, not chat completions) and are NOT reordered or
  // replaced by this tier. This entry is only for direct LLM-completion
  // coding calls that bypass the worker-registry (e.g. inline code review,
  // snippet generation).
  CODING_STRONG: [
    { providerId: 'opencode-go', model: 'kimi-k2.7-code', reason: 'Coding-specialized, auth-verified live.' },
    { providerId: 'opencode-go', model: 'mimo-v2.5-pro', reason: 'Strong general+agentic fallback, auth-verified live.' },
    { providerId: 'opencode-go', model: 'glm-5.2', reason: 'Strongest fallback for hard repo reasoning, auth-verified live.' },
  ],

  LONG_CONTEXT: [
    {
      providerId: 'openrouter',
      model: 'z-ai/glm-5.2',
      reason: '~1M context confirmed live, strong reasoning, tools-capable.',
    },
    {
      providerId: 'opencode-go',
      model: 'glm-5.2',
      reason: 'OpenCode Go equivalent, auth-verified live.',
    },
    {
      providerId: 'openrouter',
      model: 'deepseek/deepseek-v4-pro',
      reason: '~1M context confirmed live, cheaper than GLM-5.2 when the task does not need GLM-level reasoning strength.',
    },
  ],

  MULTIMODAL: [
    {
      providerId: 'opencode-go',
      model: 'qwen3.7-plus',
      reason: 'Auth-verified live via the Anthropic Messages protocol — real response correctly separated a "thinking" block from the final "text" block.',
    },
    {
      providerId: 'openrouter',
      model: 'qwen/qwen3.7-plus',
      reason: 'OpenRouter equivalent, verified live in catalog, tools-capable.',
    },
  ],
};

/**
 * Section 22-23 quality floor -> minimum tier. This is intentionally coarse:
 * callers can always ask for a stronger tier directly, but should never ask
 * for a tier weaker than what this table implies for the given quality
 * class (i.e. do not send Q4 work through CLOUD_ULTRA_CHEAP).
 */
export const QUALITY_FLOOR_TIER: Record<TaskQualityClass, ModelTier> = {
  Q1_LOW: 'CLOUD_ULTRA_CHEAP',
  Q2_MEDIUM: 'CLOUD_CHEAP',
  Q3_HIGH: 'CLOUD_BALANCED',
  Q4_CRITICAL: 'CLOUD_STRONG',
};

const TIER_ORDER: ModelTier[] = [
  'LOCAL_FAST',
  'CLOUD_ULTRA_CHEAP',
  'CLOUD_CHEAP',
  'CLOUD_BALANCED',
  'CLOUD_STRONG',
];

/** Returns true if `tier` meets or exceeds the cost/strength floor for `quality`. */
export function meetsQualityFloor(tier: ModelTier, quality: TaskQualityClass): boolean {
  const floor = QUALITY_FLOOR_TIER[quality];
  const floorIndex = TIER_ORDER.indexOf(floor);
  const tierIndex = TIER_ORDER.indexOf(tier);
  if (floorIndex === -1 || tierIndex === -1) return true; // tiers outside the cost ladder (coding/long-context/multimodal) are not ranked here
  return tierIndex >= floorIndex;
}

/**
 * Resolves a tier to its ordered candidate chain, applying the privacy hard
 * gate: LOCAL_ONLY strips every cloud candidate, regardless of tier. If that
 * leaves the chain empty, the caller has asked for cloud-tier quality on a
 * privacy-constrained task — that is a caller bug, not something this
 * function silently works around by leaking data, so it returns [] and lets
 * the caller decide how to fail (e.g. downgrade to LOCAL_FAST explicitly).
 */
export function resolveTierCandidates(tier: ModelTier, privacy: PrivacyClass = 'CLOUD_ALLOWED'): TierCandidate[] {
  const candidates = TIER_CANDIDATES[tier] ?? [];
  if (privacy !== 'LOCAL_ONLY') return candidates;
  return candidates.filter((c) => !CLOUD_PROVIDER_IDS.has(c.providerId));
}

export function isCloudProvider(providerId: TierCandidate['providerId']): boolean {
  return CLOUD_PROVIDER_IDS.has(providerId);
}
