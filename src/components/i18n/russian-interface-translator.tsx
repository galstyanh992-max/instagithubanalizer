"use client";

import { useEffect } from "react";

const EXACT_TRANSLATIONS: Record<string, string> = {
  "Search": "Поиск",
  "Search repos...": "Поиск репозиториев...",
  "Search for a command to run...": "Поиск команды...",
  "Loading...": "Загрузка...",
  "Save": "Сохранить",
  "Cancel": "Отмена",
  "Close": "Закрыть",
  "Delete": "Удалить",
  "Edit": "Изменить",
  "Create": "Создать",
  "Add": "Добавить",
  "Remove": "Удалить",
  "Refresh": "Обновить",
  "Retry": "Повторить",
  "Back": "Назад",
  "Next": "Далее",
  "Previous": "Назад",
  "Open": "Открыть",
  "Copy": "Копировать",
  "Copied": "Скопировано",
  "Settings": "Настройки",
  "Projects": "Проекты",
  "Tasks": "Задачи",
  "Agents": "Агенты",
  "Repository": "Репозиторий",
  "Repositories": "Репозитории",
  "GitHub repositories": "Репозитории GitHub",
  "Import repository": "Импортировать репозиторий",
  "Analyze": "Анализировать",
  "Analysis": "Анализ",
  "Compare": "Сравнить",
  "Watch": "Отслеживать",
  "Unwatch": "Не отслеживать",
  "Watchlist": "Отслеживаемые",
  "No repositories found": "Репозитории не найдены",
  "No watched repos yet. Open any repo and click Watch.": "Пока нет отслеживаемых репозиториев. Откройте любой репозиторий и нажмите «Отслеживать».",
  "No categories yet. Analyze some repos first.": "Категорий пока нет. Сначала проанализируйте несколько репозиториев.",
  "Drop repos here": "Перетащите репозитории сюда",
  "Select repos and click BATTLE to compare": "Выберите репозитории и нажмите «СРАЖЕНИЕ» для сравнения",
  "Select 2–5 repos and let them fight": "Выберите от 2 до 5 репозиториев для сравнения",
  "Last checked": "Последняя проверка",
  "Repo": "Репозиторий",
  "Issues": "Проблемы",
  "Stars": "Звёзды",
  "Forks": "Форки",
  "Language": "Язык",
  "License": "Лицензия",
  "Description": "Описание",
  "Overview": "Обзор",
  "README": "README",
  "Error": "Ошибка",
  "Success": "Успешно",
  "Connected": "Подключено",
  "Disconnected": "Отключено",
  "Enabled": "Включено",
  "Disabled": "Отключено",
  "Unknown": "Неизвестно",
  "High": "Высокий",
  "Medium": "Средний",
  "Low": "Низкий",
  "Safe": "Безопасно",
  "Warning": "Предупреждение",
  "Risk": "Риск",
  // PC Profile settings tab (src/components/settings/pc-profile-settings.tsx) --
  // added because this static, fixed set of field labels was previously
  // uncovered by the dictionary and re-sent to /api/translate on every
  // dashboard load that opened Settings, per Section 10 of the Preview
  // product-gap repair pass.
  "My PC Profile": "Мой профиль ПК",
  "Profile name": "Имя профиля",
  "OS": "ОС",
  "System type": "Тип системы",
  "CPU": "ЦП",
  "CPU cores hint": "Подсказка по ядрам ЦП",
  "GPU": "Видеокарта",
  "RAM (GB)": "ОЗУ (ГБ)",
  "VRAM (GB)": "Видеопамять (ГБ)",
  "Storage total (GB)": "Хранилище всего (ГБ)",
  "Storage used (GB)": "Хранилище занято (ГБ)",
  "Storage free (GB)": "Хранилище свободно (ГБ)",
  "Python version": "Версия Python",
  "Node.js version": "Версия Node.js",
  "Docker": "Docker",
  "Git": "Git",
  "CUDA (locked)": "CUDA (заблокировано)",
  "ROCm": "ROCm",
  "Save PC Profile": "Сохранить профиль ПК",
  "Saving...": "Сохранение...",
};

function translate(value: string): string {
  const trimmed = value.trim();
  const direct = EXACT_TRANSLATIONS[trimmed];
  if (direct) return value.replace(trimmed, direct);

  const repos = trimmed.match(/^(\d+) repos?$/i);
  if (repos) return value.replace(trimmed, `${repos[1]} репозиториев`);
  const issues = trimmed.match(/^(\d+) issues?$/i);
  if (issues) return value.replace(trimmed, `${issues[1]} проблем`);
  const tracked = trimmed.match(/^(\d+) repos being tracked$/i);
  if (tracked) return value.replace(trimmed, `Отслеживается репозиториев: ${tracked[1]}`);
  if (trimmed.startsWith("Last checked:")) return value.replace("Last checked:", "Последняя проверка:");

  return value;
}

function needsRemoteTranslation(value: string): boolean {
  const trimmed = value.trim();
  return /[A-Za-z]{3,}/.test(trimmed) &&
    !/[А-Яа-яЁё]/.test(trimmed) &&
    !/^(https?:\/\/|[\w./@-]+$)/.test(trimmed);
}

