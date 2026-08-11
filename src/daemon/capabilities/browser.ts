// Real browser.{open,status,stop} capability. Reuses the CamoFox REST
// service (src/services/camofox-browser.service.ts -> real standalone
// Firefox-automation HTTP server on 127.0.0.1:9377, started separately via
// `npm run camofox:start`) rather than the raw-Playwright route
// (src/app/api/browser/control/route.ts), whose "session" is trapped in the
// Next.js server process's own module memory and therefore unreachable from
// a separate daemon process. CamoFox's tab/session ids are server-side and
// process-independent, which is exactly the reusable session concept this
// capability needs for open -> status -> stop as three separate task calls.
//
// Governed, not a raw remote browser API: `open` only ever navigates to one
// fixed, safe, side-effect-free test page — it does not accept an
// arbitrary URL from the caller.
import type { CapabilityCommandEnvelope } from '@/lib/jarvis/capabilities/envelope';
import type { DaemonCapabilityExecutor } from './types';
import { ok, fail } from './types';

const SESSION_ID = 'jarvis-daemon-e2e';
const SAFE_TEST_URL = 'https://example.com/';

// Process-level state, mirroring the same "single shared session" pattern
// already used by the raw-Playwright route (browserInstance/activePage) —
// applied here to the daemon process instead of the Next.js process.
let lastTabId: string | null = null;

export const browserExecutor: DaemonCapabilityExecutor = {
  id: 'browser',
  canHandle: (capability) => capability === 'browser',
  validate: (envelope) => {
    if (!['open', 'status', 'stop'].includes(envelope.operation)) {
      return { ok: false, reason: `Неподдерживаемая операция browser: ${envelope.operation}` };
    }
    return { ok: true };
  },
  async execute(envelope: CapabilityCommandEnvelope, signal: AbortSignal) {
    try {
      if (signal.aborted) return fail('Отменено до выполнения');
      const { camofoxBrowserService } = await import('@/services/camofox-browser.service');

      const healthy = await camofoxBrowserService.health();
      if (!healthy) {
        return fail('Браузер CamoFox недоступен на 127.0.0.1:9377 (сервис не запущен: npm run camofox:start)');
      }

      if (envelope.operation === 'open') {
        const tab = await camofoxBrowserService.createTab(SAFE_TEST_URL, SESSION_ID);
        lastTabId = tab.tabId;
        const snapshot = await camofoxBrowserService.snapshot(tab.tabId, false);
        return ok({ tabId: tab.tabId, url: snapshot.url, title: snapshot.title });
      }

      if (envelope.operation === 'status') {
        const tabs = await camofoxBrowserService.listTabs(SESSION_ID);
        if (tabs.length === 0) return ok({ open: false, tabs: [] });
        const withSnapshots = await Promise.all(
          tabs.map(async (tab) => {
            try {
              const snapshot = await camofoxBrowserService.snapshot(tab.tabId, false);
              return { tabId: tab.tabId, url: snapshot.url, title: snapshot.title };
            } catch {
              return { tabId: tab.tabId, url: tab.url, title: null };
            }
          }),
        );
        return ok({ open: true, tabs: withSnapshots });
      }

      if (envelope.operation === 'stop') {
        const tabs = await camofoxBrowserService.listTabs(SESSION_ID);
        if (tabs.length === 0) return ok({ closed: 0 });
        for (const tab of tabs) {
          await camofoxBrowserService.closeTab(tab.tabId);
        }
        lastTabId = null;
        return ok({ closed: tabs.length });
      }

      return fail(`Неподдерживаемая операция browser: ${envelope.operation}`);
    } catch (error: any) {
      return fail(error?.message ?? String(error));
    }
  },
};
