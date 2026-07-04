# Email Foundation
Draft-only. Never sends, never connects to a mailbox.
Scope: `src/lib/email-foundation/` (email-intent, draft-builder). Router: `email_task`. Route: `POST /api/email/draft`.
Intents: draft_email, reply_email, summarize_email, classify_email, extract_action_items, prepare_followup, send_email, unknown.
Policy: send_email → approval required, never executed; phishing/impersonation/mass-spam → deny; secret-like content → deny.
NOT IMPLEMENTED: Gmail/SMTP/IMAP connection, real send, mailbox reading.
