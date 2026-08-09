const puppeteer = require('puppeteer');
(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000/dashboard-recovery-baseline/index.html', { waitUntil: 'networkidle0', timeout: 30000 });
    await page.screenshot({ path: 'artifacts/recovery/comparison/zip-baseline-1920x1080.png' });
    await page.setViewport({ width: 1920, height: 930 });
    await page.screenshot({ path: 'artifacts/recovery/comparison/zip-baseline-1920x930.png' });
    
    // Also take a screenshot of the broken one for comparison
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000/dashboard/index.html?v=volumetric-v55', { waitUntil: 'networkidle0', timeout: 30000 });
    await page.screenshot({ path: 'artifacts/recovery/comparison/current-broken-1920x1080.png' });
    
    await browser.close();
    console.log("Screenshots captured");
  } catch (err) {
    console.error("Failed to capture screenshots:", err);
    process.exit(1);
  }
})();
