export type AdaptationVerdict = 'ADOPT' | 'WRAP' | 'QUARANTINE' | 'REJECT';

export interface ComponentAssessment {
  repository: string;
  license: 'compatible' | 'incompatible' | 'unknown';
  security: 'pass' | 'fail' | 'unknown';
  architecture: 'compatible' | 'conflict' | 'unknown';
  duplicateOf?: string;
  requiresSecrets?: boolean;
  executesUntrustedCode?: boolean;
}

export interface AdaptationDecision {
  verdict: AdaptationVerdict;
  enabled: boolean;
  reasons: string[];
  stages: Array<{ stage: string; status: 'PASS' | 'FAIL' | 'PENDING' | 'SKIPPED' }>;
}

const EXCLUDED = 'galstyanh992-max/instagithubanalizer';

export function assessExternalComponent(input: ComponentAssessment): AdaptationDecision {
  const identity = input.repository.toLowerCase().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
  const reasons: string[] = [];
  if (identity === EXCLUDED) reasons.push('Компонент явно исключён из внешнего каталога JARVIS');
  if (input.license === 'incompatible') reasons.push('Несовместимая лицензия');
  if (input.security === 'fail') reasons.push('Проверка безопасности не пройдена');
  if (input.architecture === 'conflict') reasons.push('Компонент конфликтует с ролью JARVIS как единственного оркестратора');

  const rejected = reasons.length > 0;
  const pending = input.license === 'unknown' || input.security === 'unknown' || input.architecture === 'unknown';
  const verdict: AdaptationVerdict = rejected ? 'REJECT' : pending ? 'QUARANTINE' : input.duplicateOf || input.requiresSecrets || input.executesUntrustedCode ? 'WRAP' : 'ADOPT';
  if (input.duplicateOf) reasons.push(`Функция дублирует ${input.duplicateOf}; требуется единая точка маршрутизации`);
  if (pending) reasons.push('Требуются дополнительные доказательства лицензии, безопасности или совместимости');

  return {
    verdict,
    enabled: verdict === 'ADOPT' || verdict === 'WRAP',
    reasons,
    stages: [
      { stage: 'DISCOVERY', status: 'PASS' },
      { stage: 'LICENSE_CHECK', status: input.license === 'compatible' ? 'PASS' : input.license === 'incompatible' ? 'FAIL' : 'PENDING' },
      { stage: 'SECURITY_REVIEW', status: input.security === 'pass' ? 'PASS' : input.security === 'fail' ? 'FAIL' : 'PENDING' },
      { stage: 'DUPLICATE_CHECK', status: input.duplicateOf ? 'PASS' : 'PASS' },
      { stage: 'JARVIS_ADAPTATION', status: verdict === 'REJECT' ? 'SKIPPED' : pending ? 'PENDING' : 'PASS' },
      { stage: 'CAPABILITY_EXTRACTION', status: verdict === 'REJECT' ? 'SKIPPED' : 'PASS' },
      { stage: 'TEST', status: verdict === 'ADOPT' || verdict === 'WRAP' ? 'PENDING' : 'SKIPPED' },
      { stage: 'REGISTER', status: verdict === 'ADOPT' || verdict === 'WRAP' ? 'PENDING' : 'SKIPPED' },
      { stage: 'ENABLE', status: verdict === 'ADOPT' || verdict === 'WRAP' ? 'PENDING' : 'SKIPPED' },
    ],
  };
}
