import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const imgPath = path.resolve('public/dashboard/assets/backgrounds/user-background.png').replace(/\\/g, '/');
  const imgBytes = fs.readFileSync(imgPath);
  const b64 = imgBytes.toString('base64');

  await page.setContent(`<body style="margin:0;background:#000"><img src="data:image/png;base64,${b64}" style="width:1920px;height:1080px;display:block;object-fit:fill"></body>`);
  await page.waitForTimeout(500);

  await page.screenshot({ 
    path: 'artifacts/ui-audit/after/bg-left-crop.png',
    clip: { x: 0, y: 0, width: 500, height: 1080 }
  });

  await browser.close();
  console.log("BG crop done.");
})();
