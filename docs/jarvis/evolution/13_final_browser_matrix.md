# Final Browser Matrix

Browser run: local Next.js development server on `http://localhost:3000`, Chrome extension browser, 2026-07-23.

## Responsive matrix

| Viewport | Outer overflow | Dashboard overflow | Chat width | Upload control | YouTube panel | Status |
|---:|---:|---:|---:|---|---|---|
| 320 | none | none | 288 | visible | hidden by mobile breakpoint | PASS |
| 360 | none | none | 328 | visible | hidden | PASS |
| 375 | none | none | 343 | visible | hidden | PASS |
| 390 | none | none | 358 | visible | hidden | PASS |
| 414 | none | none | 382 | visible | hidden | PASS |
| 768 | none | none | 736 | visible | hidden | PASS |
| 1024 | none | none | 940 | visible | hidden | PASS |
| 1280 | none | none | 660 | visible | visible | PASS |
| 1440 | none | none | 720 | visible | visible | PASS |

## Scenario matrix

| # | Route / element | Actual evidence | Status |
|---:|---|---|---|
| 1 | `/` main | loaded; DOM and desktop visual captured | PASS |
| 2 | top panel | full viewport width | PASS |
| 3 | glass panels | visually present | PASS |
| 4 | neon text | visually readable at desktop | PASS |
| 5 | sidebars | rendered without horizontal overflow | PASS |
| 6 | desktop chat | centered panel, bounded width | PASS |
| 7 | mobile chat | 288–382 px across phone widths | PASS |
| 8 | image upload | visible control; binary server policy tested | BLOCKED_BY_ACCESS |
| 9 | video upload | visible control; binary capability rejects unsupported provider | BLOCKED_BY_ACCESS |
| 10 | document upload | visible control; policy passes text; DB migration missing | BLOCKED_BY_ACCESS |
| 11 | MIME spoofing | live endpoint returned 400 | PASS |
| 12 | oversized | unit test >20 MB rejected | PASS (unit) |
| 13 | cancellation | AbortController and cancel control present | PASS (code); browser file handoff blocked |
| 14 | duplicate | client identity plus server SHA-256 path | PASS (unit/code); DB run blocked |
| 15 | YouTube valid | `youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0` | PASS |
| 16 | YouTube invalid | external URL removed iframe and showed safe error | PASS |
| 17 | empty/loading/error | empty status present; invalid error present; lazy iframe | PASS |
| 18 | provider selection | settings displays configured/missing providers | PASS |
| 19 | provider test | Ollama Cloud `CONNECTED`, 872 ms | PASS |
| 20 | missing credentials | missing providers disabled; no keys shown | PASS |
| 21 | audio playback | missing `/music/track1.mp3` returned 404 | FAIL (P2) |
| 22 | visualizer response | cannot verify without audio asset | BLOCKED (P2) |
| 23 | pause stops visualizer | cannot verify without audio asset | BLOCKED (P2) |
| 24 | project dry-run | browser form POST `/api/jarvis/network` 200 | PASS |
| 25 | agent execution | production executor unit path verified; no external generation invoked | PASS (code) |
| 26 | blocked provider | production rejects mock/unavailable provider | PASS |
| 27 | restart/resume | remote migrations missing | BLOCKED_BY_ACCESS |
| 28 | retry | bounded executor retry path implemented | PASS (unit/code) |
| 29 | cancel | AbortSignal propagated | PASS (code) |
| 30 | refresh persisted state | runtime DB schema missing | BLOCKED_BY_ACCESS |

Application console contained no application-origin errors during the final main-page check. Logged warnings were from an unrelated Chrome extension content script. Browser file selection itself was blocked by the Chrome extension setting that disallows file URL access; the server endpoints were consequently checked through local HTTP requests.
