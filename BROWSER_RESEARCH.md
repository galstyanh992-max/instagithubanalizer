# Browser / Research Foundation
Plan-only. No browser launch, no scraping, no network calls.
Scope: `src/lib/browser-research/` (mode-classifier, source-policy, planner, report-draft). Router: `browser_task`. Route: `POST /api/browser-research/plan`.
Modes: quick_lookup, deep_research, movie_recommendation, competitor_public_analysis, github_source_discovery, site_check, custom.
Policy: public_only, no_login, no_paywall_bypass, no_private_data enforced; paywall/private-data requests denied.
NOT IMPLEMENTED: real Playwright execution, live web fetch, scraping, login/credential handling.
