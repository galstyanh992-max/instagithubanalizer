import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1672, height: 941 }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  await page.goto('http://localhost:3000/login');
  await page.fill('input[name=\"email\"]', 'eyeofmasona@gmail.com');
  await page.fill('input[name=\"password\"]', 'Prado006');
  await page.click('button[type=\"submit\"]');
  await page.waitForURL('**/', { waitUntil: 'networkidle', timeout: 10000 });

  await page.goto('http://localhost:3000/dashboard/index.html?v=volumetric-v48');
  await page.waitForLoadState('networkidle');

  // Freeze animations for stable capture
  await page.evaluate(() => {
    document.body.style.setProperty('--animation-play-state', 'paused');
    document.querySelectorAll('*').forEach((el) => {
      const style = window.getComputedStyle(el);
      if (style.animationName !== 'none') el.style.animationPlayState = 'paused';
    });
  });

  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'output/playwright/PROMPT1_baseline_1672x941.png', fullPage: false });
  await browser.close();
  console.log('saved output/playwright/PROMPT1_baseline_1672x941.png');
})();