function isTranslatableTextNode(node: Text): boolean {
  const parent = node.parentElement;
  if (!parent || !node.nodeValue?.trim()) return false;
  return !parent.closest("code, pre, script, style, textarea, [data-no-auto-translate]");
}

function translateTree(root: Node, unknownTexts: Set<string>): void {
  if (root instanceof Text) {
    if (isTranslatableTextNode(root) && root.nodeValue) {
      const localized = translate(root.nodeValue);
      if (localized !== root.nodeValue) root.nodeValue = localized;
      else if (needsRemoteTranslation(root.nodeValue)) unknownTexts.add(root.nodeValue.trim());
    }
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) textNodes.push(node as Text);

  for (const textNode of textNodes) {
    if (!isTranslatableTextNode(textNode) || !textNode.nodeValue) continue;
    const localized = translate(textNode.nodeValue);
    if (localized !== textNode.nodeValue) textNode.nodeValue = localized;
    else if (needsRemoteTranslation(textNode.nodeValue)) unknownTexts.add(textNode.nodeValue.trim());
  }

  if (!(root instanceof Element)) return;
  for (const element of [root, ...root.querySelectorAll("[placeholder], [title], [aria-label]")]) {
    for (const attribute of ["placeholder", "title", "aria-label"] as const) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      const localized = translate(value);
      if (localized !== value) element.setAttribute(attribute, localized);
      else if (needsRemoteTranslation(value)) unknownTexts.add(value.trim());
    }
  }
}

/** Applies the shared Russian vocabulary to all client-rendered interface nodes. */
export function RussianInterfaceTranslator() {
  useEffect(() => {
    const unknownTexts = new Set<string>();
    const cachedTranslations = new Map<string, string>();
    let translationTimer: ReturnType<typeof setTimeout> | undefined;

    const applyCachedTranslations = (root: Node) => {
      if (root instanceof Text && root.nodeValue) {
        const localized = cachedTranslations.get(root.nodeValue.trim());
        if (localized) root.nodeValue = root.nodeValue.replace(root.nodeValue.trim(), localized);
      }
      if (root instanceof Element) {
        for (const element of [root, ...root.querySelectorAll("[placeholder], [title], [aria-label]")]) {
          for (const attribute of ["placeholder", "title", "aria-label"] as const) {
            const value = element.getAttribute(attribute);
            const localized = value ? cachedTranslations.get(value.trim()) : undefined;
            if (localized && value) element.setAttribute(attribute, value.replace(value.trim(), localized));
          }
        }
      }
    };

    const requestTranslations = async () => {
      translationTimer = undefined;
      const texts = [...unknownTexts].filter((text) => !cachedTranslations.has(text));
      unknownTexts.clear();
      if (!texts.length) return;
      try {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ texts }),
        });
        if (!response.ok) return;
        const payload = await response.json() as { translations?: Record<string, string> };
        for (const [source, localized] of Object.entries(payload.translations ?? {})) {
          if (localized && localized !== source) cachedTranslations.set(source, localized);
        }
        applyCachedTranslations(document.body);
      } catch {
        // Local dictionary remains active when the translation provider is offline.
      }
    };

    const scheduleRemoteTranslation = () => {
      if (translationTimer || !unknownTexts.size) return;
      translationTimer = setTimeout(() => void requestTranslations(), 200);
    };

    // The initial pass walks the *entire* document.body with a TreeWalker --
    // synchronously, at mount, it competes with hydration and the Three.js
    // avatar/cockpit canvas init for the main thread. Deferred to idle time
    // (with a setTimeout fallback for Safari, which lacks
    // requestIdleCallback) as a small, targeted fix for the INP regression
    // documented in reports/JARVIS_VERCEL_PREVIEW_E2E.md (~3.2s blocked
    // interaction on <body>) rather than a broader rewrite. The
    // MutationObserver itself is cheap to register and stays synchronous so
    // no DOM mutations are missed while the initial pass is deferred.
    const runInitialPass = () => translateTree(document.body, unknownTexts);
    const idleHandle: number | ReturnType<typeof setTimeout> =
      typeof requestIdleCallback === "function"
        ? requestIdleCallback(runInitialPass, { timeout: 1000 })
        : setTimeout(runInitialPass, 0);
    scheduleRemoteTranslation();
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          applyCachedTranslations(node);
          translateTree(node, unknownTexts);
        }
        if (record.type === "characterData" && record.target.nodeValue) {
          const localized = translate(record.target.nodeValue);
          if (localized !== record.target.nodeValue) record.target.nodeValue = localized;
          else if (needsRemoteTranslation(record.target.nodeValue)) unknownTexts.add(record.target.nodeValue.trim());
        }
      }
      scheduleRemoteTranslation();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      if (translationTimer) clearTimeout(translationTimer);
      if (typeof requestIdleCallback === "function") cancelIdleCallback(idleHandle as number);
      else clearTimeout(idleHandle as ReturnType<typeof setTimeout>);
    };
  }, []);

  return null;
}
