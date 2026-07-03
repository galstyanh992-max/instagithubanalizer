// AI Jarwisyan — Русские подписи для UI

export const LABELS_RU = {
  // Навигация
  nav: {
    home: "Главная",
    dashboard: "Панель",
    upload: "Загрузка",
    repos: "Репозитории",
    compare: "Сравнение",
    board: "Доска",
    watchlist: "Избранное",
    manualReview: "Ручная проверка",
    categories: "Категории",
    voice: "Голос",
    settings: "Настройки",
    projects: "Проекты",
  },

  // Кнопки
  buttons: {
    uploadScreenshot: "Загрузить скриншот",
    analyzeRepo: "Анализировать репозиторий",
    openVoice: "Открыть голос",
    send: "Отправить",
    save: "Сохранить",
    cancel: "Отмена",
    delete: "Удалить",
    generate: "Сгенерировать",
    reanalyze: "Переанализировать",
    installPlan: "План установки",
    watch: "Отслеживать",
    unwatch: "Не отслеживать",
    compare: "Сравнить",
    speak: "Озвучить",
    export: "Экспорт",
    connectProject: "Подключить проект",
    generateIntegrationPlan: "Создать план интеграции",
    start: "Старт",
    stop: "Стоп",
    retry: "Попробовать снова",
  },

  // Вердикты (UI label — русский, значение в БД остаётся английским)
  verdicts: {
    USE_NOW: "Использовать сейчас",
    TEST: "Тестировать",
    SAVE: "Сохранить",
    SKIP: "Пропустить",
  },

  // Статусы
  status: {
    fallbackMode: "Fallback-режим",
    systemOnline: "Система онлайн",
    nodeOnline: "Узел: онлайн",
    synced: "Синхр",
    loading: "Загружаю панель...",
    awaitingInput: "ожидание ввода",
    ready: "готов",
  },

  // Чат
  chat: {
    placeholder: "Спросите Jarwisyan проанализировать репо, подключить проект или подготовить план интеграции...",
    thinking: "Jarwisyan думает...",
    empty: "Спросите Jarwisyan проанализировать репозиторий, подключить проект или подготовить план интеграции.",
    voiceButton: "Голосовой ввод",
  },

  // Ошибки
  errors: {
    dashboardFailed: "Не удалось открыть панель",
    dashboardFailedDesc: "Произошла ошибка при загрузке панели. Попробуйте снова или проверьте настройки.",
    dataFailed: "Не удалось загрузить данные",
    dbUnavailable: "База данных недоступна",
    apiKeyMissing: "API-ключ не настроен",
    repoNotFound: "Репозиторий не найден",
    githubRateLimit: "Превышен лимит запросов GitHub",
    ocrFailed: "OCR не смог распознать текст",
    voiceUnavailable: "Голосовой ввод недоступен",
    micDenied: "Микрофон не разрешён",
    disabled3d: "3D-режим отключён",
    failedSend: "Не удалось отправить сообщение",
    failedLoad: "Не удалось загрузить",
  },

  // Empty states
  empty: {
    noRepos: "Репозиториев пока нет",
    noReposHint: "Загрузите скриншот или проанализируйте репозиторий",
    noProjects: "Нет подключённых проектов",
    noProjectsHint: "Нажмите «Подключить проект» чтобы добавить первый",
    noMessages: "Команд пока нет",
    noActivity: "Активности пока нет",
    noWatchlist: "Список отслеживаемых пуст",
  },

  // Dashboard
  dashboard: {
    title: "ПАНЕЛЬ",
    subtitle: "Обзор сетки интеллектуального анализа репозиториев",
    totalRepos: "Всего репо",
    useNow: "Использовать",
    test: "Тест",
    save: "Сохранить",
    skip: "Пропустить",
    watchlist: "Избранное",
    riskyLicenses: "Рисковые лицензии",
    gpuRequired: "Требуют GPU",
    top10: "Топ-10 по приоритету",
    recentActivity: "Недавняя активность",
    coreStatus: "ЯДРО JARWISYAN",
  },

  // Voice
  voice: {
    title: "ГОЛОСОВОЙ ИНТЕРФЕЙС",
    subtitle: "Общайтесь с ИИ Jarwisyan через браузерный Web Speech API",
    startListening: "СТАРТ",
    stopListening: "СТОП",
    transcript: "Транскрипт",
    aiResponse: "Ответ ИИ",
    listening: "Слушаю...",
    awaitingCommand: "Ожидаю команду...",
    browserUnsupported: "Ваш браузер не поддерживает Web Speech API. Попробуйте Chrome или Edge.",
    history: "История команд",
    examples: "Примеры команд",
  },

  // Projects
  projects: {
    title: "МОИ ПРОЕКТЫ",
    subtitle: "Подключите проекты для планов интеграции",
    connectProject: "Подключить проект",
    newName: "Новый проект",
    nameRequired: "Укажите имя проекта",
    namePlaceholder: "Agent OS",
    description: "Описание",
    descriptionPlaceholder: "Краткое описание проекта",
    localPath: "Локальный путь",
    githubUrl: "GitHub URL",
    techStack: "Tech stack (через запятую)",
    techStackPlaceholder: "Next.js, Prisma, Three.js",
    goals: "Цели (по строкам)",
    integrationPlans: "планов интеграции",
  },
} as const;

export const DEFAULT_LANGUAGE = "ru" as const;
export const SUPPORTED_LANGUAGES = ["ru", "en"] as const;
