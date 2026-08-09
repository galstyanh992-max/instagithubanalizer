// ─── JARVIS — Unified Page Registry ───────────────────────────
// Single source of truth for "open <section>" navigation intents.
// Used by the server-side orchestrator (jarvis-orchestrator.service),
// the command router, the voice endpoint, and the client-side parser
// (parse-jarvis-command). Eliminates the previous drift where each
// module maintained its own partial map and some pages were unreachable.
//
// Server-safe (no React / "use client") so it can be imported anywhere.

export interface PageEntry {
  /** Stable key, lowercase, ASCII */
  key: string;
  /** Route path */
  path: string;
  /** Human label shown to the user */
  label: string;
  /** Russian + English trigger keywords (already lowercased) */
  keywords: string[];
}

export const PAGE_REGISTRY: PageEntry[] = [
  { key: "dashboard", path: "/dashboard", label: "Дашборд", keywords: ["главн", "домой", "home", "dashboard", "статист", "обзор"] },
  { key: "projects", path: "/projects", label: "Проекты", keywords: ["проект", "project"] },
  { key: "agents", path: "/agents", label: "Агенты", keywords: ["агент", "agent", "сотрудник"] },
  { key: "memory", path: "/memory", label: "Память", keywords: ["памят", "memory", "knowledge"] },
  { key: "repos", path: "/repos", label: "Репозитории", keywords: ["репозитор", "github", "repo"] },
  { key: "workflows", path: "/workflows", label: "Процессы", keywords: ["workflow", "процесс", "задач"] },
  { key: "board", path: "/board", label: "Доска", keywords: ["доск", "board", "kanban", "kanban"] },
  { key: "approvals", path: "/approvals", label: "Подтверждения", keywords: ["подтвержд", "approval", "согласов", "одобрен"] },
  { key: "departments", path: "/departments", label: "Отделы", keywords: ["отдел", "department", "департам"] },
  { key: "categories", path: "/categories", label: "Категории", keywords: ["категори", "categ"] },
  { key: "watchlist", path: "/watchlist", label: "Список наблюдения", keywords: ["watchlist", "наблюден", "отслежива"] },
  { key: "upload", path: "/upload", label: "Загрузка / анализ", keywords: ["загрузк", "upload", "анализ", "скриншот", "ocr"] },
  { key: "manual-review", path: "/manual-review", label: "Ручная проверка", keywords: ["ручн", "manual", "проверк"] },
  { key: "compare", path: "/compare", label: "Сравнение", keywords: ["сравнен", "compare"] },
  { key: "deploy", path: "/deploy", label: "Деплой", keywords: ["деплой", "deploy", "docker", "release"] },
  { key: "jarvis", path: "/jarvis", label: "Сеть агентов JARVIS", keywords: ["jarvis network", "сеть агент", "orchestrat"] },
  { key: "graphify", path: "/graphify", label: "Граф кода", keywords: ["graphif", "граф кода", "code graph"] },
  { key: "phone", path: "/phone", label: "Телефон", keywords: ["телефон", "phone", "mobile"] },
  { key: "voice", path: "/voice", label: "Голос", keywords: ["голос", "voice"] },
  { key: "settings", path: "/settings", label: "Настройки", keywords: ["настройк", "систем", "setting", "system"] },
  { key: "login", path: "/login", label: "Вход", keywords: ["вход", "login", "авториза"] },
];

/**
 * Resolve a free-text command to a page path.
 * Returns null when no match is found.
 *
 * @example resolvePage("открой агентов") → "/agents"
 * @example resolvePage("перейди в настройки") → "/settings"
 */
export function resolvePage(text: string): PageEntry | null {
  const t = (text || "").toLowerCase().trim();
  if (!t) return null;

  // Exact key match first (e.g. "открой dashboard")
  for (const entry of PAGE_REGISTRY) {
    if (t.includes(entry.key)) return entry;
  }
  // Keyword match
  for (const entry of PAGE_REGISTRY) {
    for (const keyword of entry.keywords) {
      if (t.includes(keyword)) return entry;
    }
  }
  return null;
}

/**
 * Detect whether the message contains a navigation intent ("open / go to / show").
 * Used by the server-side orchestrator to decide whether to emit a uiAction.
 */
export function isNavigationIntent(text: string): boolean {
  const t = (text || "").toLowerCase();
  return /открой|перейди|покажи|открой страницу|навигац|переключись на вкладку|open|go to|navigate to|show me|take me to/i.test(t);
}

/**
 * Returns the list of page keys (for UI / autocomplete).
 */
export function listPageKeys(): string[] {
  return PAGE_REGISTRY.map((entry) => entry.key);
}
