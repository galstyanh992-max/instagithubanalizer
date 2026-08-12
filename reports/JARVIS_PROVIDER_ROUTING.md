# JARVIS Provider Routing — Tiers, Fallback Chains, Integration Points

Date: 2026-08-12
Branch: `feat/vercel-local-runtime`
Companion to `reports/JARVIS_PROVIDER_MODEL_BENCHMARK.md` (evidence for
every model named below). This is Sections 18-19, 29-36, 43-45 of the
provider-integration master prompt.

## Explicit scope statement (Section 60)

This is an **initial, benchmark-informed** routing table, not a permanently
fixed one. It reflects live catalog + auth + protocol verification performed
2026-08-12, not training-data assumptions. Before trusting any entry months
from now, re-run the catalog fetch and auth test — model availability,
pricing, and regional restrictions (see the deepseek-v4-flash finding below)
can change.

## Architecture — what was built and where it lives

No second Provider Router was created. Everything below is additional data
inside the existing `providerRegistry` / `AiProviderRouter` architecture:

- `src/lib/ai-provider/opencode-go/protocol-map.ts` — per-model protocol
  metadata (OPENAI_CHAT / OPENAI_RESPONSES / ANTHROPIC_MESSAGES),
  reconciled against the live catalog.
- `src/lib/ai-provider/opencode-go/adapter.ts` — `OpenCodeGoProvider
  implements AIProvider`, one provider id (`opencode-go`) that dispatches
  `complete()` per-model to the correct protocol handler. Registered via
  `registerOpenCodeGo()` in `src/lib/ai-provider/server.ts`, following the
  exact same try/catch-log-and-continue pattern as the existing
  `registerCodexChatBridge()` / `registerOllamaLocal()` functions — a
  missing/invalid OpenCode Go key never blocks the rest of the provider
  stack from starting.
- `src/lib/ai-provider/providers.ts` — `openRouterEntry.config.fallbackModel`
  updated from the stale `openai/gpt-4o` to the benchmark-verified
  `deepseek/deepseek-v4-flash` (OpenRouter itself needed no new adapter code
  — it already runs through the shared `OpenAICompatibleProvider`).
- `src/lib/ai-provider/model-tiers.ts` — the tier lookup table below, plus
  `resolveTierCandidates(tier, privacy)` which hard-gates `LOCAL_ONLY`
  privacy (strips every cloud candidate, verified by
  `model-tiers.test.ts`) and `meetsQualityFloor(tier, quality)` for
  cost/quality-floor checks.
- `src/services/ai-provider-router.service.ts` — `opencode-go` added to
  `getStatus()`'s provider list (role: fallback) and to
  `chatWithProvider()`'s model-resolution fallback (it isn't in
  `PROVIDER_ENTRIES` because it isn't a single-config OpenAI-compatible
  provider, so it needed an explicit case, mirroring the existing
  `ollama-local` special case).
- UI: `src/components/settings/ai-provider-center.tsx` (status row) and
  `src/components/settings/provider-routing-panel.tsx` (per-function
  provider dropdown) both list `opencode-go` now. No new dashboard was
  created; no provider model catalog was turned into Program Registry
  entries — providers stay as programs/integrations, models stay as
  provider-model configuration (Section 45).

## Tier → provider/model mapping

Full detail (including per-entry justification) lives in
`src/lib/ai-provider/model-tiers.ts`; this is the summary.

| Tier | Primary | Fallback 1 | Fallback 2 |
|---|---|---|---|
| LOCAL_FAST | ollama-local / phi4-mini | — | — |
| CLOUD_ULTRA_CHEAP | openrouter / deepseek/deepseek-v4-flash | openrouter / xiaomi/mimo-v2.5 | opencode-go / mimo-v2.5 |
| CLOUD_CHEAP | opencode-go / deepseek-v4-pro | openrouter / deepseek/deepseek-v4-pro | — |
| CLOUD_BALANCED | opencode-go / mimo-v2.5-pro | openrouter / xiaomi/mimo-v2.5-pro | opencode-go / gpt-5.6-luna |
| CLOUD_STRONG | opencode-go / glm-5.2 | openrouter / z-ai/glm-5.2 | — |
| CODING_FAST | opencode-go / kimi-k2.7-code | opencode-go / deepseek-v4-pro | — |
| CODING_STRONG | opencode-go / kimi-k2.7-code | opencode-go / mimo-v2.5-pro | opencode-go / glm-5.2 |
| LONG_CONTEXT | openrouter / z-ai/glm-5.2 | opencode-go / glm-5.2 | openrouter / deepseek/deepseek-v4-pro |
| MULTIMODAL | opencode-go / qwen3.7-plus | openrouter / qwen/qwen3.7-plus | — |

