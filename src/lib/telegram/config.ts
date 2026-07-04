export interface TelegramConfig {
  tokenConfigured: boolean;
  allowedUserConfigured: boolean;
  allowedUserId?: string;
}

/** Never returns the token itself. */
export function getTelegramConfig(): TelegramConfig {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const allowed = process.env.TELEGRAM_ALLOWED_USER_ID;
  return {
    tokenConfigured: Boolean(token && token !== "replace-later"),
    allowedUserConfigured: Boolean(allowed && allowed !== "replace-later"),
    allowedUserId: allowed && allowed !== "replace-later" ? allowed : undefined,
  };
}

export function isTelegramConfigured(): boolean {
  return getTelegramConfig().tokenConfigured;
}

export function validateTelegramUser(userId: string): boolean {
  const cfg = getTelegramConfig();
  if (!cfg.allowedUserConfigured || !cfg.allowedUserId) return false;
  return userId === cfg.allowedUserId;
}
