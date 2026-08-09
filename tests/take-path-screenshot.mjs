import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  
  await page.goto('file:///' + process.cwd().replace(/\\/g, '/') + '/tests/path-test.html', { waitUntil: 'networkidle' });
  
  await page.screenshot({ path: 'artifacts/ui-audit/after/left-sidebar-path-test.png', clip: { x: 0, y: 0, width: 480, height: 1080 } });

  await browser.close();
  console.log("Screenshot done.");
})();
