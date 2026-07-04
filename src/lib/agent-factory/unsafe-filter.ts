const UNSAFE_PATTERNS: RegExp[] = [
  /слеж(ить|ка)\s+за\s+(частн|личн)|spy on|private account/i,
  /частн(ым|ого|ым аккаунтом)|следить.*(частн|личн)/i,
  /укра(сть|дь)\s+пароль|steal\s+(credential|password)/i,
  /обойди?\s+(paywall|защиту|безопасность)|bypass\s+(paywall|security)/i,
  /скрап(инг|ь)\s+(частн|личн)|scrape\s+private/i,
  /автоматически\s+(торгуй|плати|переводи деньги)|autonomous(ly)?\s+(trade|pay|transfer money)/i,
  /без подтверждения\s+(публикуй|плати|торгуй)/i,
];

export function isUnsafeAgentRequest(text: string): { unsafe: boolean; reason?: string } {
  for (const re of UNSAFE_PATTERNS) {
    if (re.test(text)) return { unsafe: true, reason: `Запрещённый паттерн: ${re.source}` };
  }
  return { unsafe: false };
}
