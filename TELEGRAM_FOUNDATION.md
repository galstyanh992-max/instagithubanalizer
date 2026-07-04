# Telegram Foundation

No real Telegram API calls, no polling, no webhook, no token usage in this phase.

## Scope
`src/lib/telegram/` — config (redacted, token/allowed-user check), command-parser, message-router.
Route: `POST /api/telegram/message` (internal/test only, not a live webhook).

## Config
`getTelegramConfig()` returns `{tokenConfigured, allowedUserConfigured, allowedUserId}` — never the token. Missing token/allowed-user → `not_configured`, not a failure.

## Allowed user
`validateTelegramUser(id)` — only exact match to `TELEGRAM_ALLOWED_USER_ID`. Unauthenticated/unmatched → actor `{id:"unknown", role:"viewer"}` → denied by Safety Layer (fail closed).

## Commands
`/status /help /approve <id> /reject <id> /reports /github_report`, plain text → routed to Command Router with `source:"telegram"`.

## Approval
`/approve` / `/reject` are plan-only — record decision, **never execute** the underlying action in this phase.

## NOT IMPLEMENTED
Real Telegram Bot API sends, long-running polling/webhook, live approval execution, scheduled daily reports.
