// UI audit screenshot capture — saves PNGs to disk for visual reference comparison.
// Usage: node scripts/ui-audit-screenshot.mjs <out-subdir> [w1xh1] [w2xh2] ...
//   e.g. node scripts/ui-audit-screenshot.mjs before 1920x1080 1920x930 1536x864
import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = process.argv[2] || 'after';
const SIZES = process.argv.slice(3).length
  ? process.argv.slice(3).map((s) => s.split('x').map(Number))
  : [[1920, 1080], [1920, 930], [1536, 864], [1366, 768], [1280, 720]];

const OUTDIR = `artifacts/ui-audit/${OUT}`;
fs.mkdirSync(OUTDIR, { recursive: true });

// Dashboard static files are now served without auth (public/* exemption in middleware).
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const URL = `http://localhost:3000/dashboard/index.html?v=volumetric-v55`;

const consoleErrors = [];

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [w, h] of SIZES) {
      const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleRatio: 1 });
      const page = await context.newPage();
      page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`${w}x${h}: ${m.text()}`); });
      page.on('pageerror', (e) => consoleErrors.push(`${w}x${h}: PAGEERROR ${e.message}`));

      await page.goto(URL, { waitUntil: 'networkidle', timeout: 20000 }).catch(async (e) => {
        // file:// never reaches networkidle if API calls hang; fall back to domcontentloaded
        await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      });
      // Freeze animations for a stable geometric capture
      await page.evaluate(() => {
        document.querySelectorAll('*').forEach((el) => {
          const st = window.getComputedStyle(el);
          if (st.animationName && st.animationName !== 'none') el.style.animationPlayState = 'paused';
        });
      }).catch(() => {});
      await page.waitForTimeout(1500);

      const finalUrl = page.url();
      const scale = await page.evaluate(() => {
        const v = document.getElementById('jarvis-viewport');
        const s = document.getElementById('jarvis-stage');
        const sh = document.getElementById('jarvis-stage-shell');
        return {
          hasViewport: !!v, hasStage: !!s, hasShell: !!sh,
          stageTransform: s ? getComputedStyle(s).transform : null,
          shellSize: sh ? { w: sh.offsetWidth, h: sh.offsetHeight } : null,
          viewportSize: v ? { w: v.clientWidth, h: v.clientHeight } : null,
          cssScale: getComputedStyle(document.documentElement).getPropertyValue('--jarvis-stage-scale'),
        };
      }).catch(() => ({ evaluateFailed: true }));

      // Record bounding boxes of key elements for measurements.json
      const boxes = await page.evaluate(() => {
        const pick = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2) };
        };
        return {
          header: pick('.unified-top-panel'),
          headerHotspots: pick('.unified-hotspots'),
          hotspotsLeft: pick('.hotspots-left'),
          hotspotsRight: pick('.hotspots-right'),
          hotspotsCenter: pick('.hotspots-center'),
          avatarStage: pick('.avatar-stage'),
          chatPanel: pick('.chat-panel'),
          commandForm: pick('.command-form'),
          viewport: pick('#jarvis-viewport'),
          stage: pick('#jarvis-stage'),
          stageShell: pick('#jarvis-stage-shell'),
        };
      }).catch(() => ({ evaluateFailed: true }));

      const path = `${OUTDIR}/dashboard_${w}x${h}.png`;
      await page.screenshot({ path, fullPage: false });
      console.log(`saved ${path} (finalUrl=${finalUrl})`);
      console.log(`  scale=${JSON.stringify(scale)}`);
      fs.writeFileSync(`${OUTDIR}/measurements_${w}x${h}.json`, JSON.stringify({ size: [w, h], finalUrl, scale, boxes, errorsSoFar: consoleErrors.filter((e) => e.startsWith(`${w}x${h}`)) }, null, 2));
      await context.close();
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(`${OUTDIR}/console-errors.txt`, consoleErrors.join('\n') || '(none)');
  console.log(`\nConsole errors captured: ${consoleErrors.length}`);
})();
