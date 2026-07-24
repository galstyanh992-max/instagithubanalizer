# Agent Hub baseline

Date: 2026-07-24

## Repository state

- Branch: `feat/jarvis-agent-hub` (created from the user's existing WIP branch)
- HEAD: `4a03ee6 feat: Implement Jarvis Orchestrator and Role Router services`
- Working tree: already dirty before this work (74 tracked files changed plus many untracked paths). Those changes were preserved and are not part of this baseline.
- Overlay required by the requested implementation: **missing** at `D:\JARVIS_PATCH\instagithubanalizer-agent-hub-overlay\apply.ps1`.

## Runtime inventory

- Node.js: `v24.18.0`
- npm: `11.16.0`
- Git: `2.53.0.windows.1`
- Python: unavailable through `python --version` (Windows Store alias only)
- Claude CLI: present
- Codex CLI: present
- OpenCode CLI: not found
- Antigravity CLI: not found

## Baseline checks

| Command | Result | Notes |
| --- | --- | --- |
| `npm install` | NOT_RUN | `node_modules` exists and `package-lock.json` already has user changes; installation was avoided to preserve them. |
| `npm run typecheck` | PASS | Completed successfully. |
| `npm test` | PASS | 49 files / 323 tests passed. |
| `npm run lint` | PASS_WITH_WARNINGS | 0 errors, 8 warnings. |
| `npm run build` | FAIL | Timed out after 62 seconds. Initial run exposed a committed machine-specific TTS executable path; it was corrected and the retry still exceeded the runner limit. |
| `npm run smoke:security` | PASS | Completed successfully. |
| `npm run smoke:mcp-bridge` | PASS | 17 tests passed. |

## Baseline diagnosis

`src/app/api/tts/route.ts` contained a committed absolute path to a user-profile `edge-tts.exe`. Next.js attempted to copy that path into the standalone output and failed. The route now resolves the stable `edge-tts` command name instead, avoiding host-path leakage and invalid standalone tracing.

The requested Agent Hub overlay has not been inspected or applied because its required local file is absent. No credentials, environment-file contents, production service, remote database, or GitHub state were accessed.
