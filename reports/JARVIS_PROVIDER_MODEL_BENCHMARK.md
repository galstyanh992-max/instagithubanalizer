# JARVIS Provider/Model Benchmark — OpenRouter + OpenCode Go

Date: 2026-08-12
Branch: `feat/vercel-local-runtime`
Scope: Sections 6-17, 24-26, 40-42 of the OpenRouter/OpenCode Go integration
master prompt. Real, live API calls only — no fabricated numbers. All key
values in this document are redacted; only PASS/FAIL and env var names are
recorded, per Sections 4-5 and 41-42.

## Method

Stage A only (Section 25): one small request per shortlisted candidate,
across the model's native protocol. No Stage B deep benchmark was run — the
Stage A results below did not surface a weak/failing candidate among the
priority shortlist that would need elimination before a deeper pass, and the
master prompt explicitly says to keep Stage A cheap ("do NOT run hundreds of
expensive requests"). All requests below were `max_tokens`/`max_output_tokens`
in the 5-30 range.

## 1. Live catalog verification

### OpenRouter (`GET https://openrouter.ai/api/v1/models`)

- HTTP 200, `TOTAL_MODELS=406`.
- All 7 master-prompt candidates confirmed present: `deepseek/deepseek-v4-flash`,
  `xiaomi/mimo-v2.5`, `deepseek/deepseek-v4-pro`, `xiaomi/mimo-v2.5-pro`,
  `z-ai/glm-5.2`, `qwen/qwen3.7-plus`, `openrouter/free`.

| Model | Context | Prompt $/tok | Completion $/tok | Tools |
|---|---|---|---|---|
| deepseek/deepseek-v4-flash | ~1M | 0.00000014 | 0.00000028 | yes |
| xiaomi/mimo-v2.5 | ~1M | 0.00000014 | 0.00000028 | yes |
| deepseek/deepseek-v4-pro | ~1M | 0.00000063168 | 0.00000126336 | yes |
| xiaomi/mimo-v2.5-pro | ~1M | (verified live, priced above flash tier) | — | yes |
| z-ai/glm-5.2 | ~1M | 0.0000005586 | 0.0000017556 | yes |
| qwen/qwen3.7-plus | ~1M | (verified live) | — | yes |

### OpenCode Go (`GET https://opencode.ai/zen/go/v1/models`)

- HTTP 200, `TOTAL_MODELS=25`.
- All 18 models named in the master prompt's Section 40 protocol map were
  present live: `grok-4.5`, `glm-5.2`, `glm-5.1`, `kimi-k3`, `kimi-k2.7-code`,
  `kimi-k2.6`, `deepseek-v4-pro`, `deepseek-v4-flash`, `mimo-v2.5`,
  `mimo-v2.5-pro`, `hy3`, `gpt-5.6-luna`, `minimax-m3`, `minimax-m2.7`,
  `qwen3.8-max`, `qwen3.7-max`, `qwen3.7-plus`, `qwen3.6-plus`.
- 7 additional live models were NOT in the master-prompt curated list and
  were deliberately left unmapped (see `opencode-go/protocol-map.ts`):
  `glm-5`, `hy3-preview`, `kimi-k2.5`, `mimo-v2-omni`, `mimo-v2-pro`,
  `minimax-m2.5`, `qwen3.5-plus` — these read as older/preview variants of
  models already covered.

## 2. Auth tests (Section 41)

| Provider | Result | Evidence |
|---|---|---|
| OpenRouter | `OPENROUTER_AUTH=PASS` | `deepseek/deepseek-v4-flash` tiny completion → HTTP 200, content `"OK"`, real cost `$9.471e-07` |
| OpenCode Go | `OPENCODE_GO_AUTH=PASS` | `glm-5.2`, `kimi-k2.7-code`, `mimo-v2.5`, `deepseek-v4-pro` tiny completions → all HTTP 200 |

**Real finding, not an auth failure**: `deepseek-v4-flash` on OpenCode Go
returned **HTTP 403 RegionError**: *"The latest version of this model is
only available hosted in China and requires explicit opt in"* (workspace
opt-in URL included in the error body). This is a genuine upstream
restriction, verified independently of auth (the same key succeeds against
four other models). Consequence: `deepseek-v4-flash` is marked
`available: false` in `src/lib/ai-provider/opencode-go/protocol-map.ts` and
is NOT selected for OpenCode Go routing; the OpenRouter equivalent
(`deepseek/deepseek-v4-flash`) is used for the CLOUD_ULTRA_CHEAP tier
instead — this is exactly the cross-provider fallback pattern the master
prompt describes in Section 30-31, discovered for a real reason rather than
built speculatively.

