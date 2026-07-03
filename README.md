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
Для деплоя на Vercel необходимо:
1. Заменить базу данных SQLite на PostgreSQL (например, Supabase или Neon).
2. Задать `DATABASE_URL` и `DIRECT_URL` в панели Vercel.
3. Проверить `DEPLOYMENT_READINESS.md` для получения подробной информации.

## Текущие ограничения
- БД настроена на SQLite, поэтому данные будут сброшены при деплое на Vercel (read-only file system). Ожидается миграция на Postgres.
- Часть функций агентов находится в Fallback Mode.
