# `use-voice.ts` lint repair

Date: 2026-07-24

## Confirmed root cause

The current source invoked `stopSpeaking` and `speakBrowser` before their `const` callback declarations. React Compiler reported `react-hooks/immutability` on those forward references. It also reported `react-hooks/preserve-manual-memoization` and ref mutation because `stopSpeaking` both participated in a memoized callback chain and modified `audioRef.current.currentTime`.

## Changed files

- `src/components/voice/use-voice.ts`

## Minimal diff

- Moved `audioRef` beside the other hook refs.
- Replaced only the three internal speech helpers (`speakBrowser`, `stopSpeaking`, `speak`) with function declarations in dependency order.
- Preserved the returned hook API and the existing Edge-TTS-first, browser-TTS fallback behavior.

No ESLint suppressions or global React Compiler changes were added.

## Rule evidence

| Rule | Previous lines | Cause | Resolution |
| --- | --- | --- | --- |
| `react-hooks/immutability` | 126, 152 | callback identifiers used before declaration | declarations preced their callers |
| `react-hooks/preserve-manual-memoization` | 175 | memoized callback could not be preserved with mutable ref work | internal helpers no longer use unnecessary callback memoization |
| `react-hooks/immutability` | 178 | mutable media ref operation inside the problematic callback chain | operation is retained in a normal event-time function |

## Verification matrix

| Command | Exit | Result | Notes |
| --- | ---: | --- | --- |
| `npx eslint src/components/voice/use-voice.ts` | 0 | PASS | No diagnostics. |
| `npm run lint` | 0 | PASS | 8 pre-existing warnings remain outside this file; no errors. |
| `npm run typecheck` | 0 | PASS | No TypeScript diagnostics. |
| `npm test` (immediately after combined checks) | 1 | RETRY | Vitest fork workers exhausted process memory; no failed assertion. |
| `npm test` (standalone retry) | 0 | PASS | 49 files and 323 tests passed. |

## Regression considerations

The hook has one consumer, `JarvisUnifiedConsole`. Its public fields and voice flow are unchanged. No direct unit test exists for browser speech/recognition APIs; browser-specific permission denial, unsupported-browser behavior, and unmount cleanup are therefore not independently verified in this repair loop.

## Rollback

Revert only the `src/components/voice/use-voice.ts` function-order change. This restores the prior behavior but also restores the confirmed compiler errors.
