import type { EmailIntent } from "./types";

const RULES: { intent: EmailIntent; re: RegExp }[] = [
  { intent: "send_email", re: /отправь email|отправь письмо|send (the )?email/i },
  { intent: "reply_email", re: /ответь на письмо|reply (to )?email/i },
  { intent: "summarize_email", re: /суммаризируй письмо|summarize (the )?email/i },
  { intent: "extract_action_items", re: /что нужно сделать из этого письма|extract action items/i },
  { intent: "prepare_followup", re: /подготовь follow-?up|prepare followup/i },
  { intent: "classify_email", re: /классифицируй письмо|classify email/i },
  { intent: "draft_email", re: /напиши email|напиши письмо|draft (an )?email/i },
];

export function classifyEmailIntent(text: string): EmailIntent {
  const t = (text || "").trim();
  if (!t) return "unknown";
  for (const r of RULES) if (r.re.test(t)) return r.intent;
  return "unknown";
}

const UNSAFE_PATTERNS: RegExp[] = [
  /phishing|фишинг|притворись (банком|поддержкой)|impersonat/i,
  /укра(сть|дь)\s+(пароль|данные)|steal\s+(password|credential)/i,
  /массов(ая|ую)\s+рассылк|mass\s+(email|spam)|spam\s+campaign/i,
];

export function isUnsafeEmailRequest(text: string): { unsafe: boolean; reason?: string } {
  for (const re of UNSAFE_PATTERNS) if (re.test(text)) return { unsafe: true, reason: `Запрещённый паттерн: ${re.source}` };
  return { unsafe: false };
}

const SECRET_PATTERN = /\b(sk-[A-Za-z0-9]{10,}|ghp_[A-Za-z0-9]{20,}|password\s*[:=]\s*\S+|api[_-]?key\s*[:=]\s*\S+)/i;
export function containsSecretLike(text: string): boolean {
  return SECRET_PATTERN.test(text);
}
