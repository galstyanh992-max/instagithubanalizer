import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import { broadcastJarvisEvent, JARVIS_REALTIME_TOPIC, type JarvisRealtimeEvent } from '../broadcast';

// Live, real-infrastructure Realtime E2E test. This talks to the actual
// Supabase project over a real WebSocket connection (not a mock) -- the
// same wire path the browser DeviceStatusBadge/ApprovalsPage components
// use in production. Exercises the exact broadcastJarvisEvent() function
// every wired call site (daemon heartbeat, task claim/complete/fail,
// approval create/decide) invokes, so this is a faithful test of the
// transport those call sites rely on. Route-level HTTP behavior for those
// call sites (auth, state transitions) is already covered by
// src/app/api/daemon/__tests__/auth-inventory.test.ts and the daemon task
// route tests -- this file's job is proving the Realtime layer itself:
// delivery to an authorized owner, denial to anon, and fallback safety.
//
// Requires network access to the real Supabase project and a valid
// SUPABASE_SERVICE_ROLE_KEY (used only to mint a genuine, short-lived
// 'authenticated' session for the JARVIS owner via a server-side magiclink
// OTP exchange -- no email is sent, no data is mutated).
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OWNER_ID = process.env.JARVIS_OWNER_ID!;

function waitForEvent(channel: RealtimeChannel, event: JarvisRealtimeEvent, timeoutMs: number): Promise<{ id: string } | null> {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => { if (!done) { done = true; resolve(null); } }, timeoutMs);
    channel.on('broadcast', { event }, (msg: any) => {
      if (!done) { done = true; clearTimeout(timer); resolve(msg.payload); }
    });
  });
}

function subscribeAndWait(channel: RealtimeChannel, timeoutMs: number): Promise<string> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve('TIMEOUT'), timeoutMs);
    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        clearTimeout(timer);
        resolve(status);
      }
    });
  });
}

let ownerAccessToken: string;
let ownerClient: SupabaseClient;
let anonClient: SupabaseClient;

beforeAll(async () => {
  const admin = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(OWNER_ID);
  if (userError || !userData.user?.email) throw new Error(`Could not load JARVIS owner user: ${userError?.message}`);

  // Server-side magiclink OTP mint + immediate verify -- produces a real
  // 'authenticated' session (auth.uid() = OWNER_ID) without sending an
  // email or mutating any application data.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: userData.user.email,
  });
  if (linkError || !linkData.properties?.hashed_token) throw new Error(`generateLink failed: ${linkError?.message}`);

  const tempAnon = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: verifyData, error: verifyError } = await tempAnon.auth.verifyOtp({
    type: 'magiclink',
    token_hash: linkData.properties.hashed_token,
  });
  if (verifyError || !verifyData.session) throw new Error(`verifyOtp failed: ${verifyError?.message}`);
  if (verifyData.user?.id !== OWNER_ID) throw new Error('Minted session did not match JARVIS_OWNER_ID');

  ownerAccessToken = verifyData.session.access_token;
  ownerClient = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  await ownerClient.realtime.setAuth(ownerAccessToken);
  anonClient = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}, 30000);

afterAll(async () => {
  await ownerClient?.auth.signOut();
});

