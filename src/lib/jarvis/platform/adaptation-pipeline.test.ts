import { describe, expect, it } from 'vitest';
import { assessExternalComponent } from './adaptation-pipeline';

describe('external adaptation pipeline', () => {
  it('изолирует компонент с неизвестными доказательствами', () => {
    expect(assessExternalComponent({ repository: 'example/tool', license: 'unknown', security: 'unknown', architecture: 'unknown' })).toMatchObject({ verdict: 'QUARANTINE', enabled: false });
  });
  it('требует wrapper для дублирующего оркестратора', () => {
    expect(assessExternalComponent({ repository: 'example/tool', license: 'compatible', security: 'pass', architecture: 'compatible', duplicateOf: 'jarvis-core' })).toMatchObject({ verdict: 'WRAP', enabled: true });
  });
  it('всегда отклоняет исключённый репозиторий', () => {
    expect(assessExternalComponent({ repository: 'galstyanh992-max/instagithubanalizer', license: 'compatible', security: 'pass', architecture: 'compatible' })).toMatchObject({ verdict: 'REJECT', enabled: false });
  });
});
