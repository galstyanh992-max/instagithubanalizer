// AI Jarwisyan — Memory Safety Service
// Проверяет память перед отправкой в AI — нет ли секретов

const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/i,           // OpenAI
  /sk-or-v1-[a-zA-Z0-9]{20,}/i,     // OpenRouter
  /ghp_[a-zA-Z0-9]{36}/i,            // GitHub PAT
  /github_pat_[a-zA-Z0-9_]{80,}/i,   // GitHub fine-grained
  /AIza[a-zA-Z0-9_-]{35}/i,          // Google/Gemini
  /gsk_[a-zA-Z0-9]{40,}/i,           // Groq
  /csk-[a-zA-Z0-9]{30,}/i,           // Cerebras
  /vcp_[a-zA-Z0-9]{40,}/i,           // Vercel
  /service_role/i,                    // Supabase service role
  /private_key/i,                     // Private keys
  /-----BEGIN[\s\S]*PRIVATE KEY-----/i,   // PEM keys
  /DATABASE_URL.*postgres/i,          // DB URLs
  /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/i, // JWT
];

const ENV_PATTERNS = [
  /\.env\b/i,
  /process\.env\./i,
  /OPENAI_API_KEY/i,
  /GEMINI_API_KEY/i,
  /OPENROUTER_API_KEY/i,
  /GROQ_API_KEY/i,
  /CEREBRAS_API_KEY/i,
  /OLLAMA_CLOUD_API_KEY/i,
  /SUPABASE_SERVICE_ROLE/i,
  /VERCEL_TOKEN/i,
  /JWT_SECRET/i,
];

export interface SafetyCheckResult {
  safe: boolean;
  reasons: string[];
  sanitizedContent?: string;
}

export const memorySafetyService = {
  checkMemory(content: string): SafetyCheckResult {
    const reasons: string[] = [];

    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(content)) {
        reasons.push("Обнаружен секретный токен или ключ");
        break;
      }
    }

    for (const pattern of ENV_PATTERNS) {
      if (pattern.test(content)) {
        reasons.push("Обнаружена ссылка на переменную окружения или секрет");
        break;
      }
    }

    return {
      safe: reasons.length === 0,
      reasons,
    };
  },

  // Фильтрует список memory records — убирает sensitive
  filterSafe(records: Array<{ sensitive: boolean; content: string }>): string[] {
    return records
      .filter((r) => !r.sensitive)
      .map((r) => {
        const check = this.checkMemory(r.content);
        return check.safe ? r.content : "[отфильтровано: содержит секрет]";
      });
  },

  // Проверяет memory перед отправкой в AI prompt
  sanitizeForAI(records: Array<{ sensitive: boolean; content: string; title: string }>): string {
    const safe = records.filter((r) => !r.sensitive);
    const checked = safe.filter((r) => this.checkMemory(r.content).safe);
    if (checked.length === 0) return "";
    return checked
      .map((r) => `- ${r.title}: ${r.content.slice(0, 200)}`)
      .join("\n");
  },
};
