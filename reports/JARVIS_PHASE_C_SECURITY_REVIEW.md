# JARVIS Phase C — Security Review

Date: 2026-08-09

Scope: Phase C capability intelligence, Curator, feedback/routing integration, Capability Center API, and the supporting network run/resume/read paths touched by Phase C.

## Outcome

PASS. Three independent focused reviews were run and their validated findings were remediated and revalidated. No Phase C path installs, activates, or executes repository source. Production and remote Supabase were not modified.

## Closed findings

- Repository assessment now requires a scanner-owned complete snapshot, a 40-character source commit and a SHA-256 digest over the complete sorted file inventory. License is derived from repository files; conflicting license text resolves to the more restrictive policy.
- Curator normalization blocks install lifecycle hooks, environment/credential harvesting, prompt injection, remote download-and-execute patterns, Docker privilege primitives, Docker socket/named-pipe access, and absolute host binds in block, quoted, long and flow-style Compose syntax.
- The excluded repository policy canonicalizes GitHub HTTPS, SSH, `.git`, case and trailing separators.
- Staging is internal-only, assessment-only, exclusive-write, canonically contained, randomized, and refuses redirected roots. Staged output remains inert with `installAllowed=false` and `activationAllowed=false`.
- Capability feedback accepts only bounded operational metadata, rejects secret-like values, recovers from malformed snapshots, fails open at the execution boundary, uses an exclusive inter-process lock and atomically replaces its bounded snapshot.
- Capability discovery preserves workspace scope. Undefined scope returns global tools only, and resumed runs reuse their persisted workspace.
- The network create, resume, and run-detail routes require the configured JARVIS owner; run lookup is owner-scoped, JSON/form bodies are bounded, and cross-origin orchestration is rejected.

## Verification

- Phase C malicious fixture regression matrix: PASS.
- Curator E2E (`assessment -> staging -> adaptation -> isolated registry -> Dashboard reality -> cleanup`): PASS.
- Independent residual revalidation: no reportable findings after remediation.
- `npm audit`: 0 known vulnerabilities across 1,355 dependencies.
- Targeted secret-pattern scan: no credible committed secret in Phase C scope.

## Non-blocking tooling note

The Codex Security workbench prompt launcher could not create a scan artifact because its Windows subprocess decoder used cp1251 against the Unicode repository path `D:\АГЕНТ\ДЖАРВИС`. Configuration preflight passed. Security coverage was completed with independent focused reviewers, targeted regression fixtures, dependency audit and source inspection; no scan ID was fabricated.
