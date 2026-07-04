# Prisma Migrations

## Current status
- Datasource: **PostgreSQL only** (`provider = "postgresql"`), with `url = DATABASE_URL`
  and `directUrl = DIRECT_URL`. There is no SQLite branch.
- Migration strategy: **migration files** under `prisma/migrations/`.
  Current baseline: `20260703183533_init_postgres` (full schema, 40+ models).
- `prisma db push` is NOT the production path. Use migrations.

## Local dev
```bash
npx prisma migrate dev --name <change>   # create + apply a new migration
npx prisma generate
```

## Production (Supabase)
```bash
npx prisma migrate deploy   # or: npm run db:deploy
npx prisma migrate status   # or: npm run db:status
```

## Notes
- Do not mix `db push` and `migrate` — it causes drift.
- The Agent OS models (Agent, Task, Tool, ApprovalRequest, Memory, CRM, Content, PromptOps)
  are included in the baseline migration.
