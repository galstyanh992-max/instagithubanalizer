// Тесты для category-classifier.service.ts
import { describe, it, expect } from "vitest";
import { categoryClassifier } from "@/services/category-classifier.service";

describe("categoryClassifier", () => {
  it("классифицирует docling как PDF Parsing", () => {
    const result = categoryClassifier.classify({
      description: "Get your documents ready for generative AI",
      topics: ["pdf", "ocr", "document-parsing"],
      readmeText: "Docling simplifies document processing",
      primaryLanguage: "Python",
      name: "docling",
    });
    expect(result.primaryCategory).toBe("PDF Parsing");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("классифицирует Qwen3-TTS как Voice", () => {
    const result = categoryClassifier.classify({
      description: "A multilingual text-to-speech model",
      topics: ["tts", "voice", "speech"],
      readmeText: "Qwen3-TTS",
      primaryLanguage: "Python",
      name: "Qwen3-TTS",
    });
    expect(result.primaryCategory).toBe("Voice");
  });

  it("возвращает Other для нераспознанного репозитория", () => {
    const result = categoryClassifier.classify({
      description: "Some random project",
      topics: [],
      readmeText: "Hello world",
      primaryLanguage: "Go",
      name: "random",
    });
    expect(result.primaryCategory).toBe("Other");
  });

  it("возвращает secondary categories", () => {
    const result = categoryClassifier.classify({
      description: "RAG pipeline with OCR and PDF parsing",
      topics: ["rag", "ocr", "pdf"],
      readmeText: "",
      primaryLanguage: "Python",
      name: "rag-ocr",
    });
    expect(result.secondaryCategories.length).toBeGreaterThan(0);
  });
});
