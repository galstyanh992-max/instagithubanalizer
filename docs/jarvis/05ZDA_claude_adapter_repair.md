# 05ZDA Claude Adapter Repair

## 1. Issue Overview
The `ClaudeCodeWorkerAdapter` failed during E2E testing with errors related to DNS resolution (`ENOTFOUND www.cbwxy.cn`) and disabled features (`claude.ai connectors are disabled because ANTHROPIC_API_KEY ...`).
Despite the `AUTH_MODE=SUBSCRIPTION_OAUTH_ONLY` constraint and the presence of valid `claudeAiOauth` credentials in `~/.claude/.credentials.json`, the CLI unexpectedly loaded a global configuration file (`~/.claude/settings.json`) which contained legacy proxy settings (`ANTHROPIC_BASE_URL` and `ANTHROPIC_AUTH_TOKEN`).

## 2. Root Cause Analysis
The Claude Code binary reads configuration from multiple sources. It prioritizes the legacy proxy `env` settings located in the global `settings.json` file over any `process.env` overrides provided via the spawn execution.
Because the `ANTHROPIC_AUTH_TOKEN` was present in `settings.json`, the binary logic triggered the `api_key_precedence` safety block, forcing the worker into an API Key-only mode, disabling Remote Control features and `claude.ai` OAuth.

## 3. Resolution
To maintain `SUBSCRIPTION_OAUTH_ONLY` constraints without modifying the user's local global `settings.json` file, we leveraged the Claude CLI `--setting-sources` argument.

*   Added `--setting-sources project` to the execution arguments in `src/lib/worker-registry/adapters/claude-code.ts`.
*   This explicitly instructs the Claude CLI to ignore the global `user` settings (bypassing the problematic `~/.claude/settings.json` proxy block).
*   The CLI still correctly loads `~/.claude/.credentials.json` (as it is not a setting source, but rather a credential storage mechanism) and connects via the user's active `claudeAiOauth` session directly to `api.anthropic.com`.

## 4. Verification
*   **Unit Tests**: Updated `claude-worker.test.ts` to expect `--setting-sources project` in the generated command arguments. The unit test passes.
*   **E2E Tests**: The `three-workers-e2e.ts` test was updated and run successfully. The execution bypasses the proxy, successfully resolves the organization via the OAuth token, and completes the requested file review task using Claude Code.

## 5. Next Steps
The adapter repair is complete and successfully respects the `SUBSCRIPTION_OAUTH_ONLY` requirement. Wait for Antigravity verification in `three-workers-e2e.ts`, and then proceed to `RUN_PROMPT_5ZE_ANTIGRAVITY`.
