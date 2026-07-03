// AI Jarwisyan — Category Classifier
// Автоматически классифицирует репозиторий по категориям

export interface CategoryResult {
  primaryCategory: string;
  secondaryCategories: string[];
  confidence: number;
  reason: string;
}

const CATEGORIES: Record<string, string[]> = {
  "RAG": ["rag", "retrieval", "embedding", "vector", "knowledge base", "llm"],
  "OCR": ["ocr", "tesseract", "text recognition", "image to text"],
  "PDF Parsing": ["pdf", "document parsing", "table extraction", "docling", "megaparse"],
  "AI Agents": ["agent", "orchestrat", "tool use", "function calling", "openhands", "mem0"],
  "Voice": ["tts", "stt", "speech", "voice", "qwen3-tts", "whisper"],
  "UI/UX": ["ui", "component", "react", "vue", "frontend", "design system"],
  "DevOps": ["docker", "kubernetes", "ci/cd", "deploy", "infrastructure", "ubicloud"],
  "Database": ["database", "sql", "postgres", "sqlite", "prisma", "trailbase"],
  "Automation": ["automation", "workflow", "scraping", "crawl", "firecrawl", "crawl4ai"],
  "Legal Tech": ["legal", "document management", "compliance", "contract"],
  "Finance": ["finance", "accounting", "billing", "akaunting", "erp"],
  "Trading": ["trading", "broker", "stock", "quant", "backtest"],
  "Local AI": ["local ai", "ollama", "llama.cpp", "gguf", "onnx"],
  "Video AI": ["video", "ffmpeg", "kdenlive", "transcode", "video editing"],
  "SaaS": ["saas", "business", "crm", "dashboard", "admin panel"],
  "Security": ["security", "encryption", "backup", "duplicati", "auth"],
};

export const categoryClassifier = {
  classify(repo: { description: string; topics: string[]; readmeText: string; primaryLanguage: string; name: string }): CategoryResult {
    const text = `${repo.description} ${repo.topics.join(" ")} ${repo.readmeText.slice(0, 3000)} ${repo.name}`.toLowerCase();
    const scores: Array<{ category: string; score: number }> = [];

    for (const [category, keywords] of Object.entries(CATEGORIES)) {
      let score = 0;
      for (const kw of keywords) {
        if (text.includes(kw)) score += 1;
      }
      if (score > 0) scores.push({ category, score });
    }

    scores.sort((a, b) => b.score - a.score);

    if (scores.length === 0) {
      return {
        primaryCategory: "Other",
        secondaryCategories: [],
        confidence: 0,
        reason: "Не удалось определить категорию по ключевым словам",
      };
    }

    const primary = scores[0];
    const secondary = scores.slice(1, 3).map((s) => s.category);
    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
    const confidence = Math.min(100, Math.round((primary.score / Math.max(totalScore, 1)) * 100));

    return {
      primaryCategory: primary.category,
      secondaryCategories: secondary,
      confidence,
      reason: `Совпадение по ключевым словам: ${CATEGORIES[primary.category].filter((kw) => text.includes(kw)).join(", ")}`,
    };
  },
};
