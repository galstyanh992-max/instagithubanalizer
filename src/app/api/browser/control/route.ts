import { ok, err, safe, parseJson } from "@/lib/api";
import { chromium, Browser, Page } from "playwright";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let browserInstance: Browser | null = null;
let activePage: Page | null = null;

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("launch"), url: z.string().optional() }),
  z.object({ action: z.literal("navigate"), url: z.string().min(1) }),
  z.object({ action: z.literal("click"), selector: z.string().optional(), x: z.number().optional(), y: z.number().optional() }),
  z.object({ action: z.literal("type"), selector: z.string().optional(), text: z.string().min(1) }),
  z.object({ action: z.literal("press"), key: z.string().min(1) }),
  z.object({ action: z.literal("scroll"), deltaY: z.number().default(300) }),
  z.object({ action: z.literal("screenshot") }),
  z.object({ action: z.literal("close") }),
]);

function ensureProtocol(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return "https://" + url;
}

async function getOrCreateBrowser() {
  if (browserInstance && !browserInstance.isConnected()) {
    try { await browserInstance.close(); } catch {}
    browserInstance = null;
    activePage = null;
  }
  if (!browserInstance) {
    browserInstance = await chromium.launch({ headless: true });
  }
  if (!activePage || activePage.isClosed()) {
    activePage = await browserInstance.newPage({ viewport: { width: 1280, height: 800 } });
  }
  return { browser: browserInstance, page: activePage };
}

async function captureScreenshot(page: Page) {
  const screenshot = await page.screenshot({ type: "png", fullPage: false });
  return screenshot.toString("base64");
}

export const POST = safe(async (req: Request) => {
  const body = await parseJson(req);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return err("invalid payload", 400, { issues: parsed.error.flatten() });

  const cmd = parsed.data;

  switch (cmd.action) {
    case "launch": {
      const { page } = await getOrCreateBrowser();
      if (cmd.url) {
        await page.goto(ensureProtocol(cmd.url), { waitUntil: "domcontentloaded" });
      }
      const screenshot = await captureScreenshot(page);
      return ok({ ok: true, action: "launch", screenshot, url: page.url(), title: await page.title().catch(() => "") });
    }

    case "navigate": {
      const { page } = await getOrCreateBrowser();
      await page.goto(ensureProtocol(cmd.url), { waitUntil: "domcontentloaded" });
      const screenshot = await captureScreenshot(page);
      return ok({ ok: true, action: "navigate", screenshot, url: page.url(), title: await page.title().catch(() => "") });
    }

    case "click": {
      const { page } = await getOrCreateBrowser();
      if (cmd.selector) {
        await page.locator(cmd.selector).first().click();
      } else {
        // center click fallback
        await page.click("body");
      }
      await page.waitForTimeout(500);
      const screenshot = await captureScreenshot(page);
      return ok({ ok: true, action: "click", screenshot, url: page.url() });
    }

    case "type": {
      const { page } = await getOrCreateBrowser();
      if (cmd.selector) {
        await page.locator(cmd.selector).first().fill(cmd.text);
      } else {
        await page.keyboard.type(cmd.text);
      }
      await page.waitForTimeout(300);
      const screenshot = await captureScreenshot(page);
      return ok({ ok: true, action: "type", screenshot, url: page.url() });
    }

    case "press": {
      const { page } = await getOrCreateBrowser();
      await page.keyboard.press(cmd.key);
      await page.waitForTimeout(300);
      const screenshot = await captureScreenshot(page);
      return ok({ ok: true, action: "press", screenshot, url: page.url() });
    }

    case "scroll": {
      const { page } = await getOrCreateBrowser();
      await page.evaluate((dy) => window.scrollBy(0, dy), cmd.deltaY);
      await page.waitForTimeout(300);
      const screenshot = await captureScreenshot(page);
      return ok({ ok: true, action: "scroll", screenshot, url: page.url() });
    }

    case "screenshot": {
      const { page } = await getOrCreateBrowser();
      const screenshot = await captureScreenshot(page);
      return ok({ ok: true, action: "screenshot", screenshot, url: page.url() });
    }

    case "close": {
      if (activePage) { try { await activePage.close(); } catch {} activePage = null; }
      if (browserInstance) { try { await browserInstance.close(); } catch {} browserInstance = null; }
      return ok({ ok: true, action: "close" });
    }
  }
});
