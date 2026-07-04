# Daily Reports

No scheduler. No real Telegram sends. On-demand report builder only.

## Scope
`src/lib/daily-reports/` — types, report-builder (Project Brain + GitHub Watcher + API Hub, all local/no-network), formatters (markdown, Telegram-short ≤800 chars).
Route: `POST /api/daily-reports/build`.
Telegram: `/reports` (general summary), `/github_report [text]` (optional GitHub section).

## Sections
summary, commands, approvals, github (optional), api_topics, developer, agents, risks, recommendations.

## Sensitive data
Sourced via Project Brain public projection — sensitive entries already redacted upstream; report never re-exposes raw content.

## NOT IMPLEMENTED
Scheduler/cron, real Telegram sending, live external API enrichment, AI summarization, email delivery, 24/7 server mode.
