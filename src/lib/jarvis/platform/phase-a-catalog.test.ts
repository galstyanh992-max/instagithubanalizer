import { describe, expect, it } from 'vitest';
import { PHASE_A_COMPONENTS, validatePhaseACatalog } from './phase-a-catalog';

describe('Phase A component catalog', () => {
  it('не содержит дубликатов и исключённого репозитория', () => {
    expect(validatePhaseACatalog()).toEqual({ valid: true, errors: [] });
    expect(PHASE_A_COMPONENTS.some((item) => item.repository.toLowerCase() === 'galstyanh992-max/instagithubanalizer')).toBe(false);
  });

  it('не разрешает автоматическую установку внешнего кода', () => {
    expect(PHASE_A_COMPONENTS.every((item) => item.autoInstall === false)).toBe(true);
  });
});
