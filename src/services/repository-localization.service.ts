import "server-only";

import { aiProviderRouter } from "@/services/ai-provider-router.service";
import type { RepoMetadata } from "@/lib/types";

const TRANSLATION_CHUNK_SIZE = 2_800;

type LocalizedRepositoryContent = Pick<RepoMetadata, "description" | "topics" | "readmeText">;

function needsRussianTranslation(value: string): boolean {
  return /[A-Za-z]{3,}/.test(value);
}

function splitIntoChunks(value: string): string[] {
  if (value.length <= TRANSLATION_CHUNK_SIZE) return [value];

  const chunks: string[] = [];
  let remaining = value;
  while (remaining.length > TRANSLATION_CHUNK_SIZE) {
    const boundary = Math.max(
      remaining.lastIndexOf("\n\n", TRANSLATION_CHUNK_SIZE),
      remaining.lastIndexOf("\n", TRANSLATION_CHUNK_SIZE),
      remaining.lastIndexOf(". ", TRANSLATION_CHUNK_SIZE),
    );
    const end = boundary > TRANSLATION_CHUNK_SIZE / 2 ? boundary + 1 : TRANSLATION_CHUNK_SIZE;
    chunks.push(remaining.slice(0, end));
    remaining = remaining.slice(end);
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

async function translateText(value: string, field: "description" | "topics" | "readme"): Promise<string> {
  if (!value.trim() || !needsRussianTranslation(value)) return value;

  const chunks = splitIntoChunks(value);
  const translated: string[] = [];

  for (const chunk of chunks) {
    const result = await aiProviderRouter.chat(
      "chat/general",
      "Ты профессиональный переводчик технической документации. Переводи на русский только человеческий текст. " +
        "Не изменяй URL, имена репозиториев, названия библиотек, пути файлов, команды терминала, ключи JSON, код, " +
        "блоки кода Markdown, версии и лицензии. Сохраняй Markdown-разметку, переносы строк и смысл. " +
        "Верни исключительно переведённый текст, без пояснений и кавычек.",
      `Поле репозитория GitHub: ${field}.\n\nТекст для перевода:\n${chunk}`,
    );
    translated.push(result.trim() || chunk);
  }

  return translated.join("");
}

/**
 * GitHub returns repository prose mostly in English. We localize it before the
 * repository and its analysis are persisted, so every screen receives Russian
 * data without requiring a separate translation request in the browser.
 */
export async function localizeRepositoryMetadata(meta: RepoMetadata): Promise<RepoMetadata> {
  try {
    const [description, topicText] = await Promise.all([
      translateText(meta.description, "description"),
      translateText(meta.topics.join("\n"), "topics"),
    ]);

    const localized: LocalizedRepositoryContent = {
      description,
      topics: topicText.split("\n").map((topic) => topic.trim()).filter(Boolean),
      // README remains source material for analysis. Translating a long README
      // in many model calls made imports appear frozen before analysis started.
      readmeText: meta.readmeText,
    };
    return { ...meta, ...localized };
  } catch (error) {
    // An unavailable provider must not prevent importing or analyzing a repo.
    // The next forced analysis retries localization.
    console.warn("[repository-localization] Translation unavailable; preserving original GitHub text.", error);
    return meta;
  }
}
