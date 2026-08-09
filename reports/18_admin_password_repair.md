# Admin Password Repair

**Дата:** 2026-07-24  
**Статус:** `PASS` для isolated repair `AUTH-002`.

## Root cause and minimal fix

Credentials provider использовал hard-coded default для `JARWISYAN_ADMIN_PASSWORD`. Default удалён. При включённом auth и отсутствии непустого password сервер выдаёт нормализованную configuration error с именем настройки, но без значения. При явно выключенном auth отсутствие password допустимо, а Credentials provider не принимает вход без configured password.

NextAuth secret logic не получала новый fallback и не была изменена этим isolated repair. Последующий Prompt 4 перенёс обе проверки в общий server-only loader без изменения auth-модели.

## Tests and verification

| Check | Result |
| --- | --- |
| Missing password with enabled auth | safe configuration error |
| Disabled auth without password | expected typed configuration |
| Invalid password | denied |
| Explicit test password | accepted in test flow |
| Targeted tests | 4/4 passed before centralization; combined matrix 10/10 passed after |
| Lint changed files | exit 0 |
| Typecheck | exit 0 |
| Full tests | exit 0, 333 passed |
| Production build | exit 0 |
| Source scan for password fallback | absent |

## Security boundary

- Password is read only in the server-side config/NextAuth code.
- Login UI sends only the user-entered value through `signIn`; it contains no configured password.
- No value is logged or returned by configuration errors.
- A static client chunk contains the *name* of the configuration variable only, from login help text. It contains no value and no `NEXTAUTH_SECRET` reference. This is not a secret leak.

## Rollback

Reverting the source change would reintroduce a known password fallback and is not safe. Operational rollback is to set the required value in the secret store for an enabled environment, not to restore a code default.
