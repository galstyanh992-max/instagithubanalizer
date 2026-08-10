// AI Jarwisyan — Chat service
// Обрабатывает сообщения пользователя, определяет интент, возвращает AI response.
// Использует aiService для real AI (GLM) или mock fallback.
// Интегрирован с Memory Hub — достаёт релевантную память перед ответом.

import { aiService } from "./ai.service";
import { aiProviderRouter } from "./ai-provider-router.service";
import { db } from "@/lib/db";

export type ChatIntent =
  | "general"
  | "analyze_repo"
  | "connect_project"
  | "integration_plan"
  | "local_compatibility"
  | "find_alternatives"
  | "voice_command";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatRequest {
  message: string;
  projectId?: string;
  repoId?: string;
  history?: ChatMessage[];
}

export interface ChatAction {
  type: "navigate" | "api_call" | "show_info";
  label: string;
  target?: string;
  payload?: Record<string, unknown>;
}

export interface ChatResponse {
  reply: string;
  intent: ChatIntent;
  actions: ChatAction[];
  fallbackUsed: boolean;
}

function detectIntent(message: string): ChatIntent {
  const m = message.toLowerCase();
  if (/анализ|analyze|проверь|посмотри.*репо|github\.com|owner\/repo/.test(m)) {
    return "analyze_repo";
  }
  if (/подключи|connect.*project|мой проект|добавь проект/.test(m)) {
    return "connect_project";
  }
  if (/интеграц|integration.*plan|внедрить|перенести.*в проект/.test(m)) {
    return "integration_plan";
  }
  if (/локальн|compatibility|мой.*пк|запустится|совместим/.test(m)) {
    return "local_compatibility";
  }
  if (/альтернатив|alternatives|замена|похожие/.test(m)) {
    return "find_alternatives";
  }
  return "general";
}

function extractRepoRef(message: string): string | null {
  const m = message.match(/github\.com\/([A-Za-z0-9][\w.-]{0,38}[A-Za-z0-9])\/([A-Za-z0-9_.-]{1,100})/i);
  if (m) return `${m[1]}/${m[2].replace(/\.git$/i, "")}`;
  const m2 = message.match(/\b([A-Za-z0-9][\w.-]{0,38}[A-Za-z0-9])\/([A-Za-z0-9_.-]{1,100})\b/);
  if (m2 && m2[1].toLowerCase() !== m2[2].toLowerCase()) {
    return `${m2[1]}/${m2[2]}`;
  }
  return null;
}

async function generateMockReply(message: string, intent: ChatIntent, repoRef: string | null): Promise<string> {
  switch (intent) {
    case "analyze_repo":
      return repoRef
        ? `Готов проанализировать ${repoRef}. Перейдите на /repos и нажмите "Анализ" — я извлеку README, лицензию, topics, проверю Docker/Python/Node, посчитаю scores и дам вердикт USE_NOW/TEST/SAVE/SKIP. Без GLM_API_KEY работает mock-режим с эвристиками.`
        : "Укажите репозиторий в формате owner/repo или github.com/owner/repo — я проанализирую его.";
    case "connect_project":
      return "Чтобы подключить ваш проект, перейдите на /projects и нажмите «Подключить проект». Укажите имя, GitHub URL, tech stack и цели. После этого я смогу готовить integration plans для ваших проектов.";
    case "integration_plan":
      return "Выберите репозиторий на /repos/[id], откройте вкладку «Интеграция» и выберите подключённый проект. Я подготовлю: полезные части, файлы для изучения, reusable components, API patterns, agent workflow ideas, шаги внедрения и estimated effort.";
    case "local_compatibility":
      return "Откройте репозиторий → вкладка «Мой ПК». Я проверю совместимость с вашим профилем (Windows 11, Xeon E5-2699 v3, 64 GB RAM, AMD Radeon RX 580 8 GB, без CUDA) и предложу local/docker/CPU-only/Ollama Cloud варианты.";
    case "find_alternatives":
      return "На странице репозитория → вкладка «Альтернативы». Я поищу на GitHub CPU-only/no-CUDA/lightweight/Ollama-compatible альтернативы. Без GITHUB_TOKEN верну suggested search queries.";
    default: {
      const status = aiProviderRouter.getStatus();
      let providerText = "AI provider не настроен. Работаю в mock-режиме. Добавьте ключ Ollama Cloud, GLM 5.2, OpenRouter, Gemini или другой provider в Settings.";
      
      const route = await aiProviderRouter.getProviderForIntent(intent);
      if (!route.isMock) {
        const activeProv = status.providers.find(p => p.name === route.providerName);
        if (activeProv?.role === "primary-fast") {
          providerText = "AI provider: Ollama Cloud. Быстрый режим активен.";
        } else if (activeProv?.role === "heavy-reasoning") {
          providerText = "AI provider: GLM 5.2. Тяжёлый аналитический режим активен.";
        } else {
          providerText = "AI provider: fallback. Основной provider недоступен, использую резервный.";
        }
      }

      return `Я AI Jarwisyan. Сейчас проверяю доступные AI providers. Если Ollama Cloud, GLM 5.2 или другой provider настроен, я использую реальный AI. Mock-режим включается только если ни один реальный provider не доступен.\n\n${providerText}\n\n${repoRef ? `Вижу репозиторий ${repoRef} — могу проанализировать.` : ""}`;
    }
  }
}

