import type { ContentGenerationMode } from "./types";

const RULES: { mode: ContentGenerationMode; re: RegExp }[] = [
  { mode: "publish", re: /опублику|publish\b|запости/i },
  { mode: "image", re: /создай изображение|сгенерируй картинку|generate image/i },
  { mode: "video", re: /сгенерируй видео|generate video/i },
  { mode: "voice", re: /сделай голос|generate voice|озвучь/i },
  { mode: "content_calendar", re: /контент[- ]план|content calendar/i },
  { mode: "campaign_plan", re: /кампани[яю] для соцсет|campaign plan/i },
  { mode: "caption", re: /придумай caption|write a caption/i },
  { mode: "social_post", re: /напиши пост|write a post|social post/i },
];

export function classifyContentMode(text: string): ContentGenerationMode {
  const t = (text || "").trim();
  if (!t) return "unknown";
  for (const r of RULES) if (r.re.test(t)) return r.mode;
  return "unknown";
}

const UNSAFE_PATTERNS: RegExp[] = [
  /голос(ом)?\s+(реального человека|знаменитост)|voice of a real person|impersonat/i,
  /массов(ая|ую)\s+рассылк|mass\s+spam|spam campaign/i,
  /скопируй\s+(защищённ|copyright)|copy\s+copyrighted/i,
  /обман(ывай|ное)|deceptive content|fraud/i,
];

export function isUnsafeContentRequest(text: string): { unsafe: boolean; reason?: string } {
  for (const re of UNSAFE_PATTERNS) if (re.test(text)) return { unsafe: true, reason: `Запрещённый паттерн: ${re.source}` };
  return { unsafe: false };
}
