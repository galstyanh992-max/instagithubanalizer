# Codex ChatGPT Subscription Provider — Repository Audit

Date: 2026-07-23  
Scope: read-only audit completed before provider implementation.

## Executive finding

JARVIS has reusable provider, orchestration, approval, event, persistence, API, and settings surfaces, but it does not currently have a real Codex ChatGPT subscription provider.

The existing `src/server/executor/codex-cli-adapter.ts` is a simulation: it writes a fixed “Simulated Codex CLI Execution Report” and reports success without starting Codex. It must not be used as evidence that Codex is installed, authenticated, healthy, or able to run a turn.

The trusted local machine currently reports:

- official CLI: installed
- version: `codex-cli 0.144.6`
- official `codex login status`: authenticated

No credential file, token, cookie, browser storage, or private endpoint was inspected. The authentication probe used only the official CLI command and reduced its output to a status category.

## Existing architecture

### Provider abstraction and router

- `src/lib/ai-provider/types.ts` defines a compact request/response `AIProvider` contract for OpenAI-compatible completion APIs.
- `src/lib/ai-provider/provider-registry.ts` provides a singleton provider registry.
- `src/lib/ai-provider/providers.ts` creates API-key-backed providers from environment configuration.
- `src/services/ai-provider-router.service.ts` routes intents through registered completion providers and fallback order.
- `src/components/settings/ai-provider-center.tsx` displays configuration and connection-test status.

This abstraction is useful for ordinary completion providers but is too narrow for Codex app-server lifecycle, authentication, threads, turns, interruption, approval requests, and streaming events.

### Process execution and sandboxing

- `src/server/local-control/command-runner.ts` uses a fixed command allowlist and approval checks, but accepts a command string and uses a shell for Windows package commands.
- `src/server/local-control/sandbox.ts` enforces repository path bounds for task artifacts.
- `src/server/local-control/tasks.ts` persists task files under `.jarvis/tasks`.
- local terminal and file APIs contain duplicated loopback checks.

The Codex provider needs a separate no-shell process boundary with fixed executable and argument allowlists. It must not accept arbitrary CLI flags or shell command strings from an HTTP request.

### Existing Codex executor

`src/server/executor/codex-cli-adapter.ts` is not a real provider:

- no CLI detection
- no official login status
- no app-server process
- no protocol handshake
- no thread or turn lifecycle
- no event stream
- no cancellation
- no model discovery
- simulated success report

It will be isolated from provider truth. A real implementation must never fall back to this simulation.

### Approvals and events

- `src/lib/approval/index.ts` supplies durable human approval requests.
- `src/lib/event-bus/index.ts` persists canonical events to `EventLog` and dispatches in-memory subscribers.
- `src/lib/types/events.ts` is the canonical typed event registry.

Codex server-initiated approval requests must normalize to `APPROVAL_REQUIRED` and remain pending until an explicit user decision. The provider must never auto-approve tool or command execution.

### Persistence

- Prisma is the canonical persistence layer through `src/lib/db.ts`.
- `OrchestrationRun`, `AgentTask`, `AgentExecution`, artifacts, findings, and checkpoints already cover orchestration history.
- CRM `Conversation` and `ConversationMessage` are lead/platform-specific and are not an appropriate store for Codex threads.

An additive Codex session model is appropriate. It may store provider ID, status, CLI version, thread ID, active turn ID, model, reasoning effort, validated working directory, bounded failure summary, and timestamps. It must never store credentials, auth output, cookies, tokens, or raw sensitive process output.

### Security and deployment boundary

- Next middleware can require application authentication, especially in production.
- current loopback checks are duplicated and can incorrectly trust a loopback `X-Forwarded-For` independently of the request host.
- Codex subscription control is valid only on the trusted local Node runtime.

Provider routes need a shared fail-closed guard:

- Node runtime only
- loopback request host
- reject non-loopback forwarding information
- reject deployment/runtime markers that indicate a hosted environment
- no remote install, login, logout, process control, or repository turn

### UI

The existing AI Provider Center is the correct settings entry point. Codex must be shown as a separate local subscription card, not as an API-key row and not as an alias for `OPENAI_API`.

## Official integration boundary

The implementation will use only documented official surfaces:

- `codex --version` for installation/version detection
- `codex login status` for sanitized authentication status
- `codex login` for user-initiated official browser/device authentication
- `codex logout` only after explicit user confirmation
- `codex app-server` over its default JSONL stdio transport
- required `initialize` request followed by `initialized` notification
- official thread, turn, interrupt, and model-list protocol methods

The version-matched app-server schema generated by the installed official CLI is the protocol source of truth where it is available. The provider will not read Codex credential files or call private ChatGPT/OpenAI web endpoints.

## Selected design

1. Add a separate extended Codex subscription contract without breaking the existing `AIProvider` interface.
2. Add an injectable no-shell Codex process runner with:
   - exact executable
   - exact argument allowlist
   - timeout and output caps
   - deterministic process termination
   - sanitized error categories
3. Add a long-lived app-server client manager with:
   - one process per JARVIS server instance
   - initialize handshake
   - monotonic request IDs and pending-request correlation
   - bounded event queues
   - crash fan-out to all pending operations
   - restart on a later explicit operation, never silent in-flight replay
4. Discover models dynamically through app-server. If discovery is unsupported or fails, return an honest typed failure and do not invent a model list.
5. Validate repository working directories as canonical local directories on the `D:` drive and reject UNC/network paths.
6. Normalize Codex notifications into stable JARVIS event types while preserving only safe structured metadata.
7. Add local-only APIs for status, login, logout, models, threads, turns, cancellation, health, and event polling.
8. Add additive metadata-only persistence and a migration.
9. Add an explicit Codex routing path for repository/coding workflows. Do not silently replace API-backed chat routing or claim readiness from installation alone.
10. Replace simulated Codex executor success with either the real provider path or an explicit unsupported/blocked result.

## Status model

The provider will expose these stable statuses:

- `NOT_INSTALLED`
- `INSTALLED`
- `AUTH_REQUIRED`
- `AUTHENTICATING`
- `READY`
- `BLOCKED`
- `PROCESS_FAILED`
- `MODEL_UNAVAILABLE`
- `RATE_LIMITED`
- `PERMISSION_DENIED`

Availability and health are distinct:

- installed does not mean authenticated
- authenticated does not mean app-server healthy
- app-server healthy does not mean a requested model is available
- a started thread does not mean a turn completed

## Risks and required controls

- **Protocol drift:** use version-matched generated schemas and defensive response parsing.
- **Process crash:** reject pending requests, emit `PROCESS_TERMINATED`, and require a new explicit operation to restart.
- **Backpressure:** bound stdout line size, pending requests, per-thread events, and retained stderr.
- **Approval safety:** never auto-approve server requests.
- **Secret leakage:** never persist or return raw login output; redact token/auth/cookie-like fields recursively.
- **Path escape:** canonicalize and require a local `D:` directory; reject UNC and non-directory paths.
- **Remote exposure:** fail closed outside a trusted loopback Node runtime.
- **False success:** no simulated health, model, thread, turn, or completion result.

## Audit verdict

Implementation may proceed. Baseline verdict: `NOT_READY` until the real app-server integration, tests, local API guard, persistence, and UI are implemented and verified.
