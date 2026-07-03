# Prisma Migrations

## Текущий статус
Проект использует `prisma db push` для применения схемы. Это нормально для MVP/development.

## Для production
1. Переключить datasource на PostgreSQL:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Создать первую миграцию:
   ```bash
   npx prisma migrate dev --name init
   ```

3. Применять миграции в production:
   ```bash
   npx prisma migrate deploy
   ```

## Текущие модели (16):
- User, Setting, Screenshot, ExtractedCandidate
- Repository, RepositoryAnalysis, InstallPlan
- Category, Tag, RepositoryTag
- AnalysisRun, WatchlistSnapshot
- ConnectedProject, IntegrationPlan
- MemoryRecord, KnowledgeVaultSource
- RepositoryHealthSnapshot
