import type { CommandIntent } from "./types";

interface Rule {
  intent: CommandIntent;
  re: RegExp;
}

// Order matters: more specific / higher-risk intents first.
const RULES: Rule[] = [
  { intent: "local_agent_runtime", re: /запусти локального агента|подключи мой компьютер|через телефон.*(запусти|выполни)|local agent runtime|подключи desktop commander/i },
  { intent: "local_operator", re: /desktop commander|mcp\s*(tool|server)|покажи файлы проекта|прочитай файл|примени изменени|отредактируй файл|открой приложение|выполни команду на компьютере/i },
  { intent: "terminal_task", re: /(npm|pnpm|yarn|bun)\s+(run\s+)?(test|lint|build|typecheck)|запусти\s+(команду|npm|терминал)|terminal|exec\b|rm\s+-rf|git\s+push|prisma\s+migrate/i },
  { intent: "developer_task", re: /реализуй|напиши код|сгенерируй код|implement|по этим промптам|разработай|отрефактор|refactor|создай (модуль|компонент|api)|vercel|deploy|деплой|задеплой|github push|запушь|загрузи в github/i },
  { intent: "database_task", re: /база данных|базу|бд\b|database|prisma|sql\b|миграц|migrate|schema/i },
  { intent: "agent_task", re: /создай агент|создать агент|create agent|new agent|агент[а-я]*\s+(создай|добавь)/i },
  { intent: "api_task", re: /\bapi\b|подключи (финанс|новост|провайдер)|какие api|отчёт по .*api|connect api|провайдер/i },
  { intent: "settings_task", re: /настройк|settings|измени конфиг|поменяй ключ|api key|токен\b|token\b/i },
  { intent: "github_analysis", re: /github|репозитор|repo\b|проанализируй.*репо|analyze.*repo|звёзд|stars/i },
  { intent: "email_task", re: /email|письмо|почт[ауы]/i },
  { intent: "content_task", re: /создай изображение|сгенерируй (видео|картинку)|сделай голос|напиши пост|придумай caption|контент[- ]план|кампани[яю] для соцсет|опублику|запости/i },
  { intent: "browser_task", re: /найди (фильм|в интернете|онлайн)|открой сайт|browser|браузер|поищи в сети|google\b|глубок\w*.*исследован|deep research|анализируй конкурент|проверь сайт/i },
  { intent: "memory_task", re: /запомни|запиши это|сохрани в память|remember|memory|заметк/i },
  { intent: "ui_control", re: /закрой чат|открой чат|сверни чат|покажи чат|закрой терминал|открой терминал|открой файлы|закрой файлы|вкладка\s+(проекты|задачи|агенты|память|чаты|файлы|уведомления)|новый чат|очисти чат|обнови страницу/i },
  { intent: "open_page", re: /открой|перейди|покажи страницу|open\s+(page|dashboard|settings)|dashboard|навигац/i },
  { intent: "conversation", re: /поговор|расскажи|привет|как дела|объясни|что такое|chat|поболта/i },
];

export function classifyIntent(text: string): CommandIntent {
  const t = (text || "").trim();
  if (!t) return "unknown";
  // GitHub repo URLs take priority so org/repo names (e.g. github.com/vercel/ai)
  // don't get misclassified by keyword rules matching substrings like "vercel".
  if (/github\.com\/[A-Za-z0-9_-]+\/[A-Za-z0-9._-]+/i.test(t)) return "github_analysis";
  for (const r of RULES) {
    if (r.re.test(t)) return r.intent;
  }
  return "unknown";
}
