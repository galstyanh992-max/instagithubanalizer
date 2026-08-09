# NextAuth Configuration Gate

**Дата:** 2026-07-24  
**Режим проверки:** read-only; исходники, `.env*`, callbacks, middleware, providers и БД не изменялись.  
**Итог:** `NEXTAUTH_CONFIGURATION_GATE=BLOCKED`.

## Подтверждённая архитектура аутентификации

- Используется `next-auth` v4.24.11, route handler расположен в `src/app/api/auth/[nextauth]/route.ts`.
- Конфигурация берётся из `src/lib/auth.ts`.
- Настроен только `CredentialsProvider`: форма `src/app/login/page.tsx` отправляет пароль через `signIn("credentials")`.
- Сессия имеет стратегию JWT; adapter/БД-сессии и OAuth-провайдеры в текущем `authOptions` не настроены.
- В `src/middleware.ts` production-политика fail-closed: auth включён, если `JARWISYAN_AUTH_ENABLED` явно не равен `"false"`; в non-production он включается только при явном `"true"`.
- API, кроме `/api/auth`, требует token при включённой middleware; `/login` и `/api/auth` остаются публичными.

## Подтверждённая причина блокировки runtime

Предыдущий standalone smoke зафиксировал перенаправление в `/api/auth/error?error=Configuration` и сообщения NextAuth `NO_SECRET` вместе с предупреждением об отсутствии `NEXTAUTH_URL`. Следовательно, production runtime не может считаться готовым, пока не подтверждены безопасно переданные runtime-конфигурации.

Есть также кодовое расхождение, требующее отдельного исправления до production release:

1. В `src/lib/auth.ts` присутствует hard-coded fallback для NextAuth secret.
2. В том же файле присутствует hard-coded fallback для административного пароля.

Эти fallback-значения не приводятся в отчёте и не должны использоваться. Их наличие означает, что даже при подготовленных environment variables требуется отдельное безопасностное исправление исходников. В рамках данного read-only gate изменения не выполнялись.

## Требуемая конфигурация (без передачи значений в чат)

| Контекст | `NEXTAUTH_URL` | Secret / access configuration |
| --- | --- | --- |
| Локальный standalone smoke | Точный URL, по которому браузер обращается к запущенному экземпляру, например `http://localhost:3001` при запуске на этом адресе | Локально — только в неотслеживаемом env-файле или безопасном хранилище процесса; не в Git и не в чате. |
| Preview | Канонический публичный HTTPS URL конкретного preview deployment | Отдельные preview secrets в secret manager платформы. |
| Production | Канонический публичный HTTPS URL production-домена | Уникальный непустой `NEXTAUTH_SECRET` и явный административный пароль — только через production secret manager. |

Для текущей Credentials-схемы также должен быть явно подготовлен `JARWISYAN_ADMIN_PASSWORD`. В `.env.example` указаны имена `JARWISYAN_AUTH_ENABLED`, `NEXTAUTH_SECRET` и `NEXTAUTH_URL`; имя административного пароля используется кодом и формой входа, но в example-файле отсутствует.

## Provider gate

`OAUTH_PROVIDER=NOT_NEEDED`: для текущего NextAuth login smoke OAuth-провайдер не нужен, поскольку в `authOptions` настроен только Credentials provider. Отдельные YouTube OAuth variables не являются условием этого NextAuth gate.

## Условия продолжения

Следующий runtime smoke допустим только после получения статусов (без значений секретов):

```text
NEXTAUTH_SECRET: READY | BLOCKED
NEXTAUTH_URL: READY | BLOCKED
JARWISYAN_AUTH_ENABLED: READY | BLOCKED
JARWISYAN_ADMIN_PASSWORD: READY | BLOCKED
OAUTH_PROVIDER: NOT_NEEDED
```

После `READY` будет выполнен изолированный runtime smoke без вывода env-значений. Production release остаётся заблокированным до устранения двух hard-coded fallback-значений и успешного smoke.