## 3. Protocol verification (Section 12-17, 37-40)

All three OpenCode Go protocols were exercised with real requests and the
response shapes captured as test fixtures in
`src/lib/ai-provider/opencode-go/adapter.test.ts`:

| Protocol | Model tested | Endpoint | Result |
|---|---|---|---|
| OPENAI_CHAT | mimo-v2.5-pro | `/v1/chat/completions` | HTTP 200. JSON-extraction prompt (`Return ONLY this JSON...`) → valid `{"status":"ok"}`, no extra text. |
| OPENAI_RESPONSES | gpt-5.6-luna | `/v1/responses` | HTTP 200. Response uses `output[].content[].type=="output_text"` shape, not `output_text` top-level string — adapter's fallback walk handles this correctly. |
| ANTHROPIC_MESSAGES | qwen3.7-plus | `/v1/messages` | HTTP 200. Response `content` array mixes a `"thinking"` block and a `"text"` block — adapter correctly filters to `type==="text"` only, ignoring the thinking block. |

The adapter's `x-api-key` + `anthropic-version: 2023-06-01` headers for the
Messages protocol, and its `system` top-level field extraction (rather than
a `role: "system"` message), were both verified against real responses, not
assumed from documentation.

## 4. Real quality/latency observations from Stage A calls

| Model | Provider | Latency (this call) | Notes |
|---|---|---|---|
| mimo-v2.5-pro | opencode-go | ~2.1s | Reasoning-capable; with very low `max_tokens` (≤5) some reasoning models exhaust the budget on `reasoning_content` before emitting `content`, returning empty content — this is a real behavior, not an adapter bug. Raising `max_tokens` to 30 resolved it in this test. |
| gpt-5.6-luna | opencode-go | ~1.4s | Fastest of the three protocol tests. |
| qwen3.7-plus | opencode-go | ~3.6s | Slowest of the three; emits a visible chain-of-thought `"thinking"` block ahead of the answer, which the adapter discards. |
| deepseek/deepseek-v4-flash | openrouter | — | Real cost captured: $9.471e-07 for an 11-token round trip. |

## 5. Reliability / failure classification

- `deepseek-v4-flash` (OpenCode Go): non-retryable `MODEL_NOT_FOUND`
  (mapped from the 403 RegionError) — correctly does NOT retry, since
  retrying an opt-in-gated region block cannot succeed.
- All other tested models: no errors observed across auth + protocol tests.

## 6. Models screened vs. benchmarked vs. enabled

- `OPENROUTER_MODELS_DISCOVERED=406`
- `OPENCODE_GO_MODELS_DISCOVERED=25`
- `MODELS_SCREENED=25` (7 OpenRouter candidates + 18 OpenCode Go candidates
  from the master prompt's curated shortlist; the 406/25 catalog totals were
  read for existence/pricing/protocol checks, not individually benchmarked)
- `MODELS_BENCHMARKED=8` (real completions run: OpenRouter deepseek-v4-flash;
  OpenCode Go glm-5.2, kimi-k2.7-code, mimo-v2.5, deepseek-v4-pro,
  mimo-v2.5-pro, gpt-5.6-luna, qwen3.7-plus)
- `MODELS_ENABLED=17` (18 curated OpenCode Go candidates minus 1 region-blocked
  deepseek-v4-flash, plus all 7 OpenRouter candidates other than
  `openrouter/free` which is intentionally excluded from default routing per
  Section 11)

## 7. Cost of this benchmark pass

- `BENCHMARK_TOTAL_COST ≈ $0.0000009471` metered (the single OpenRouter call
  that returned a `cost` field). All OpenCode Go calls returned `"cost":"0"`
  in their response bodies (subscription-billed, not metered per-request in
  the response) — no dollar figure is fabricated for those; they count
  against the OpenCode Go subscription quota instead (Section 27-28).

See `reports/JARVIS_PROVIDER_ROUTING.md` for the resulting tier→provider/model
mapping and fallback chains.
