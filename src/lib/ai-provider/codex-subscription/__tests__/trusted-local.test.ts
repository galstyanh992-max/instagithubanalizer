import { afterEach, describe, expect, it } from 'vitest';
import { isTrustedLocalCodexRequest } from '../trusted-local';

const originalVercel = process.env.VERCEL;

afterEach(() => {
  if (originalVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = originalVercel;
});

describe('trusted local Codex request guard', () => {
  it('allows a direct loopback request', () => {
    expect(isTrustedLocalCodexRequest(new Request('http://localhost/api/providers/codex-subscription/status'))).toBe(true);
  });

  it('rejects remote hosts and non-loopback forwarding hops', () => {
    expect(isTrustedLocalCodexRequest(new Request('https://jarvis.example/api/providers/codex-subscription/status'))).toBe(false);
    expect(isTrustedLocalCodexRequest(new Request('http://localhost/api/providers/codex-subscription/status', {
      headers: { 'x-forwarded-for': '203.0.113.5' },
    }))).toBe(false);
  });

  it('fails closed on hosted runtimes', () => {
    process.env.VERCEL = '1';
    expect(isTrustedLocalCodexRequest(new Request('http://localhost/api/providers/codex-subscription/status'))).toBe(false);
  });
});
