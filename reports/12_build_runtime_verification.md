# Build and runtime verification

Date: 2026-07-24

## Environment

- OS: Windows NT 10.0.22631, x64.
- Node: v24.18.0; npm: 11.16.0.
- Package manager and lock: npm with `package-lock.json`.
- `node_modules`: present; `npm ls --depth=0 --omit=optional` exited 0.
- Python: Windows App Execution Alias is present; no usable interpreter version was confirmed.
- Port 3000 was already in use by an existing process. A dedicated production smoke process used port 3001 and was stopped after testing.
- `npm ci` was not run because dependencies were already installed and this destructive reinstall would remove the current local module tree during verification.

## Command matrix

| Command | Exit | Status | Evidence |
| --- | ---: | --- | --- |
| `npx eslint src/components/voice/use-voice.ts` | 0 | PASS | No diagnostics. |
| `npm run lint` | 0 | PASS | 8 warnings, 0 errors. |
| `npm run typecheck` | 0 | PASS | No diagnostics. |
| `npx prisma validate` | 0 | PASS | Previously validated schema; no migration/data command was run in this phase. |
| `npm test` | 0 | PASS | 49 test files, 323 tests. |
| `npm run build` | 0 | PASS | Next.js production build and standalone/public copy completed. |

## Build result

The production build completed in 68.3 seconds. Turbopack emitted tracing warnings for `src/app/api/files/raw/route.ts` because the trace reaches dynamic filesystem behavior, plus one non-fatal traced-file copy warning for the TTS route. It also warns that the `middleware` convention is deprecated in favor of `proxy`. None changed the exit code.

## Runtime result

The standalone server started successfully on `127.0.0.1:3001` and reported ready. Requesting `/` with the accepted host header returned `307` to `/api/auth/error?error=Configuration`. Server logs contain NextAuth `NO_SECRET` and `NEXTAUTH_URL` warnings; authentication is explicitly fail-closed because `JARWISYAN_AUTH_ENABLED` is unset in production.

Result: `BLOCKED_RUNTIME_AUTH_CONFIGURATION`. No secret value was inspected, requested, or changed. The smoke server was stopped after verification.

## Agent supervisor and MCP

NOT_RUN. The runtime cannot reach the authenticated main UI under the current production configuration. No write-worker, task creation, approval, or MCP action was attempted against the user workspace.

## Next action

Provision the production NextAuth configuration through the existing secret-management/deployment channel, then repeat runtime browser, supervisor transport, and MCP stdio smoke tests. Do not weaken or bypass auth to make the smoke test pass.
