"use client";

import { Bot, BrainCircuit, Code2, Image, Mic2, Music2, Search, Subtitles, Video, Volume2, WandSparkles } from "lucide-react";
import { SciFiPanel } from "@/components/ui/sci-fi-panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type FunctionRouteKey =
  | "chat" | "analysis" | "code" | "research" | "browser" | "memory" | "legal"
  | "image" | "video" | "music" | "transcription" | "ocr" | "tts" | "stt";

export type ProviderRoutes = Partial<Record<FunctionRouteKey, string>>;

const FUNCTIONS: Array<{ key: FunctionRouteKey; label: string; hint: string; icon: typeof Bot }> = [
  { key: "chat", label: "Чат", hint: "Обычные ответы и команды", icon: Bot },
  { key: "analysis", label: "Анализ", hint: "Репозитории, планы и сложные задачи", icon: BrainCircuit },
  { key: "code", label: "Код", hint: "Разработка, рефакторинг и патчи", icon: Code2 },
  { key: "research", label: "Исследование", hint: "Поиск и проверка фактов", icon: Search },
  { key: "browser", label: "Веб-агент", hint: "Руководство браузером", icon: WandSparkles },
  { key: "memory", label: "Память", hint: "Контекст и Graphify", icon: BrainCircuit },
  { key: "legal", label: "Право", hint: "Юридические документы и RAG", icon: Search },
  { key: "image", label: "Изображения", hint: "Генерация изображений", icon: Image },
  { key: "video", label: "Видео", hint: "Генерация видео", icon: Video },
  { key: "music", label: "Музыка", hint: "Генерация музыки", icon: Music2 },
  { key: "transcription", label: "Транскрипция", hint: "Аудио в текст", icon: Subtitles },
  { key: "ocr", label: "OCR", hint: "Текст с изображений и PDF", icon: Search },
  { key: "tts", label: "Озвучивание", hint: "Ответ Джарвиса голосом", icon: Volume2 },
  { key: "stt", label: "Голосовой ввод", hint: "Речь в текст", icon: Mic2 },
];

const PROVIDERS = [
  ["auto", "Автоматически (рекомендуется)"],
  ["ollama-cloud", "Ollama Cloud"],
  ["glm", "GLM"],
  ["openrouter", "OpenRouter"],
  ["opencode-go", "OpenCode Go"],
  ["openai", "OpenAI API"],
  ["openai-thinking", "OpenAI Thinking API"],
  ["gemini", "Google Gemini"],
  ["groq", "Groq"],
  ["cerebras", "Cerebras"],
  ["kimi", "Kimi Code"],
  ["legal-ai", "Legal Armenia AI"],
] as const;

function parseRoutes(value: string | undefined): ProviderRoutes {
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" ? parsed as ProviderRoutes : {};
  } catch {
    return {};
  }
}

export function ProviderRoutingPanel({ value, onChange }: { value?: string; onChange: (value: string) => void }) {
  const routes = parseRoutes(value);
  const update = (key: FunctionRouteKey, provider: string) =>
    onChange(JSON.stringify({ ...routes, [key]: provider }));

  return (
    <SciFiPanel accent="cyan" className="space-y-4 p-5">
      <div>
        <h2 className="font-mono text-sm uppercase text-cyan-300">Маршрутизация ИИ по функциям</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Выберите поставщика для каждой функции. Сохранённый выбор применяет Джарвис; если выбранный ключ не настроен, он безопасно перейдёт к доступному поставщику.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {FUNCTIONS.map(({ key, label, hint, icon: Icon }) => (
          <label key={key} className="glass-panel-subtle flex min-w-0 items-center gap-2 rounded-lg p-3">
            <Icon className="h-4 w-4 shrink-0 text-cyan-300" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-zinc-200">{label}</span>
              <span className="block truncate text-[10px] text-zinc-500">{hint}</span>
            </span>
            <Select value={routes[key] || "auto"} onValueChange={(next) => update(key, next)}>
              <SelectTrigger className="h-8 w-[132px] shrink-0 text-[10px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROVIDERS.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
        ))}
      </div>
      <p className="rounded border border-violet-400/20 bg-black/30 p-3 text-[11px] text-zinc-400">
        ChatGPT Plus/Pro подключается ниже через «Подписка ChatGPT». Это вход в ваш локальный Codex, без передачи пароля Джарвису; там можно выбрать доступную модель для задач с кодом.
      </p>
    </SciFiPanel>
  );
}
