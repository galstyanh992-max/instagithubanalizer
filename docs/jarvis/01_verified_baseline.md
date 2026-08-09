# 01_verified_baseline.md

## 1. Executive verdict
The JARVIS project repository is functionally robust in its structural foundation, database schema, UI components, and unit tests. However, the system heavily relies on `mock`, `stub`, and `fake` responses for core logic operations (such as provider execution, agent planning, and OCR). True local execution and orchestration are not yet active. Furthermore, Authentication is forcibly disabled at the middleware level. The repository is ready for the next phase of real worker integration, provided the local execution directories and typecheck issues are resolved first.

## 2. Repository identity
- **Root:** `D:\АГЕНТ\ДЖАРВИС`
- **Type:** Next.js 16 (App Router), TypeScript, Prisma ORM, Node.js project.

## 3. Git state
- **Branch:** `feat/jarvis-agent-hub`
- **HEAD Commit:** `a6568c80b22bdf2c363c2e726bac8eb6fb5e3906` (fix: remove host-specific tts executable path)
- **Uncommitted Changes:** Extensive uncommitted changes, including new Prisma migrations, renamed Auth route, and various UI/component modifications, along with numerous untracked files in `reports/` and `audit/`.

## 4. Verified architecture
- Next.js 16 Frontend and API backend.
- Prisma ORM over PostgreSQL (Supabase).
- Vitest testing framework.
- Local command execution adapters (e.g. `codex-cli-adapter`).
- Auth, Tool, and Approval schemas implemented.

## 5. Current project stage
CORE_FEATURES_IMPLEMENTED / EXECUTION_AND_INTEGRATIONS_INCOMPLETE.
The architecture is planned and mocked, but real execution paths (Local Daemon, actual Tool calls) are substituted with mock boundaries.

## 6. Implemented modules
- Next.js 16 UI / Routing.
- Prisma schema (Users, Workspaces, Agents, Tasks, Approvals, Memory).
- Command Router (Safety logic and routing rules are tested).
- Test infrastructure (333 Vitest tests passing).
- Security Guard and Policy engine logic (unit tested).

## 7. Partially implemented modules
- Local Agent Runtime / Developer Operator (Schemas exist, some services exist, but execution relies on placeholders).
- Provider Gateway / AI-provider integrations (Fallbacks and mocks dominate).
- MCP Bridge (Smoke scripts exist but not fully integrated).
- Approvals (Schema and API exist, but actual enforcement blocking local daemon side effects needs real runtime).

## 8. Missing modules
- Separate robust Local Daemon (currently running within Next.js or node scripts).
- Real Worker executions for Codex, Claude Code, and Antigravity.
- Local Disk enforcement mappings.
- Complete Mobile UI / Phone Bridge.

## 9. Mock/stub/fake-success inventory
Extensive mocking detected (over 790 occurrences across `src/`). Key areas include:
- `src/services/ocr.service.ts`: Fallbacks to `mockOcr`.
- `src/services/pipeline.service.ts`: Hardcoded mock modes for repository analysis.
- `src/services/integration-plan.service.ts`: Extensive use of `mockPlan()`.
- `src/services/jarvis-orchestrator.service.ts`: Checks `isMock` flag for routing.
- `src/services/media-router.service.ts`: Simulated streaming behavior.
- **Risk:** High risk of false success. AI models and local commands might appear to succeed without doing any real work.
- **Required Fix Phase:** Real Provider Gateway integration and Local Daemon execution.

## 10. Database and migration map
- **Provider:** PostgreSQL via Supabase (`aws-0-eu-west-1.pooler.supabase.com`).
- **Migrations:** 9 migrations found, database is fully up to date.
- **Key Models:** `User`, `Workspace` (with ownerId), `Project`, `Epic`, `Task`, `Agent`, `ApprovalRequest`, `EventLog`, `Tool`, `ToolExecution`, `MemoryRecord`.
- No explicit organizations/roles models used beyond standard single-user Workspace structure.

## 11. Auth and Supabase state
- **Supabase configuration:** Loaded via `.env`.
- **Middleware:** `src/middleware.ts` forces Next.js to skip auth checks: `// Auth полностью отключен по требованию пользователя`.
- **User Identity:** Mapping depends on `JARWISYAN_AUTH_ENABLED` logic, but currently completely bypassed.

## 12. Local runtime state
- No standalone daemon runs independently of Next.js yet.
- Execution happens via inline Node.js services or smoke test scripts.

