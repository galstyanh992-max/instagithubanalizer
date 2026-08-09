import { describe, expect, it } from 'vitest';
import { redactCodexText, sanitizeCodexValue } from '../redaction';

describe('Codex provider redaction', () => {
  it('redacts bearer and token-like values', () => {
    const value = redactCodexText('Authorization: Bearer abc.def.ghi sk-supersecrettoken123');
    expect(value).not.toContain('abc.def.ghi');
    expect(value).not.toContain('sk-supersecrettoken123');
    expect(value).toContain('[REDACTED]');
  });

  it('redacts sensitive keys recursively', () => {
    expect(sanitizeCodexValue({
      account: { refreshToken: 'secret', profile: 'safe' },
      cookie: 'secret',
    })).toEqual({
      account: { refreshToken: '[REDACTED]', profile: 'safe' },
      cookie: '[REDACTED]',
    });
  });
});
