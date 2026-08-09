import { describe, expect, it } from 'vitest';
import { GET as getStatus } from '../status/route';
import { POST as logout } from '../logout/route';

describe('Codex subscription API safety', () => {
  it('rejects status calls from remote hosts', async () => {
    const response = await getStatus(new Request('https://jarvis.example/api/providers/codex-subscription/status'));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: 'TRUSTED_LOCAL_RUNTIME_REQUIRED' });
  });

  it('requires explicit logout confirmation', async () => {
    const response = await logout(new Request('http://localhost/api/providers/codex-subscription/logout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ confirm: false }),
    }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'LOGOUT_CONFIRMATION_REQUIRED' });
  });
});