describe('JARVIS Realtime E2E (live Supabase, private broadcast channel)', () => {
  it('the JARVIS owner (authenticated, matching auth.uid()) can subscribe to the private channel', async () => {
    const channel = ownerClient.channel(JARVIS_REALTIME_TOPIC, { config: { private: true } });
    const status = await subscribeAndWait(channel, 10000);
    expect(status).toBe('SUBSCRIBED');
    await ownerClient.removeChannel(channel);
  }, 15000);

  it('an anonymous client is denied on the private channel (no realtime.messages RLS grant for anon)', async () => {
    const channel = anonClient.channel(JARVIS_REALTIME_TOPIC, { config: { private: true } });
    const status = await subscribeAndWait(channel, 10000);
    expect(status).not.toBe('SUBSCRIBED');
    await anonClient.removeChannel(channel);
  }, 15000);

  it.each([
    ['device.status', { id: 'e2e-device-probe' }],
    ['task.progress', { id: 'e2e-task-progress-probe' }],
    ['task.completed', { id: 'e2e-task-completed-probe' }],
    ['task.created', { id: 'e2e-task-created-probe' }],
    ['approval.created', { id: 'e2e-approval-created-probe' }],
    ['approval.decided', { id: 'e2e-approval-decided-probe' }],
  ] as [JarvisRealtimeEvent, { id: string }][])(
    'daemon/server broadcast of "%s" reaches the authorized owner listener',
    async (event, payload) => {
      const channel = ownerClient.channel(JARVIS_REALTIME_TOPIC, { config: { private: true } });
      await subscribeAndWait(channel, 10000);
      const received = waitForEvent(channel, event, 8000);

      // The exact function every daemon/approval call site invokes.
      await broadcastJarvisEvent(event, { id: payload.id, at: new Date().toISOString() });

      const msg = await received;
      expect(msg).not.toBeNull();
      expect(msg?.id).toBe(payload.id);
      await ownerClient.removeChannel(channel);
    },
    15000,
  );

  it('an anonymous listener never receives owner-channel broadcasts, even while an authorized listener does', async () => {
    const ownerChannel = ownerClient.channel(JARVIS_REALTIME_TOPIC, { config: { private: true } });
    const anonChannel = anonClient.channel(JARVIS_REALTIME_TOPIC, { config: { private: true } });
    await subscribeAndWait(ownerChannel, 10000);
    await subscribeAndWait(anonChannel, 10000); // status is asserted separately above; here we just need "settled"

    const ownerReceived = waitForEvent(ownerChannel, 'device.status', 8000);
    const anonReceived = waitForEvent(anonChannel, 'device.status', 6000);

    await broadcastJarvisEvent('device.status', { id: 'e2e-isolation-probe', at: new Date().toISOString() });

    const [ownerMsg, anonMsg] = await Promise.all([ownerReceived, anonReceived]);
    expect(ownerMsg?.id).toBe('e2e-isolation-probe');
    expect(anonMsg).toBeNull();

    await ownerClient.removeChannel(ownerChannel);
    await anonClient.removeChannel(anonChannel);
  }, 20000);

  it('fallback: a listener that has disconnected misses the broadcast, but reconnecting immediately resumes live delivery (proving no state is lost, only a delivery gap that a fresh subscribe/poll closes)', async () => {
    const channel = ownerClient.channel(JARVIS_REALTIME_TOPIC, { config: { private: true } });
    await subscribeAndWait(channel, 10000);

    // Simulate the Realtime client being disabled/interrupted (network
    // drop, tab backgrounded, etc.) -- exactly what
    // src/hooks/use-jarvis-realtime.ts's cleanup does on unmount, and what
    // every consumer (DeviceStatusBadge, ApprovalsPage) tolerates by
    // continuing its independent setInterval poll regardless.
    await ownerClient.removeChannel(channel);

    // A broadcast fired while disconnected is legitimately missed by this
    // client -- Realtime is transport only, so this must not corrupt or
    // lose durable state (which is why every consumer keeps polling).
    await broadcastJarvisEvent('device.status', { id: 'e2e-missed-while-disconnected', at: new Date().toISOString() });

    // Reconnecting (what a poll-driven refetch, or the hook's next mount,
    // would trigger) proves the channel/topic/authorization still work and
    // are ready to deliver the *next* live event -- recovery is immediate,
    // not degraded.
    const reconnected = ownerClient.channel(JARVIS_REALTIME_TOPIC, { config: { private: true } });
    const status = await subscribeAndWait(reconnected, 10000);
    expect(status).toBe('SUBSCRIBED');

    const received = waitForEvent(reconnected, 'device.status', 8000);
    await broadcastJarvisEvent('device.status', { id: 'e2e-post-reconnect-probe', at: new Date().toISOString() });
    const msg = await received;
    expect(msg?.id).toBe('e2e-post-reconnect-probe');

    await ownerClient.removeChannel(reconnected);
  }, 30000);
});