Notable deliberate omission: **`opencode-go/deepseek-v4-flash` is never a
primary or fallback candidate anywhere**, because it returns HTTP 403
RegionError on this account (see benchmark report). Its OpenRouter
equivalent covers the CLOUD_ULTRA_CHEAP tier instead — a real instance of
the Section 30-31 cross-provider fallback pattern, not a hypothetical one.

## Coding agents vs. coding models (Section 20-21)

Antigravity configuration was **not touched** — frozen per Section 20.
Codex CLI / Claude Code / Antigravity (`src/lib/worker-registry`) remain the
primary path for actual repository changes; they produce diffs/patches
through a separate worker-registry layer, not chat completions, and were
not reordered or replaced. `CODING_FAST` / `CODING_STRONG` in
`model-tiers.ts` are explicitly documented as being for direct
LLM-completion coding calls that bypass the worker-registry (inline code
review, snippet generation) — not a replacement for the agent workers.

## Privacy (Section 35-36)

`resolveTierCandidates(tier, 'LOCAL_ONLY')` strips every OpenRouter/OpenCode
Go candidate from any tier, verified by a real unit test
(`model-tiers.test.ts`: *"a LOCAL_ONLY request for CLOUD_STRONG returns no
candidates rather than silently leaking to a cloud provider"*). This is a
hard gate at the tier-resolution layer. What was **not** built in this pass:
wiring `resolveTierCandidates` into every existing call site that currently
picks a provider (e.g. `AiProviderRouter.getProviderForIntent`), and a
context-redaction pass before cloud calls beyond the existing
`reduceToolContext()` tool-list trimming. Both are real, scoped follow-up
work, not silently skipped — recorded here rather than glossed over.

## Cost-aware / quality-floor routing (Section 22-23, 29)

`QUALITY_FLOOR_TIER` maps `Q1_LOW → CLOUD_ULTRA_CHEAP`, `Q2_MEDIUM →
CLOUD_CHEAP`, `Q3_HIGH → CLOUD_BALANCED`, `Q4_CRITICAL → CLOUD_STRONG`.
`meetsQualityFloor(tier, quality)` is a real, tested function (not a stub):
it rejects `CLOUD_ULTRA_CHEAP` for `Q4_CRITICAL` work and accepts
`CLOUD_STRONG` for `Q4_CRITICAL` work. What was **not** built: an automatic
classifier that assigns a `TaskQualityClass` to an arbitrary incoming
request — today a caller must supply the quality class explicitly. Wiring
automatic classification into `AiProviderRouter.getProviderForIntent()` is
scoped follow-up work.

## Circuit breaker / execution feedback (Section 32-34)

The existing `CapabilityCircuitBreaker` / `ExecutionFeedbackStore`
(`src/lib/jarvis/capability-intelligence/feedback-store.ts`) were **not**
modified or wired into the new providers in this pass. They are
capability-keyed, not provider/model-keyed, and have no `cost`/`tokens`
field today — extending them to record provider/model/cost/latency per AI
call (Section 33's "for every AI call record sanitized provider/model/task
class/latency/tokens/cost/success") is real, scoped follow-up work, not
done here. Recorded honestly rather than claimed complete.

## Budget integration (Section 34)

No new global budget env vars (`MAX_COST_PER_TASK`, `DAILY_AI_BUDGET`,
`OPENROUTER_DAILY_BUDGET`, `OPENCODE_GO_USAGE_POLICY`,
`STRONG_MODEL_BUDGET`) were invented, per the master prompt's own
instruction not to invent fixed owner budgets. The existing
per-agent `checkWorkspaceBudget()` / `checkTaskCostLimit()`
(`src/lib/agent-core/cost-guard.ts`) is unchanged and unaffected by this
work.

## Final status block

See the chat response for the full Section 59 checkpoint block.
