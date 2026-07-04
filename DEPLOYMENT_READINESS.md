# Deployment Readiness

## Current Status
Проект ДЖАРВИС находится в стадии локальной разработки. Все основные маршруты и API защищены (Safety Gates внедрены), build/typecheck проходят успешно.

## Local Development
- БД: SQLite (`dev.db`).
- Инфраструктура: Next.js 16 (App Router) + Turbopack.
- Разработка ведётся локально, API отвечают корректно.

## GitHub Readiness
- `.gitignore` покрывает `.env*` (кроме `.env.example`), `*.db`, `/tool-results/`, temp key files.
- `.env.example` создан (только placeholder-значения) в рамках Phase 3 / Prompt 2 cleanup.
- **Исправление**: ранее в репозитории был обнаружен tracked `temp_NEXT_PUBLIC_SUPABASE_ANON_KEY.txt`
  (Supabase anon key). Файл удалён из индекса и с диска. Ранее заявленный "secret-clean" статус
  был неверным. Рекомендуется убедиться в корректности Supabase RLS и при необходимости ротировать ключ.
- **Статус**: условно готов к GitHub после подтверждения RLS/ротации ключа.

## Vercel Readiness
- Сборка: `npm run build` проходит.
- Prisma datasource: PostgreSQL.
- `postinstall: prisma generate` добавлен.
- SQLite больше не является блокером.
- Остаётся: добавить Environment Variables в Vercel и применить миграции Supabase.
- **Статус**: ГОТОВ к настройке Vercel Environment Variables, затем к деплою.

## Supabase/PostgreSQL Migration
Для продакшена выполнено:
1. Зарегистрирован проект в Supabase.
2. Изменен provider в `prisma/schema.prisma` на `postgresql`.
3. Добавлены `DATABASE_URL` и `DIRECT_URL`.
4. В `package.json` добавлен `postinstall: "prisma generate"`.

## Required Environment Variables
Перед деплоем необходимо убедиться, что все ключи из `.env.example` прописаны в настройках Vercel Environment Variables.

## Secrets Safety
`.env.local`, `.env.production` и папка `.vercel` не должны коммититься. Секреты (JWT_SECRET, API Keys) нужно загружать только через Vercel UI.

## Known Blockers
- Нет критических code blockers.
- До деплоя нужно добавить все Environment Variables в Vercel.
- Нужно применить Prisma migrations к Supabase/PostgreSQL.

## Pre-Push Checklist
- [x] Проверить `.gitignore`
- [x] Очистить историю коммитов от `.env` (если они были добавлены случайно)
- [x] Запустить `npm run typecheck`
- [x] Запустить `npm run lint`

## Pre-Deploy Checklist
- [x] Переключить Prisma на PostgreSQL
- [ ] Проверить миграции базы данных на Supabase
- [ ] Заполнить Environment Variables в Vercel
- [x] Запустить `npm run build`