## 13. Worker integration state
- **Codex:** Adapters exist (`src/server/executor/codex-cli-adapter.ts`), unit tests exist, but full pipeline execution is not verified in production mode.
- **Claude Code:** Found in `AGENTS.md` and context, but CLI integration lacks verified runtime presence.
- **Antigravity:** Placed as a worker in architecture, ready for implementation planning.

## 14. Tool/MCP state
- Schema for `Tool` and `ToolExecution` exists.
- Mock tools and API routes are present.
- Real MCP integration is untested; `.playwright-mcp` directory exists but requires validation.

## 15. Browser state
- `npx playwright install chromium` is a valid script.
- `camofox-browser` exists in `vendor/` and has a start script.

## 16. Test/build baseline
| Command | CWD | Exit Code | Duration | Result | Warnings / Errors |
|---------|-----|-----------|----------|--------|-------------------|
| `npm run typecheck` | `D:\АГЕНТ\ДЖАРВИС` | 1 | ~8s | Failed | Cannot find module `../../src/app/api/auth/[nextauth]/route.js` (due to uncommitted rename) |
| `npx prisma validate` | `D:\АГЕНТ\ДЖАРВИС` | 0 | ~11s | Passed | None (Schema valid) |
| `npx prisma migrate status` | `D:\АГЕНТ\ДЖАРВИС` | 0 | ~15s | Passed | Database schema is up to date! (9 migrations) |
| `npm run lint` | `D:\АГЕНТ\ДЖАРВИС` | 0 | ~15s | Passed | 8 warnings (unused expressions, disable directives) |
| `npm run test -- --run` | `D:\АГЕНТ\ДЖАРВИС` | 0 | 6.95s | Passed | 333 tests passed, 0 failed. |

## 17. Security findings
- `src/middleware.ts` explicitly bypasses all authentication.
- Secrets exist in `.env` templates but are safely ignored via `.gitignore` (`.env.local`, etc.).
- No active credentials leaked in repository history.
- Local sandbox is not yet enforced by the OS, relies entirely on `src/lib/command-router/router.ts`.

## 18. Reusable components
- Vitest testing framework.
- `CommandRouter` logic (properly blocking dangerous commands in tests).
- Prisma models and established API routes.
- Tailwind / Radix UI component library.

## 19. Components requiring replacement
- `src/middleware.ts` (Needs real auth integration).
- Mock service logic in `pipeline`, `ocr`, and `integration-plan`.
- In-process Next.js executors (must be moved to Local Daemon).

## 20. Exact MVP scope
- Fix typecheck error caused by git rename.
- Re-enable and verify Auth/RLS.
- Implement isolated Local Daemon on Windows.
- Replace core mock operations with actual Provider API integrations.
- Establish robust Tool Hub execution.
- Create allowed Workspace directories on D:.

## 21. Non-goals
- RAG, embeddings, rerankers, GPU workloads.
- Social Center, Calls Center, WhatsApp.
- Unapproved autonomous financial/publication actions.

## 22. D: drive allowlist proposal
Tested directories; **NONE of them currently exist**. They must be explicitly created:
- `D:\JARVIS_WORKSPACES`
- `D:\JARVIS_ARTIFACTS`
- `D:\JARVIS_LOGS`
- `D:\JARVIS_TEMP`
*No other directories should be accessible to the agent runtime.*

## 23. P0/P1 blockers
- **[P0] Typecheck Failure:** Uncommitted rename `[nextauth]` -> `[...nextauth]` breaks `typecheck`. Must be fixed before any extensive refactoring.
- **[P1] Disabled Auth:** Middleware skips all authorization, representing a critical failure path for real deployment.
- **[P1] Missing D: Directories:** The target workspace directories do not exist on the local disk.

## 24. NOT_RUN and UNKNOWN
- `npm run build` was NOT_RUN due to the `typecheck` failure.
- Security script execution (`npm run smoke:security`) was deferred to prevent unknown side effects.

## 25. Initial task ledger
1. Fix NextAuth route type references.
2. Initialize and verify D: directories.
3. Remove mock returns for baseline providers.
4. Set up separate Local Daemon process scaffold.
5. Apply correct Auth middleware rules.

## 26. Handoff for PROMPT 2
Audit phase complete. The baseline is verified, test suite is green (except for `typecheck`), and mock boundaries are identified. Proceed to PROMPT 2 for implementation phase.
