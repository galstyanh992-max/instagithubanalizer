import type { AgentPurpose } from "./types";

const RULES: { purpose: AgentPurpose; re: RegExp }[] = [
  { purpose: "github_watcher", re: /github|репозитор|repo\b.*(следи|watch|находк)/i },
  { purpose: "finance_news_monitor", re: /финанс|finance|биржа|акци[ий]|новост.*(финанс|рынк)/i },
  { purpose: "competitor_monitor", re: /конкурент|competitor/i },
  { purpose: "developer_helper", re: /помогай (писать код|разраб)|developer helper|код.*помощник/i },
  { purpose: "database_reviewer", re: /провер(яй|ь).*(баз[уы] данных|бд\b)|database review/i },
  { purpose: "api_connector", re: /подключай api|api connector|подключение api/i },
  { purpose: "content_creator", re: /делай контент|content creator|генерируй (посты|видео|изображени)/i },
  { purpose: "researcher", re: /глубок(ое|ий).*исследован|deep research|researcher/i },
  { purpose: "personal_assistant", re: /личн(ый|ая) помощник|personal assistant/i },
];

export function classifyAgentPurpose(text: string): AgentPurpose {
  const t = (text || "").trim();
  if (!t) return "custom";
  for (const r of RULES) if (r.re.test(t)) return r.purpose;
  return "custom";
}
