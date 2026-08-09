import type { OllamaModelDetails } from '@/lib/jarvis/platform/types';

const HEAVY_INTENTS = new Set(['analysis', 'repo_analysis', 'integration_plan', 'patch_plan', 'security_audit']);
const LOCAL_INTENTS = new Set(['chat/general', 'fast_ui_command', 'local_compatibility', 'voice_command', 'model_select', 'fallback']);

export interface LocalRoutingDecision {
  allowed: boolean;
  reason: string;
  model?: string;
}

/**
 * Conservative routing policy: small local models handle only short, low-risk
 * interactions. Repository, legal, security and long-form reasoning stay on a
 * stronger configured provider instead of silently degrading answer quality.
 */
export function decideOllamaLocalRoute(
  intent: string,
  models: OllamaModelDetails[],
  promptLength = 0,
): LocalRoutingDecision {
  if (HEAVY_INTENTS.has(intent)) return { allowed: false, reason: 'Сложная задача требует сильного провайдера' };
  if (!LOCAL_INTENTS.has(intent)) return { allowed: false, reason: 'Тип задачи не разрешён локальной политикой' };
  if (promptLength > 12_000) return { allowed: false, reason: 'Запрос слишком длинный для быстрой локальной модели' };

  const preferred = models.find((item) => /phi4-mini/i.test(item.name))
    ?? models.find((item) => /qwen.*coder/i.test(item.name))
    ?? models.find((item) => /(?:phi|qwen|gemma)/i.test(item.name));
  if (!preferred) return { allowed: false, reason: 'Нет проверенной локальной модели' };
  return { allowed: true, reason: 'Простая локальная задача', model: preferred.name };
}

export function isHeavyAiIntent(intent: string): boolean {
  return HEAVY_INTENTS.has(intent);
}
