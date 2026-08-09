# QA and Security Report

| Check | Evidence | Status |
|---|---|---|
| Typecheck | `npm run typecheck`, exit 0 | VERIFIED |
| Full test suite | `npm test`, exit 0, 35 files / 279 tests | VERIFIED |
| Security smoke | `npm run smoke:security`, exit 0 | VERIFIED |
| Production build | `npm run build`, exit 0 | VERIFIED with NFT/middleware warnings |
| Browser desktop smoke | Local `/` rendered with header, left/right sidebars, player, and chat | VERIFIED |
| Mobile overflow | 320px: `scrollWidth=320`, `clientWidth=320` | VERIFIED |
| Browser console | No JARVIS app errors observed; extension emitted unrelated listener warnings | VERIFIED |

Confirmed findings: P1 — agent executor is a deterministic mock. P1 — full required browser matrix, upload flow, YouTube player, and provider/runtime verification were not available/proven. P2 — Node emitted DEP0190 during the full test suite; the calling site must be located before treating child-process shell usage as safe.
