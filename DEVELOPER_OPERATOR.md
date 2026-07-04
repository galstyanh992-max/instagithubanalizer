# Developer Operator

Plans developer tasks. **Never executes** commands, git operations, or deploys.

## Scope (implemented)
- `src/lib/developer-operator/` — action classifier + safe command planner + orchestrator.
- Routed via command router `developer_task`/`terminal_task` intents and `POST /api/developer/plan`.
- Records planning events to Project Brain (`action_result`, non-fatal).

## Actions
`inspect_project, run_typecheck, run_lint, run_tests, run_build, open_preview, prepare_prompt_implementation, prepare_git_commit, prepare_github_push, prepare_vercel_deploy, read_errors, unknown`

## Risk / approval
- typecheck/lint/tests → MEDIUM plan (no execution)
- build/preview(dev) → HIGH, approval
- git commit/push → HIGH, approval
- vercel deploy → CRITICAL, owner approval
- destructive (rm -rf etc.) → deny (via terminal-guard)
- unknown → clarify; unknown actor → deny

## Cannot execute yet (NOT IMPLEMENTED)
- Real terminal execution through operator
- Real git commit/push
- Real Vercel deploy
- Real dev preview process launch
- Error-log reading (stub)

## Local workspace policy
Commands are planned against `AGENT_WORKSPACE_ROOT` via terminal-guard; unset root → fail closed.

## GitHub/Vercel safety
Always approval-gated; owner-only for CRITICAL (deploy). No credentials read or used in this foundation.
