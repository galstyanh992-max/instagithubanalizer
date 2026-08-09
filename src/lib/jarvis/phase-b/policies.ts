export const PHASE_B_APPROVAL_TYPES = [
  'SOCIAL_PUBLISH', 'MASS_MESSAGE', 'EXTERNAL_SEND_HIGH_RISK', 'CALL_EXTERNAL',
  'PRODUCTION_DEPLOY', 'FINANCIAL_ACTION', 'ACCOUNT_CHANGE', 'SECRET_CHANGE',
  'DESTRUCTIVE_ACTION',
] as const;

export type PhaseBApprovalType = (typeof PHASE_B_APPROVAL_TYPES)[number];
export type MessagingMode = 'MANUAL' | 'DRAFT_ONLY' | 'AUTO_SAFE';

const ESCALATION_PATTERNS: Array<[string, RegExp]> = [
  ['финансы', /(?:оплат|деньг|банк|карт|сч[её]т|refund|invoice|payment)/i],
  ['покупка или возврат', /(?:купить|заказ|возврат|refund|purchase)/i],
  ['юридический вопрос', /(?:суд|юрист|договор|претензи|legal|lawyer)/i],
  ['конфликт или угроза', /(?:угрож|шантаж|конфликт|насили|threat)/i],
  ['секрет или персональные данные', /(?:парол|токен|api[ _-]?key|паспорт|cvv|private key)/i],
  ['подозрительная ссылка', /(?:https?:\/\/[^\s]+|bit\.ly|tinyurl)/i],
  ['деловое решение', /(?:подтвердите сделку|подписать|утвердить бюджет|business decision)/i],
];

export function classifyMessageRisk(input: { text: string; attachmentKnown?: boolean; massSend?: boolean }) {
  const reasons = ESCALATION_PATTERNS.filter(([, pattern]) => pattern.test(input.text)).map(([reason]) => reason);
  if (input.attachmentKnown === false) reasons.push('неизвестное вложение');
  if (input.massSend) reasons.push('массовая отправка');
  return {
    requiresEscalation: reasons.length > 0,
    reasons,
    approvalType: input.massSend ? 'MASS_MESSAGE' as const : reasons.length ? 'EXTERNAL_SEND_HIGH_RISK' as const : null,
  };
}

export function approvalForAction(action: string): PhaseBApprovalType | null {
  if (/social\.(publish|schedule)/i.test(action)) return 'SOCIAL_PUBLISH';
  if (/mass[_\s.-]?message/i.test(action)) return 'MASS_MESSAGE';
  if (/(?:message(?:\.[a-z0-9_-]+)?|telegram)\.send/i.test(action)) return 'EXTERNAL_SEND_HIGH_RISK';
  if (/call\.external/i.test(action)) return 'CALL_EXTERNAL';
  if (/deploy|production/i.test(action)) return 'PRODUCTION_DEPLOY';
  if (/financial|trade\.live/i.test(action)) return 'FINANCIAL_ACTION';
  if (/account/i.test(action)) return 'ACCOUNT_CHANGE';
  if (/secret|credential/i.test(action)) return 'SECRET_CHANGE';
  if (/delete|destroy|wipe|truncate/i.test(action)) return 'DESTRUCTIVE_ACTION';
  return null;
}

export const PHASE_B_SAFETY_DEFAULTS = Object.freeze({
  cameraEnabled: false,
  liveTrading: false,
  pstnCalls: false,
  productionDeploy: false,
  externalPublishWithoutApproval: false,
  massMessaging: false,
});
