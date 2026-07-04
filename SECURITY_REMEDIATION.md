# Security Remediation

## Incident summary
- Supabase anon-key-shaped file (`temp_NEXT_PUBLIC_SUPABASE_ANON_KEY.txt`) was committed to the repo, later removed from HEAD (Phase 3/Prompt 2). Blob still exists in git history.
- A GitHub PAT was supplied via chat-uploaded `Git.txt` and reused across multiple sessions for push/pull. `Git.txt` was never committed to this repo.

## Removed from current tree
`temp_NEXT_PUBLIC_SUPABASE_ANON_KEY.txt`, `db/custom.db`, `tool-results/bash_*.txt` — confirmed absent from `git ls-files` (HEAD).

## Remains in history
Same 3 paths present in `git log --all --diff-filter=A --name-only` — blobs recoverable from history until rewritten.

## History cleanup — EXECUTED LOCALLY (2026-07-04, force-push NOT done)
`git filter-repo --path temp_NEXT_PUBLIC_SUPABASE_ANON_KEY.txt --path db/custom.db --path-glob 'tool-results/bash_*.txt' --invert-paths`
Backup: branch `backup/pre-history-cleanup-20260704-233826`, tag `backup-pre-history-cleanup-20260704-233826` (local only, not pushed).
Verified: 0 matches for the 3 paths across `git log --all --name-only` and `git ls-files`. `origin` remote was auto-removed by filter-repo (expected) and re-added (fetch/push URL only, no network calls made).
Gates re-run post-cleanup: typecheck/lint/test (198/198)/build/prisma validate/smoke:security/smoke:repo — all PASS.
**Remote (GitHub) still contains the old history** — nothing pushed. Force-push is a separate, explicitly-approved step (see below).

## Force-push (NOT executed — requires separate explicit approval)
`git push --force-with-lease origin main`
Preconditions before running: (1) GitHub token rotated, (2) Supabase RLS/rotation decision resolved, (3) user gives explicit go-ahead, (4) user acknowledges collaborators must re-clone/reset (history hashes changed from `009a43a`/`d05d26a` onward).

## GitHub token rotation checklist
- [ ] Revoke the token that was pasted in chat (`Git.txt`), regardless of scope.
- [ ] Issue a new least-privilege token (repo-scoped only) via GitHub Settings → Developer settings → Tokens.
- [ ] Store it outside any repo/chat: OS credential manager, `gh auth login`, or a secret manager.
- [ ] Never place a token in a plain file under a repo or upload it to chat again.
- [ ] Confirm the old token is rejected (401) before considering this closed.

## Supabase checklist
- [ ] Rotate the anon key found in history, OR explicitly confirm RLS makes it safe as-is — do not skip this decision.
- [ ] Verify RLS policies deny anon access to: MemoryRecord/Project Brain, ApprovalRequest, Setting/User, Agent/Task.
- [ ] Confirm service-role key has never been used client-side / committed.
- [ ] Real values only in local `.env.local`, never committed.

## Git history cleanup checklist (manual, not executed here)
- [ ] Full backup / clean clone before any rewrite.
- [ ] Use `git filter-repo` (preferred) or BFG to strip: `temp_NEXT_PUBLIC_SUPABASE_ANON_KEY.txt`, `db/custom.db`, `tool-results/*` from all history.
- [ ] Re-scan with a secret scanner after cleanup; confirm zero hits.
- [ ] Force-push only with explicit owner approval, after rotation is already done.
- [ ] Any collaborators must re-clone or hard-reset — do not `pull` into old clones.
- [ ] Rotate secrets before AND re-verify after cleanup (cleanup does not substitute for rotation).
- [ ] Check GitHub secret-scanning / push-protection alerts if available on the repo.

## Rule
No secret values in chat, repo, docs, or tool output — ever. Paths and types only.
