# Production v1 Scope

User journeys: idea → blueprint → task graph → local plan → approval → bootstrap → verification → browser QA → repair → release verdict. A user can inspect persisted progress and cancel, resume or retry safe operations. Attachments, model selection, media and catalog ingestion remain capability- and policy-gated.

Security boundaries: D: only; reject UNC/device/other-drive paths; no client shell commands; no external action without approval; quarantine unreviewed third-party code; redact secrets; use an allowlisted browser URL policy.
