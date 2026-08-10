// Complete inventory + regression test for every /api/daemon/* route.
//
// Context: middleware.ts deliberately excludes api/daemon/** from Supabase
// session enforcement (see src/middleware.ts) because the daemon
// authenticates with its own Bearer token, not a browser session. That
// exclusion is NOT authorization by itself — every route below must
// independently call requireDaemonAuth() before any privileged action.
// This test proves that invariant holds for all 9 known daemon routes and
// will fail if a new daemon route is ever added without wiring up
// requireDaemonAuth, or if an existing one regresses.
import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

process.env.JARVIS_DAEMON_TOKEN = process.env.JARVIS_DAEMON_TOKEN || 'test-daemon-token-for-auth-inventory';
const VALID_TOKEN = process.env.JARVIS_DAEMON_TOKEN;

type Handler = (request: NextRequest, context?: any) => Promise<Response> | Response;

interface DaemonRoute {
  name: string;
  importPath: () => Promise<{ POST: Handler }>;
  url: string;
  context?: any;
}

// Every file under src/app/api/daemon/**/route.ts as of the 2026-08-10 audit
// (DAEMON_ROUTES_TOTAL=9). Add new daemon routes here when they're created —
// that is what makes "DAEMON_ROUTES_WITHOUT_AUTH=0" a live-enforced
// invariant rather than a one-time manual count.
const ROUTES: DaemonRoute[] = [
  { name: 'register', importPath: () => import('../register/route'), url: 'http://localhost/api/daemon/register' },
  { name: 'heartbeat', importPath: () => import('../heartbeat/route'), url: 'http://localhost/api/daemon/heartbeat' },
  { name: 'artifacts', importPath: () => import('../artifacts/route'), url: 'http://localhost/api/daemon/artifacts' },
  { name: 'registry-snapshot', importPath: () => import('../registry-snapshot/route'), url: 'http://localhost/api/daemon/registry-snapshot' },
  { name: 'tasks/claim', importPath: () => import('../tasks/claim/route'), url: 'http://localhost/api/daemon/tasks/claim' },
  {
    name: 'tasks/[id]/events',
    importPath: () => import('../tasks/[id]/events/route'),
    url: 'http://localhost/api/daemon/tasks/t1/events',
    context: { params: Promise.resolve({ id: 't1' }) },
  },
  {
    name: 'tasks/[id]/cancel',
    importPath: () => import('../tasks/[id]/cancel/route'),
    url: 'http://localhost/api/daemon/tasks/t1/cancel',
    context: { params: Promise.resolve({ id: 't1' }) },
  },
  {
    name: 'tasks/[id]/complete',
    importPath: () => import('../tasks/[id]/complete/route'),
    url: 'http://localhost/api/daemon/tasks/t1/complete',
    context: { params: Promise.resolve({ id: 't1' }) },
  },
  {
    name: 'tasks/[id]/fail',
    importPath: () => import('../tasks/[id]/fail/route'),
    url: 'http://localhost/api/daemon/tasks/t1/fail',
    context: { params: Promise.resolve({ id: 't1' }) },
  },
];

function req(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { host: 'localhost', 'content-type': 'application/json', ...headers },
    body: JSON.stringify({}),
  });
}

describe(`daemon route auth inventory (DAEMON_ROUTES_TOTAL=${ROUTES.length})`, () => {
  it('every known daemon route file exports exactly one POST handler', async () => {
    for (const route of ROUTES) {
      const mod = await route.importPath();
      expect(typeof mod.POST, `${route.name} must export POST`).toBe('function');
    }
  });

  for (const route of ROUTES) {
    it(`${route.name}: rejects a request with no Authorization header`, async () => {
      const { POST } = await route.importPath();
      const response = await POST(req(route.url), route.context);
      expect(response.status).toBe(401);
    });

    it(`${route.name}: rejects an invalid Bearer token`, async () => {
      const { POST } = await route.importPath();
      const response = await POST(req(route.url, {
        Authorization: 'Bearer not-the-real-token',
        'X-Installation-Id': 'attacker-installation',
      }), route.context);
      expect(response.status).toBe(403);
    });

    it(`${route.name}: rejects a valid token with no X-Installation-Id header`, async () => {
      const { POST } = await route.importPath();
      const response = await POST(req(route.url, {
        Authorization: `Bearer ${VALID_TOKEN}`,
      }), route.context);
      expect(response.status).toBe(400);
    });
  }
});
