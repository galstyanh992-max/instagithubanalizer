// AI Jarwisyan — Chat service
// Обрабатывает сообщения пользователя, определяет интент, возвращает AI response.
// Использует aiService для real AI (GLM) или mock fallback.
// Интегрирован с Memory Hub — достаёт релевантную память перед ответом.

import { aiService } from "./ai.service";
import { db } from "@/lib/db";
import { memoryService } from "./memory/memory.service";
import { memorySafetyService } from "./memory/memory-safety.service";

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
    default:
      return `Я AI Jarwisyan — анализирую GitHub-репозитории, проверяю совместимость с вашим ПК, готовлю integration plans для ваших проектов. ${repoRef ? `Вижу репозиторий ${repoRef} — могу проанализировать.` : ""} Без GLM_API_KEY работаю в mock-режиме. Настройте AI provider в /settings для real AI.`;
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

    // Try real AI if configured
    const isMock = aiService.isMock();
    let reply: string;

    // Memory retrieval — достаём релевантную память (без secrets)
    let memoryContext = "";
    try {
      const memRecords = await memoryService.retrieveRelevant({
        query: message,
        projectId: projectId,
        limit: 5,
      });
      if (memRecords.length > 0) {
        memoryContext = memorySafetyService.sanitizeForAI(
          memRecords.map((r) => ({ sensitive: r.sensitive, content: r.content, title: r.title }))
        );
        if (memoryContext) {
          memoryContext = `\n\nРелевантная память:\n${memoryContext}`;
        }
      }
    } catch {
      // memory недоступна — продолжаем без неё
    }

    if (isMock) {
      reply = await generateMockReply(message, intent, repoRef);
      if (memoryContext) {
        reply += "\n\nℹ️ Использована память из Memory Hub при ответе.";
      }
    } else {
      try {
        // Use GLM for chat — build a simple system prompt
        const systemPrompt = `Ты — AI Jarwisyan. ВСЕГДА отвечай пользователю на русском языке, если пользователь явно не попросил другой язык. Все объяснения, рекомендации, планы запуска, планы интеграции, анализ рисков, fallback-сообщения и голосовые ответы должны быть на русском языке. Технические имена файлов, команды, API endpoints, JSON keys и названия библиотек оставляй без перевода. ${contextInfo}${memoryContext}\nIntent: ${intent}. Ответь кратко на русском. Если нужно что-то сделать — предложи action.`;
        const ZAISDK = (await import("z-ai-web-dev-sdk")).default;
        const zai = await ZAISDK.create();
        const completion = await zai.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
          temperature: 0.4,
          max_tokens: 1024,
        });
        reply = completion.choices[0]?.message?.content ?? await generateMockReply(message, intent, repoRef);
      } catch {
        reply = await generateMockReply(message, intent, repoRef);
      }
    }

    return {
      reply,
      intent,
      actions,
      fallbackUsed: isMock,
    };
  },
};
