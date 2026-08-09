import { describe, expect, it } from 'vitest';
import { decideOllamaLocalRoute } from './quality-policy';
import type { OllamaModelDetails } from '@/lib/jarvis/platform/types';

const model: OllamaModelDetails = {
  name: 'phi4-mini:latest',
  size: 1,
  parameter_size: '3.8B',
  quantization: 'Q4_K_M',
  loaded: true,
  estimated_ram: 1,
  current_ram: 1,
  context: 4096,
  recommended_use: ['диалог'],
};

describe('Ollama local quality policy', () => {
  it('разрешает короткий простой диалог', () => {
    expect(decideOllamaLocalRoute('chat/general', [model], 100)).toMatchObject({ allowed: true, model: model.name });
  });

  it.each(['analysis', 'repo_analysis', 'patch_plan', 'security_audit'])('не отправляет сложную задачу %s на малую модель', (intent) => {
    expect(decideOllamaLocalRoute(intent, [model], 100).allowed).toBe(false);
  });

  it('отклоняет чрезмерно длинный запрос', () => {
    expect(decideOllamaLocalRoute('chat/general', [model], 20_000).allowed).toBe(false);
  });
});
