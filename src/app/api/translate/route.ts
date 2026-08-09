import { ok, err, safe, parseJson } from "@/lib/api";
import { aiProviderRouter } from "@/services/ai-provider-router.service";

const MAX_TEXTS = 40;
const MAX_TEXT_LENGTH = 1_500;

function parseTranslations(raw: string, originals: string[]): Record<string, string> {
  try {
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    const payload = JSON.parse(cleaned) as { translations?: Record<string, unknown> };
    const translations = payload.translations ?? {};
    return Object.fromEntries(
      originals.map((text) => [text, typeof translations[text] === "string" ? translations[text] : text]),
    );
  } catch {
    return Object.fromEntries(originals.map((text) => [text, text]));
  }
}

/** Localizes uncommon client-rendered interface strings not covered by the shared dictionary. */
export const POST = safe(async (request: Request) => {
  const body = await parseJson<{ texts?: unknown }>(request);
  if (!Array.isArray(body.texts)) return err("Ожидается массив текстов", 400);

  const texts = [...new Set(body.texts)]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && value.length <= MAX_TEXT_LENGTH)
    .slice(0, MAX_TEXTS);

  if (!texts.length) return ok({ translations: {} });

  const raw = await aiProviderRouter.chat(
    "analysis",
    "Ты переводишь интерфейс приложения на русский. Верни только валидный JSON с объектом translations. " +
      "Каждый исходный текст должен быть ключом, а его русский перевод — значением. " +
      "Не переводи названия продуктов, репозиториев, URL, пути файлов, команды, код, ключи JSON, версии и лицензии.",
    `Переведи на русский следующие тексты интерфейса:\n${JSON.stringify(texts)}`,
  );

  return ok({ translations: parseTranslations(raw, texts) });
});