export const chatService = {
  async handle(request: ChatRequest): Promise<ChatResponse> {
    const { message, projectId, repoId } = request;
    const intent = detectIntent(message);
    const repoRef = extractRepoRef(message);

    // Load context
    let contextInfo = "";
    if (projectId) {
      const project = await db.connectedProject.findUnique({ where: { id: projectId } });
      if (project) {
        contextInfo += `\nConnected project: ${project.name} (${project.techStack}). Goals: ${project.goals}.`;
      }
    }
    if (repoId) {
      const repo = await db.repository.findUnique({ where: { id: repoId } });
      if (repo) {
        contextInfo += `\nRepository in context: ${repo.fullName} (${repo.verdict}, score ${repo.finalPriorityScore}).`;
      }
    }
    
    // Inject user tasks
    const pendingTasks = await db.userTask.findMany({ where: { completed: false } });
    if (pendingTasks.length > 0) {
      contextInfo += `\nUncompleted tasks (Текущие дела): ${pendingTasks.map((t) => t.title).join("; ")}. Учитывай их при ответах и предлагай помощь с ними, если это уместно.`;
    }

    // Determine actions
    const actions: ChatAction[] = [];
    if (intent === "analyze_repo" && repoRef) {
      actions.push({ type: "api_call", label: `Анализировать ${repoRef}`, target: "/api/repos/analyze", payload: { fullName: repoRef } });
    }
    if (intent === "connect_project") {
      actions.push({ type: "navigate", label: "Открыть /projects", target: "/projects" });
    }
    if (intent === "integration_plan") {
      actions.push({ type: "navigate", label: "Открыть репозитории", target: "/repos" });
    }
    if (intent === "local_compatibility") {
      actions.push({ type: "navigate", label: "Открыть /repos", target: "/repos" });
    }
    if (intent === "find_alternatives") {
      actions.push({ type: "navigate", label: "Открыть /repos", target: "/repos" });
    }

    // Every response is produced by a configured provider; placeholder replies are not allowed.
    const isMock = false;
    let reply: string;

    // If user asks about codebase/project structure, query Graphify graph
    let graphContext = "";
    const graphKeywords = /кодовая база|codebase|проект|project|файл|file|класс|class|функция|function|модуль|module|связь|connection|graph|граф|зависимость|dependency/i;
    if (graphKeywords.test(message)) {
      try {
        // Graphify spawns a local CLI (child_process) — local-runtime only.
        // Dynamic import keeps it out of the Vercel web-control-plane bundle.
        const { graphifyService } = await import("@/local-runtime/services/graphify.service");
        const built = await graphifyService.isGraphBuilt();
        if (!built) {
          await graphifyService.analyzeProject();
        }
        const g = await graphifyService.query(message);
        graphContext = `\n\nGraphify memory result:\n${g.stdout}`;
      } catch (e) {
        console.error("[chat.service] Graphify query failed:", e);
      }
    }

    try {
        const systemPrompt = `Ты — AI Jarwisyan. ВСЕГДА отвечай пользователю на русском языке, если пользователь явно не попросил другой язык. Все объяснения, рекомендации, планы запуска, планы интеграции, анализ рисков, fallback-сообщения и голосовые ответы должны быть на русском языке. Технические имена файлов, команды, API endpoints, JSON keys и названия библиотек оставляй без перевода.

Ты управляешь внешним видом 3D-аватара-девушки. В конце каждого ответа добавляй ОДИН тег эмоции, который соответствует твоему тону: [emotion: smiling] для улыбки/поддержки, [emotion: laughing] для шутки/радости, [emotion: thinking] для размышлений, [emotion: sad] для сожаления/ошибки, [emotion: surprised] для удивления, [emotion: idle] для нейтрального ответа. Не объясняй этот тег и не выделяй его отдельно.

У JARVIS есть веб-агент CamoFox для внешних сайтов. Не говори, что у тебя нет доступа к внешним сайтам: по команде пользователя браузерный агент открывает сайты, ищет, читает страницы, нажимает элементы и вводит текст. Для запуска пользователь может сказать «открой сайт …», «зайди на …», «перейди на https://…», «веб найди …», «веб клик eN» или «веб введи eN …». Перед действиями, которые публикуют, отправляют, оплачивают или меняют данные на внешнем сайте, запроси явное подтверждение.

Если пользователь запускает режимы из верхней панели:
- "Промпт-Инжиниринг" — превращай простой запрос в структурированный production-ready промпт-пак с ролями, ограничениями и циклом реализация-проверка-исправление.
- "Планирование" — задавай уточняющие вопросы и создавай идеальный план проекта до начала кода.
- "Реализация" — создавай поэтапный Roadmap с тестами на каждом шаге и выполняй этапы последовательно.
- "GitHub Анализ" — анализируй указанный репозиторий, его интеграции, риски и возможности для внедрения.

${contextInfo}${graphContext}\nIntent: ${intent}. Ответь кратко на русском. Если нужно что-то сделать — предложи action.`;
        reply = await aiProviderRouter.chat(intent, systemPrompt, message);
    } catch (err) {
      console.error("[chat.service] AI router failed:", err);
      throw new Error("Подключённый AI-провайдер временно недоступен. Повторите запрос после восстановления соединения.");
    }

    return {
      reply,
      intent,
      actions,
      fallbackUsed: isMock,
    };
  },
};
