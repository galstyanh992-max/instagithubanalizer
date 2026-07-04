import type { SourcePolicy, ResearchMode } from "./types";

const UNSAFE_PATTERNS: RegExp[] = [
  /обойди?\s+(paywall|логин|login|авториз|защиту)|bypass\s+(paywall|login|auth)/i,
  /част(н|ые|ную|ые данные)\s*.*(данные|переписк|аккаунт)|собери частные данные|private\s+data|scrape\s+private/i,
  /укра(сть|дь)\s+(пароль|данные)|steal\s+(password|credential)/i,
];

export function isUnsafeResearchRequest(text: string): { unsafe: boolean; reason?: string } {
  for (const re of UNSAFE_PATTERNS) if (re.test(text)) return { unsafe: true, reason: `Запрещённый паттерн: ${re.source}` };
  return { unsafe: false };
}

export function sourcePolicyFor(mode: ResearchMode): SourcePolicy[] {
  switch (mode) {
    case "competitor_public_analysis": return ["public_only", "no_login", "no_paywall_bypass", "no_private_data"];
    case "movie_recommendation": return ["user_provided_only", "public_only"];
    case "github_source_discovery": return ["user_provided_only", "public_only"];
    case "deep_research": return ["public_only", "no_paywall_bypass", "no_private_data", "manual_approval_required"];
    default: return ["public_only", "no_login", "no_paywall_bypass", "no_private_data"];
  }
}
