# Agent Factory

Draft-only agent creation. **Never activates, schedules, or runs an agent.**

## Scope
`src/lib/agent-factory/` — purpose classifier, capability/tool/API matching, unsafe-request filter, draft builder.
Router `agent_task` → `createAgentDraft`. Route: `POST /api/agents/factory`.

## Purposes
github_watcher, finance_news_monitor, competitor_monitor, developer_helper, database_reviewer, api_connector, content_creator, researcher, personal_assistant, custom.

## Approval
Every template defaults `requiresApproval: true` except low-risk cases; agents never get owner/admin permissions by default (explicit permission lists only, e.g. `repo.read`, `api.read`).

## Prohibited (hard deny, no draft created)
Private-account spying, credential theft, security/paywall bypass, private scraping, autonomous trading/payments/unapproved posting.

## NOT IMPLEMENTED
Background scheduling, autonomous execution, real external API calls, marketplace, MCP tool execution, Telegram-triggered agents.
