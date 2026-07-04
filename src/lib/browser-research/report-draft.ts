import type { BrowserResearchInput, ResearchReportDraft } from "./types";
import { classifyResearchMode } from "./mode-classifier";

export function buildResearchReportDraft(input: BrowserResearchInput): ResearchReportDraft {
  const mode = input.mode ?? classifyResearchMode(input.text);
  const base: ResearchReportDraft = {
    title: `Research draft: ${input.text.slice(0, 60)}`,
    mode,
    summary: "Черновик отчёта (план). Реальный сбор данных не выполнялся.",
    plannedSources: input.allowedSites?.length ? input.allowedSites : ["публичные источники (уточнить)"],
    questionsToAnswer: [],
    evidenceRequirements: [],
    risks: [],
    nextActions: ["Подтвердить источники перед сбором данных."],
  };

  if (mode === "deep_research") {
    base.evidenceRequirements = [
      "Разделять факты, предположения и неизвестные.",
      "Указывать источник для каждого факта (цитирование позже).",
      "Проверять актуальность данных перед финальным ответом.",
    ];
    base.questionsToAnswer = ["Какой конкретный вопрос нужно закрыть?", "Какие источники считаются авторитетными?"];
  }

  if (mode === "movie_recommendation") {
    base.questionsToAnswer = ["Настроение/жанр?", "Предпочитаемый язык/год?", "Какие сайты использовать?"];
    base.risks = ["Не использовать пиратские источники/автоматизацию скачивания."];
  }

  if (mode === "competitor_public_analysis") {
    base.evidenceRequirements = ["Только публичные данные (сайт, соцсети, пресс-релизы)."];
  }

  return base;
}
