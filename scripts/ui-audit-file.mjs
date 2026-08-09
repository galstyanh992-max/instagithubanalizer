/*
 * UI audit screenshot capture — file:// access, без auth middleware.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || 'after';
const SIZES = process.argv.slice(3).length
  ? process.argv.slice(3).map((s) => s.split('x').map(Number))
  : [[1920, 1080], [1920, 930], [1536, 864], [1366, 768], [1280, 720]];

const OUTDIR = `artifacts/ui-audit/${OUT}`;
fs.mkdirSync(OUTDIR, { recursive: true });

const ROOT = path.resolve('public/dashboard/index.html').replace(/\\/g, '/');
const URL = `file:///${ROOT}?v=volumetric-v56`;

const consoleErrors = [];

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [w, h] of SIZES) {
      const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleRatio: 1 });
      const page = await context.newPage();
      page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`${w}x${h}: ${m.text()}`); });
      page.on('pageerror', (e) => consoleErrors.push(`${w}x${h}: PAGEERROR ${e.message}`));

      await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      await page.evaluate(() => {
        document.querySelectorAll('*').forEach((el) => {
          const st = window.getComputedStyle(el);
          if (st.animationName && st.animationName !== 'none') el.style.animationPlayState = 'paused';
        });
      }).catch(() => {});
      await page.waitForTimeout(1500);

      const boxes = await page.evaluate(() => {
        const pick = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2) };
        };
        const stage = document.getElementById('jarvis-stage');
        return {
          shell: pick('#jarvisApp'),
          stage: pick('#jarvis-stage'),
          leftSidebar: pick('.cockpit-sidebar--left'),
          rightSidebar: pick('.cockpit-sidebar--right'),
          avatar: pick('.avatar-stage'),
          chatPanel: pick('.chat-panel'),
          stageTransform: stage ? getComputedStyle(stage).transform : null,
          cssScale: getComputedStyle(document.documentElement).getPropertyValue('--jarvis-stage-scale'),
        };
      }).catch(() => ({ evaluateFailed: true }));

      const screenshotPath = `${OUTDIR}/dashboard_${w}x${h}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`saved ${screenshotPath}`);
      console.log(`  boxes=${JSON.stringify(boxes)}`);
      fs.writeFileSync(`${OUTDIR}/measurements_${w}x${h}.json`, JSON.stringify({ size: [w, h], boxes, errorsSoFar: consoleErrors.filter((e) => e.startsWith(`${w}x${h}`)) }, null, 2));
      await context.close();
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(`${OUTDIR}/console-errors.txt`, consoleErrors.join('\n') || '(none)');
  console.log(`\nConsole errors: ${consoleErrors.length}`);
})();