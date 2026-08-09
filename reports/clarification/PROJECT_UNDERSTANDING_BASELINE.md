# PROJECT UNDERSTANDING BASELINE

## 1. Название проекта
ДЖАРВИС (JARVIS)

## 2. Назначение проекта
Безопасная операционная система для управления автономными AI-агентами, анализа кода и рабочих процессов. [FACT, `README.md`]

## 3. Целевой пользователь
Сам владелец/разработчик. Авторизация полностью удалена. [USER_DECISION]

## 4. Главная проблема
Необходимость создания единого умного ассистента с полным доступом к ПК для автономного выполнения задач, но с защитой от критических сбоев. [USER_DECISION, `README.md`]

## 5. Core User Flow
Пользователь ставит задачу оркестратору (голосом/текстом) -> Оркестратор планирует действия -> Оркестратор автономно их выполняет (если риск низкий/средний) либо запрашивает Approval (если риск очень высокий) -> Выполняет команду -> Возвращает результат. [USER_DECISION]

## 6. MVP Scope
Реализация Execution Layer для главного оркестратора. Платформа должна позволять оркестратору полноценно исполнять bash-команды и работать с MCP локально через `npm run dev`. [USER_DECISION]

## 7. Production Scope
Гибридное решение: выполнение локальных команд при запущенном `dev` сервере, выполнение легких интеграционных задач при деплое на Vercel. [USER_DECISION]

## 8. Non-goals
Изолированные чат-боты без доступа к системе; многопользовательский SaaS на данном этапе (авторизация удалена). [USER_DECISION]

## 9. Подтверждённая архитектура
Next.js 16 (App Router) + Prisma (PostgreSQL) + TailwindCSS. [FACT]

## 10. Agent Model
Единый главный оркестратор, управляющий системой и фоновыми процессами. [USER_DECISION]

## 11. Model Routing
Используется провайдер `glm` или `ollama_cloud` по умолчанию. [FACT]

## 12. Tool и MCP Routing
Инструменты и MCP-вызовы будут исполняться локально на машине пользователя. Execution layer предстоит реализовать. [USER_DECISION]

## 13. Approval Boundaries
Свобода действий. CRITICAL и очень опасные команды требуют ручного подтверждения пользователя. [USER_DECISION]

## 14. Data и Memory Model
Всё хранится в Prisma (PostgreSQL). `MemoryRecord` используется для памяти, логов, решений. Sensitive данные маркируются. [FACT]

## 15. Security Boundaries
Command Validator и Prompt Injection Guard блокируют опасные паттерны на уровне роутинга. [FACT]

## 16. Local-first Boundaries
Все системные задачи (Terminal, Filesystem, MCP) выполняются строго локально (на машине, где запущен `npm run dev`). [USER_DECISION]

## 17. Cloud Boundaries
Vercel может обрабатывать UI, базу данных, облачные запросы. [USER_DECISION]

## 18. Подключённые сервисы
PostgreSQL/Supabase (настроена схема). [FACT]

## 19. Неподключённые сервисы
MCP, OpenAI/Anthropic/OpenRouter API, Real Terminal Execution. [FACT]

## 20. Частично подключённые сервисы
Telegram, BullMQ, Redis (зависимости есть, код завязан на mock). [FACT]

## 21. Текущее состояние реализации
CORE_FEATURES_IMPLEMENTED. Базовая архитектура, БД, роутинг и Safety Gate работают. Отсутствует Execution Layer для автономного выполнения. [FACT]

## 22. Текущие blockers
Отсутствуют. Clarification Gate закрыт. [RESOLVED]

## 23. Ограничения компьютера
Intel Xeon E5-2699 v3, 64GB RAM, AMD Radeon RX 580 (No CUDA). [FACT]

## 24. Ограничения среды
Windows 11 Pro, Node 24.18.0. [FACT]

## 25. Deployment Model
Гибридная: локальный `npm run dev` для доступа к ОС (Local Agent Runtime), Vercel для хостинга веб-интерфейса и базы. [USER_DECISION]

## 26. Acceptance Criteria продукта
JARVIS может самостоятельно выполнить поставленную задачу в терминале или проекте с запросом подтверждения только на опасные шаги. [USER_DECISION]

## 27. Открытые некритические вопросы
Отсутствуют. [RESOLVED]

## 28. Принятые решения
Auth вырезан; MVP = Главный оркестратор с автономным выполнением локально. [USER_DECISION]

## 29. Устаревшие решения
Supabase Anon Key в открытом доступе; старые драфты Developer Operator, которые "никогда не исполняют код". [OUTDATED]

## 30. Evidence Index
- `schema.prisma`, `package.json`
- `README.md`, `API_HUB.md`
- Ответ пользователя на Q-MVP-01, Q-EXEC-02, Q-ACT-03
