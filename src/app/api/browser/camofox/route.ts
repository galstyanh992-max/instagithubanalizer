import { ok, err, safe, parseJson } from "@/lib/api";
import { camofoxBrowserService } from "@/services/camofox-browser.service";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["health", "createTab", "navigate", "snapshot", "click", "type", "listTabs", "closeTab", "searchGoogle"]),
  url: z.string().optional(),
  tabId: z.string().optional(),
  ref: z.string().optional(),
  text: z.string().optional(),
  query: z.string().optional(),
  sessionId: z.string().optional(),
});

export const POST = safe(async (req: Request) => {
  const body = await parseJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("Invalid input", 400, { issues: parsed.error.flatten() });
  const d = parsed.data;

  try {
    switch (d.action) {
      case "health": return ok({ healthy: await camofoxBrowserService.health() });
      case "createTab": {
        if (!d.url) return err("url required");
        return ok(await camofoxBrowserService.createTab(d.url, d.sessionId));
      }
      case "navigate": {
        if (!d.tabId || !d.url) return err("tabId and url required");
        await camofoxBrowserService.navigate(d.tabId, d.url);
        return ok({ done: true });
      }
      case "snapshot": {
        if (!d.tabId) return err("tabId required");
        return ok(await camofoxBrowserService.snapshot(d.tabId, true));
      }
      case "click": {
        if (!d.tabId || !d.ref) return err("tabId and ref required");
        await camofoxBrowserService.click(d.tabId, d.ref);
        return ok({ done: true });
      }
      case "type": {
        if (!d.tabId || !d.ref || !d.text) return err("tabId, ref, text required");
        await camofoxBrowserService.type(d.tabId, d.ref, d.text);
        return ok({ done: true });
      }
      case "listTabs": return ok(await camofoxBrowserService.listTabs(d.sessionId));
      case "closeTab": {
        if (!d.tabId) return err("tabId required");
        await camofoxBrowserService.closeTab(d.tabId);
        return ok({ done: true });
      }
      case "searchGoogle": {
        if (!d.query) return err("query required");
        return ok(await camofoxBrowserService.searchGoogle(d.query, d.sessionId));
      }
      default: return err("Unknown action", 400);
    }
  } catch (e: any) {
    return err(e.message, 500);
  }
});
