// AI Jarwisyan — Voice command router (server-side) — русский язык

import { db } from "@/lib/db";
import type { VoiceCommandResult } from "@/lib/types";
import { resolvePage, isNavigationIntent } from "@/lib/jarvis/page-registry";

export const voiceService = {
  async handleCommand(transcript: string): Promise<VoiceCommandResult> {
    const t = transcript.toLowerCase().trim();

    // Анализ скриншота
    if (/анализир|проверь|посмотри|скриншот|снимок/.test(t)) {
      return {
        action: "navigate",
        payload: { path: "/upload" },
        spokenResponse: "Открываю страницу загрузки. Перетащите скриншоты туда, и я их проанализирую.",
        handled: true,
      };
    }
    // Лучшие репо для Agent OS
    if (/(лучшие|топ|покажи).*(agent\s*os|агент)/.test(t) || /agent\s*os/.test(t)) {
      const repos = await db.repository.findMany({
        where: { verdict: { in: ["USE_NOW", "TEST"] } },
        orderBy: { agentOsScore: "desc" },
        take: 5,
      });
      const names = repos.map((r) => r.fullName).join(", ");
      return {
        action: "list",
        payload: { repos: repos.map((r) => ({ id: r.id, fullName: r.fullName, score: r.agentOsScore })) },
        spokenResponse: repos.length
          ? `Лучшие репозитории для Agent OS: ${names}.`
          : "Репозиториев пока нет. Сначала проанализируйте несколько.",
        handled: true,
      };
    }
    // Сравнение
    if (/сравни|сравнение|батл/.test(t)) {
      return {
        action: "navigate",
        payload: { path: "/compare" },
        spokenResponse: "Открываю страницу сравнения. Выберите от двух до пяти репозиториев для битвы.",
        handled: true,
      };
    }
    // Что запустится на моём ПК
    if (/запуст|мой.*пк|локальн|совместим/.test(t)) {
      const repos = await db.repository.findMany({
        where: { localRunPossible: true, gpuRequired: false },
        orderBy: { compatibilityScore: "desc" },
        take: 5,
      });
      const names = repos.map((r) => r.fullName).join(", ");
      return {
        action: "list",
        payload: { repos: repos.map((r) => ({ id: r.id, fullName: r.fullName })) },
        spokenResponse: repos.length
          ? `Репозитории, которые запустятся на вашем ПК: ${names}.`
          : "Нет данных о совместимости. Настройте характеристики ПК в Настройках.",
        handled: true,
      };
    }
    // Прочитать вердикт вслух
    if (/прочитай|озвучь|вслух|вердикт/.test(t)) {
      return {
        action: "speak-last",
        payload: {},
        spokenResponse: "Прочитаю последний вердикт вслух.",
        handled: true,
      };
    }
    // Избранное / watchlist
    if (/избранн|отслежив|watchlist|наблюд/.test(t)) {
      const count = await db.repository.count({ where: { isWatchlisted: true } });
      return {
        action: "navigate",
        payload: { path: "/watchlist" },
        spokenResponse: `У вас ${count} репозиториев в избранном. Открываю страницу.`,
        handled: true,
      };
    }
    // План установки
    if (/план.*установк|установи|как запустить/.test(t)) {
      return {
        action: "navigate",
        payload: { path: "/repos" },
        spokenResponse: "Откройте любой репозиторий и нажмите «План установки».",
        handled: true,
      };
    }
    // Рискованные лицензии
    if (/риск.*лицен|лиценз.*риск|опасн.*лицен/.test(t)) {
      const repos = await db.repository.findMany({
        where: { commercialUseStatus: { in: ["HIGH_RISK", "WARNING"] } },
        take: 10,
      });
      return {
        action: "list",
        payload: { repos: repos.map((r) => ({ id: r.id, fullName: r.fullName, status: r.commercialUseStatus })) },
        spokenResponse: `Найдено ${repos.length} репозиториев с рискованными лицензиями.`,
        handled: true,
      };
    }
    // Подключить проект
    if (/подключи.*проект|мой проект/.test(t)) {
      return {
        action: "navigate",
        payload: { path: "/projects" },
        spokenResponse: "Открываю страницу проектов. Нажмите «Подключить проект».",
        handled: true,
      };
    }
    // План интеграции
    if (/план.*интеграц|интеграц.*план/.test(t)) {
      return {
        action: "navigate",
        payload: { path: "/repos" },
        spokenResponse: "Откройте репозиторий, вкладка «Интеграция», выберите проект и нажмите «Создать план интеграции».",
        handled: true,
      };
    }
    // Панель / дашборд
    if (/панель|дашборд|главную|на главную/.test(t)) {
      return {
        action: "navigate",
        payload: { path: "/dashboard" },
        spokenResponse: "Открываю панель.",
        handled: true,
      };
    }
    // Помощь
    if (/помощь|что ты умеешь|команды/.test(t)) {
      return {
        action: "help",
        payload: {},
        spokenResponse:
          "Я умею: анализировать скриншоты, сравнивать репозитории, показывать лучшие для Agent OS, " +
          "перечислять что запустится на вашем ПК, читать вердикты вслух, управлять избранным, " +
          "создавать планы установки, показывать рискованные лицензии, подключать проекты и создавать планы интеграции.",
        handled: true,
      };
    }

    // General navigation fallback: "открой агентов" / "перейди в настройки" /
    // "open dashboard" → resolve via the unified page registry. This catches
    // any section the targeted rules above did not cover.
    if (isNavigationIntent(t)) {
      const page = resolvePage(t);
      if (page) {
        return {
          action: "navigate",
          payload: { path: page.path },
          spokenResponse: `Открываю раздел «${page.label}».`,
          handled: true,
        };
      }
    }

    return {
      action: "unknown",
      payload: { transcript },
      spokenResponse:
        "Я не понял команду. Попробуйте: «Проанализируй репозиторий», «Покажи лучшие для Agent OS», " +
        "«Сравни docling и MegaParse», «Что запустится на моём ПК?», «Покажи рискованные лицензии», " +
        "или «Открой агентов / настройки / память».",
      handled: false,
    };
  },
};
