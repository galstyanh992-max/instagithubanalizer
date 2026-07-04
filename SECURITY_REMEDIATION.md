# Security Remediation

## Incident summary
- Supabase anon-key-shaped file (`temp_NEXT_PUBLIC_SUPABASE_ANON_KEY.txt`) was committed to the repo, later removed from HEAD (Phase 3/Prompt 2). Blob still exists in git history.
- A GitHub PAT was supplied via chat-uploaded `Git.txt` and reused across multiple sessions for push/pull. `Git.txt` was never committed to this repo.

## Removed from current tree
`temp_NEXT_PUBLIC_SUPABASE_ANON_KEY.txt`, `db/custom.db`, `tool-results/bash_*.txt` — confirmed absent from `git ls-files` (HEAD).

## Remains in history
Same 3 paths present in `git log --all --diff-filter=A --name-only` — blobs recoverable from history until rewritten.

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
