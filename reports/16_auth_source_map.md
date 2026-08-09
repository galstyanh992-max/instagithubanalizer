# Auth Source Map and Fallback Inventory

**Дата:** 2026-07-24  
**Режим:** Prompt 1, read-only audit. Исходники и env-файлы не изменялись; создан только требуемый отчёт. Значения секретов и содержимое `.env` не читались и не выводились.

## Подтверждённая схема

| Функция | Реализация |
| --- | --- |
| NextAuth entry point | `src/app/api/auth/[nextauth]/route.ts`, GET/POST handler из `authOptions` |
| Auth configuration | `src/lib/auth.ts` |
| Provider | Единственный `CredentialsProvider` |
| Login UI | `src/app/login/page.tsx`, `signIn("credentials")` |
| Session | JWT; adapter и database-session adapter не обнаружены |
| Middleware | `src/middleware.ts`, `withAuth` при включённом auth |
| Защищённые server consumers | departments и workflow-template routes/pages через `getServerSession(authOptions)`; API middleware требует token |
| Rate-limit consumer | `src/lib/rate-limit/index.ts` передаёт `NEXTAUTH_SECRET` в `getToken` |

## Findings

| ID | Severity | File | Line | Evidence | Runtime impact | Minimal fix |
| --- | --- | --- | --- | --- | --- | --- |
| AUTH-001 | P1 | `src/lib/auth.ts` | 28 | `NEXTAUTH_SECRET` имеет hard-coded fallback | Непредсказуемая/небезопасная подпись JWT при отсутствии переменной; conflict с fail-fast | Удалить fallback, серверно валидировать наличие до создания `authOptions` |
| AUTH-002 | P1 | `src/lib/auth.ts` | 16 | `JARWISYAN_ADMIN_PASSWORD` имеет hard-coded fallback | Известный пароль может принять Credentials provider | Удалить fallback; при включённом auth требовать явную настройку |
| AUTH-003 | P2 | `src/lib/auth.ts` | 17 | Пароль сравнивается обычным строковым сравнением | Сравнение не даёт гибкости для будущего password-store и не имеет rate-limit на этом уровне | Не менять модель в этом цикле; после удаления fallback оценить password hashing/identity provider отдельным решением |
| AUTH-004 | P2 | `src/middleware.ts` | 14 | В non-production auth выключен, если флаг не равен `"true"` | Dev/preview может оказаться открытым при неявной конфигурации | Для каждой среды передавать флаг явно; production уже fail-closed |
| AUTH-005 | P2 | `.env.example` | 7-9 | Перечислены auth flag, secret и URL, но отсутствует имя admin password | Оператор не получает полный список обязательных Credentials-настроек | Добавить только имя и не-секретный placeholder отдельным минимальным изменением после согласования |

`AUTH-003` не является утверждением о доказанной timing-атаке: это архитектурное улучшение. `AUTH-001` и `AUTH-002` — подтверждённые блокеры release.

## Environment map

| Environment variable | Loader | Validation сейчас | Server consumer | Client exposure risk | Required environment | Failure behavior сейчас |
| --- | --- | --- | --- | --- | --- | --- |
| `NEXTAUTH_SECRET` | Прямой `process.env` | Нет; есть fallback | `src/lib/auth.ts`, `src/lib/rate-limit/index.ts` | Нет `NEXT_PUBLIC_` префикса; прямой client import не найден | Local standalone, preview, production | Используется fallback; отдельно standalone ранее сообщил `NO_SECRET` |
| `NEXTAUTH_URL` | NextAuth runtime | Нет в `authOptions` | NextAuth runtime | Нет | Все browser-accessible runtime среды | Warning/configuration error при отсутствии или несогласованном origin |
| `JARWISYAN_AUTH_ENABLED` | Прямой `process.env` | Boolean-policy в middleware | `src/middleware.ts` | Нет | Явно для каждой среды | production: enabled, если не `false`; non-production: disabled, если не `true` |
| `JARWISYAN_ADMIN_PASSWORD` | Прямой `process.env` | Нет; есть fallback | `CredentialsProvider.authorize` | Нет `NEXT_PUBLIC_` префикса; login UI передаёт только пользовательский ввод в `signIn` | Когда Credentials auth включён | При отсутствии принимается fallback |
| OAuth variables | Отдельный YouTube OAuth module | Вне `authOptions` | `src/lib/youtube-oauth.ts` | Не являются NextAuth login configuration | Только если запускается YouTube OAuth | Не блокируют текущий Credentials login gate |

## Классификация

- **CONFIRMED:** AUTH-001, AUTH-002, AUTH-004, AUTH-005; auth entry points и consumers, перечисленные выше.
- **ASSUMPTION:** конкретный production domain и platform secret manager — отсутствуют в репозитории, не угадываются.
- **UNKNOWN:** фактическое присутствие env-переменных в runtime; значения и `.env` намеренно не проверялись.
- **FALSE_POSITIVE:** generic `fallback` в AI/provider/UI коде не относится к NextAuth или admin authentication.

## Client-boundary и error review

- `src/lib/auth.ts` не имеет `NEXT_PUBLIC_` imports и используется только server route/server session paths; прямого импорта в client component не найдено.
- Login UI не содержит preset-пароля: он хранит только введённое пользователем значение до `signIn` и не включает env-переменную.
- Конфигурационные ошибки NextAuth могут попасть в URL как `error=Configuration`, но значения secret/password этим маршрутом не передаются.

## Git / storage evidence

- В рабочем дереве были многочисленные предварительные изменения, включая `.env.example`; они не относятся к этому аудиту.
- Отслеживается только `.env.example`; `.env`, `.env.local` и `.env.production` игнорируются `.gitignore`.
- Значения секретов не обнаруживались и не выводились.

## Следующий минимальный repair loop

`AUTH-001` → удалить только fallback `NEXTAUTH_SECRET` → server-only fail-fast → targeted test → typecheck/test/build → scan удалённого fallback.

