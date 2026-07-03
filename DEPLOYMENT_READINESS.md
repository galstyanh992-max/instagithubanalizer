# Deployment Readiness

## Current Status
Проект ДЖАРВИС находится в стадии локальной разработки. Все основные маршруты и API защищены (Safety Gates внедрены), build/typecheck проходят успешно.

## Local Development
- БД: SQLite (`dev.db`).
- Инфраструктура: Next.js 16 (App Router) + Turbopack.
- Разработка ведётся локально, API отвечают корректно.

## GitHub Readiness
- Секреты защищены: `.gitignore` включает все виды `.env` файлов и ключей (`*.pem`, `*.key`). 
- Добавлены заглушки в `.env.example`.
- Проверка `git status` и `git grep` не выявила утечек секретов.
- **Статус**: ГОТОВ к загрузке в GitHub.

## Vercel Readiness
- Сборка: `npm run build` завершается без ошибок (~7s).
- Роутинг: Ошибок Hydration нет.
- Файловая система: Vercel является serverless-платформой, поэтому **SQLite не будет работать в продакшене** (база данных будет обнуляться с каждым запросом).
- **Статус**: ТРЕБУЕТ миграции на PostgreSQL.

## Supabase/PostgreSQL Migration
Для продакшена необходимо:
1. Зарегистрировать проект в Supabase.
2. Изменить provider в `prisma/schema.prisma` с `sqlite` на `postgresql`.
3. Добавить `DATABASE_URL` и `DIRECT_URL`.
4. Выполнить `npx prisma migrate dev --name init_postgres`.

## Required Environment Variables
Перед деплоем необходимо убедиться, что все ключи из `.env.example` прописаны в настройках Vercel Environment Variables.

## Secrets Safety
`.env.local`, `.env.production` и папка `.vercel` не должны коммититься. Секреты (JWT_SECRET, API Keys) нужно загружать только через Vercel UI.

## Known Blockers
- Prisma использует SQLite. Это главный блокер для Vercel.

## Pre-Push Checklist
- [x] Проверить `.gitignore`
- [x] Очистить историю коммитов от `.env` (если они были добавлены случайно)
- [x] Запустить `npm run typecheck`
- [x] Запустить `npm run lint`

## Pre-Deploy Checklist
- [ ] Переключить Prisma на PostgreSQL
- [ ] Проверить миграции базы данных на Supabase
- [ ] Заполнить Environment Variables в Vercel
- [ ] Запустить `npm run build` и убедиться в отсутствии проблем
