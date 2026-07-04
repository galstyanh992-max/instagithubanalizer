import type { AgentPurpose } from "./types";

export interface PurposeTemplate {
  goal: string;
  suggestedTools: string[];
  suggestedApis: string[];
  permissions: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  requiresApproval: boolean;
  memoryScope: "none" | "project" | "workspace" | "user";
}

export const PURPOSE_TEMPLATES: Record<AgentPurpose, PurposeTemplate> = {
  github_watcher: {
    goal: "Отслеживать новые GitHub-находки и изменения в репозиториях.",
    suggestedTools: ["repo-analyzer", "watchlist"], suggestedApis: ["github"],
    permissions: ["repo.read"], riskLevel: "MEDIUM", requiresApproval: true, memoryScope: "workspace",
  },
  finance_news_monitor: {
    goal: "Мониторить финансовые новости (только чтение, без торгов/платежей).",
    suggestedTools: ["api-hub", "daily-report"], suggestedApis: ["finance_news"],
    permissions: ["api.read"], riskLevel: "MEDIUM", requiresApproval: true, memoryScope: "workspace",
  },
  competitor_monitor: {
    goal: "Мониторить публичные данные конкурентов (без приватного скрапинга).",
    suggestedTools: ["browser-operator(read-only)"], suggestedApis: ["search"],
    permissions: ["browser.read_public"], riskLevel: "MEDIUM", requiresApproval: true, memoryScope: "project",
  },
  developer_helper: {
    goal: "Помогать с планированием разработки через Developer Operator (без выполнения).",
    suggestedTools: ["developer-operator", "terminal-guard(plan-only)"], suggestedApis: [],
    permissions: ["dev.plan"], riskLevel: "HIGH", requiresApproval: true, memoryScope: "project",
  },
  database_reviewer: {
    goal: "Проверять состояние базы данных (read-only отчёты).",
    suggestedTools: ["prisma-validate", "db-health"], suggestedApis: ["database"],
    permissions: ["db.read"], riskLevel: "HIGH", requiresApproval: true, memoryScope: "workspace",
  },
  api_connector: {
    goal: "Помогать регистрировать и планировать подключение API через API Hub.",
    suggestedTools: ["api-hub"], suggestedApis: ["custom"],
    permissions: ["api.register"], riskLevel: "MEDIUM", requiresApproval: true, memoryScope: "workspace",
  },
  content_creator: {
    goal: "Готовить черновики контента; публикация только с подтверждением.",
    suggestedTools: ["content-draft"], suggestedApis: ["content_generation"],
    permissions: ["content.draft"], riskLevel: "HIGH", requiresApproval: true, memoryScope: "project",
  },
  researcher: {
    goal: "Проводить исследования по теме (публичные источники, без автозаписи выводов).",
    suggestedTools: ["web-search(plan)"], suggestedApis: ["search"],
    permissions: ["research.read"], riskLevel: "MEDIUM", requiresApproval: true, memoryScope: "project",
  },
  personal_assistant: {
    goal: "Общий персональный ассистент для повседневных задач.",
    suggestedTools: ["command-router"], suggestedApis: [],
    permissions: ["assistant.basic"], riskLevel: "MEDIUM", requiresApproval: true, memoryScope: "user",
  },
  custom: {
    goal: "Задача не распознана точно — требуется уточнение владельца.",
    suggestedTools: [], suggestedApis: [],
    permissions: [], riskLevel: "HIGH", requiresApproval: true, memoryScope: "none",
  },
};
