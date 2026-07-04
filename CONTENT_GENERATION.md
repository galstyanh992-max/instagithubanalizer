# Content Generation Foundation
Plan/draft-only. Never calls generation APIs, never publishes.
Scope: `src/lib/content-generation/` (content-intent, planner). Router: `content_task`. Route: `POST /api/content-generation/plan`.
Modes: image, video, voice, social_post, caption, content_calendar, campaign_plan, publish, unknown.
Uses API Hub metadata only (no live calls). Publish/video/voice → approval required. Impersonation/spam/copyright-copy → deny.
NOT IMPLEMENTED: real image/video/voice generation API calls, social publishing.
