# ДЖАРВИС

ДЖАРВИС — это продвинутая система управления автономными агентами, анализа кода и рабочих процессов, вдохновлённая Jarvis. Включает в себя Agent Safety Guards, память, инструменты для автоматизации (workflows) и поддержку голосового интерфейса.

## Как запустить локально

```powershell
npm install
npm run typecheck
npm run lint
npm run build
npx prisma validate
npx prisma generate
npm run dev
```

Откройте `http://localhost:3000` в браузере.

## Основные маршруты
- `/agents` — Управление агентами.
- `/workflows` — Процессы и задачи.
- `/approvals` — Подтверждения опасных действий.
- `/settings` — Настройки системы.
- `/memory` — Управление памятью.
- `/voice` — Голосовой интерфейс.

## Архитектура
Система построена на Next.js (App Router), Prisma (SQLite для локальной разработки, PostgreSQL для продакшена), TailwindCSS, Shadcn/ui и Framer Motion. 
Все опасные вызовы API перехватываются слоем **Safety Gates**.

### Safety Gates
ДЖАРВИС имеет встроенную систему защиты:
- **SafetyValidator**: Анализирует команды (например, `rm -rf`, `vercel --prod`) и определяет уровень риска.
- **PermissionChecker**: Проверяет, может ли текущий актор выполнять действия с определённым уровнем риска.
- **PromptInjectionGuard**: Блокирует попытки `prompt injection` (например, "ignore previous instructions") в `/api/chat`.
- **AuditLogger**: Все подозрительные вызовы и блокировки логируются для анализа.

Функция `runSafeAction` агрегирует проверки. Действия уровня HIGH/CRITICAL всегда требуют ручного подтверждения (Approval Flow), которые можно найти на странице `/approvals`.

### Fallback Mode
Если база данных или сторонние API недоступны, ДЖАРВИС активирует Fallback Mode, возвращая заглушки (mock data). Это позволяет не блокировать работу UI при нестабильном интернете.

## Переменные окружения (env)
Скопируйте `.env.example` в `.env.local` и заполните:
```
DATABASE_URL="file:./dev.db" # Для локальной разработки
```
**Важно:** Никогда не добавляйте в репозиторий реальные токены. `.gitignore` настроен на игнорирование `.env.local` и других файлов с секретами.

## Как запустить проверки и smoke-тесты
```powershell
npm run smoke
```
Скрипт выполнит smoke-тесты для API агентов, процессов, chat и approvals.

## Подготовка к GitHub
1. Запустите `npm run lint` и `npm run typecheck`.
2. Убедитесь, что `git status` не показывает `.env` файлы с секретами.
3. Добавьте файлы и сделайте коммит.

## Подготовка к Vercel
Для деплоя на Vercel (PostgreSQL) необходимо:
1. Зарегистрировать проект в Supabase.
2. В панели Vercel задать следующие переменные (Vercel Environment Variables):
   - `DATABASE_URL` (используется для pooled connections в рантайме)
   - `DIRECT_URL` (используется для direct connections при миграциях через Prisma)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Убедиться, что скрипт сборки включает `prisma generate` (в `package.json` добавлен `"postinstall": "prisma generate"`).
4. Запустить миграции БД через `npx prisma migrate deploy` или `npm run db:deploy`.

## Текущие ограничения
- Часть функций агентов находится в Fallback Mode.
