# NextAuth Secret Repair

**Дата:** 2026-07-24  
**Статус:** `PASS` для isolated repair `AUTH-001`.

## Root cause

`src/lib/auth.ts` использовал hard-coded fallback, когда `NEXTAUTH_SECRET` отсутствовал. Это не обеспечивало production fail-closed behavior и противоречило предыдущему standalone `Configuration` failure.

## Minimal diff

- `src/lib/auth.ts`: добавлена server-side проверка непустого `NEXTAUTH_SECRET`; при отсутствии выбрасывается нормализованная ошибка с именем настройки, без её значения.
- `src/lib/auth.ts`: `authOptions.secret` теперь использует только валидированное значение.
- `src/lib/auth.test.ts`: добавлены tests для отсутствующей и явной test-only конфигурации.

Fallback не заменялся новым статическим или генерируемым секретом; к client bundle ничего не передавалось. Admin password logic намеренно не изменялась — это следующий отдельный repair loop.

## Verification

| Command / check | Result |
| --- | --- |
| `npm test -- src/lib/auth.test.ts` | exit 0, 2 passed |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0 |
| Source scan for `NEXTAUTH_SECRET ||` | absent |
| `.next` scan for removed hard-coded fallback | absent |

Build завершился с ранее существовавшими non-fatal warnings по middleware convention и dynamic filesystem tracing; они не относятся к этому diff.

## Failure behavior

При отсутствии `NEXTAUTH_SECRET` server-only module завершается безопасной configuration error, которая содержит только имя отсутствующей настройки. Никакое значение не логируется и не включается в ошибку.

## Rollback

Откатить только изменение `src/lib/auth.ts` и удалить `src/lib/auth.test.ts`; это вернёт небезопасное поведение и не рекомендуется. Для безопасного operational rollback нужно восстановить valid environment variable, а не fallback в коде.

