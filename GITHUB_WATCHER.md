# GitHub Watcher

Manual-input intelligence workflow. No network calls, no install, no code copy.

## Scope
`src/lib/github-watcher/` — url-extractor (regex, dedupes), evaluator (keyword heuristics, no network), report-builder (sorts, records to Project Brain non-fatally).
Router: `github_analysis` intent + github.com URL in text → watch report.
Route: `POST /api/github-watcher/report`.

## Evaluation
Useful keywords (agent/mcp/tool/api/github/browser/voice/workflow/automation/memory/prisma/nextjs/supabase/openrouter/ai/llm/claude/assistant/safety/approval) vs risk keywords (malware/exploit/bypass/credential/phishing/keylogger/stealer/crack/spam/botnet/ransomware/ddos). Risk hit → HIGH risk, manual_review. compatibilityScore 0-100.

## NOT IMPLEMENTED
Instagram/YouTube/TikTok ingestion, live GitHub API enrichment, scheduler, morning-report automation, auto-install, code import, PR creation.
