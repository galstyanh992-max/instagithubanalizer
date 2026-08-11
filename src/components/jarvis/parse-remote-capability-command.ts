"use client";

// Detects the 6 remote-capability voice/text phrases and maps them to a
// governed CAPABILITY_OPERATIONS entry (src/lib/jarvis/capabilities/
// envelope.ts). Deliberately separate from parse-jarvis-command.ts: that
// module handles purely local, synchronous UI actions (open a panel,
// navigate a tab) with zero network calls, while a capability command
// requires creating a real AgentTask on a specific device and polling it to
// completion — a fundamentally different, async flow (see use-jarvis.ts).
// This is NOT a second NLP router for Vercel — it is the same phrase-match
// style already used by parse-jarvis-command.ts, just producing a different
// kind of result (a capability command instead of a UiAction).
import type { CapabilityId } from "@/lib/jarvis/capabilities/envelope";

export interface RemoteCapabilityCommand {
  capability: CapabilityId;
  operation: string;
  arguments?: Record<string, unknown>;
  confirmation: string;
}

const PATTERNS: { re: RegExp; command: Omit<RemoteCapabilityCommand, "arguments"> }[] = [
  {
    re: /скажи состояние систем|состояние систем[ыа]|как дела (с )?систем/i,
    command: { capability: "system", operation: "status", confirmation: "Проверяю состояние системы на HOME-PC…" },
  },
  {
    re: /как[иа]е модели ollama установлен|список моделей ollama|модели ollama/i,
    command: { capability: "ollama", operation: "models", confirmation: "Запрашиваю список моделей Ollama на HOME-PC…" },
  },
  {
    re: /покажи файлы корня проекта|файлы корня проекта|листинг проекта/i,
    command: { capability: "filesystem", operation: "list", confirmation: "Получаю листинг корня проекта на HOME-PC…" },
  },
  {
    re: /покажи активные mcp сервер|активные mcp|список mcp сервер/i,
    command: { capability: "mcp", operation: "list", confirmation: "Проверяю активные MCP-серверы на HOME-PC…" },
  },
  {
    re: /открой браузер и безопасн(ую|ой) тестов(ую|ой) страниц|открой браузер и тестовую страницу/i,
    command: { capability: "browser", operation: "open", confirmation: "Открываю браузер и безопасную тестовую страницу на HOME-PC…" },
  },
  {
    re: /запусти (safe )?smoke[- ]?тест n8n|проверь n8n smoke|smoke workflow n8n/i,
    command: { capability: "n8n", operation: "smoke", confirmation: "Запускаю проверенный smoke-workflow n8n на HOME-PC…" },
  },
  {
    re: /состояние n8n|n8n запущен/i,
    command: { capability: "n8n", operation: "health", confirmation: "Проверяю состояние n8n на HOME-PC…" },
  },
];

export function parseRemoteCapabilityCommand(text: string): RemoteCapabilityCommand | null {
  const normalized = (text || "").toLowerCase();
  for (const { re, command } of PATTERNS) {
    if (re.test(normalized)) return { ...command };
  }
  return null;
}
