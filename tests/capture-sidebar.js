const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new", defaultViewport: { width: 1920, height: 1080 } });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/dashboard/index.html?v=volumetric-v55', { waitUntil: 'networkidle2' });
  
  // Wait a bit for everything to settle
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));

  // Take a full screenshot
  await page.screenshot({ path: 'artifacts/ui-audit/after/left-sidebar-final-1920x1080.png' });

  // Get dimensions of left sidebar
  const metrics = await page.evaluate(() => {
    const sidebar = document.querySelector('.cockpit-sidebar--left');
    const shape = document.querySelector('.cockpit-sidebar--left .cockpit-sidebar__shape');
    const content = document.querySelector('.cockpit-sidebar--left .cockpit-sidebar__content');
    const scroll = document.querySelector('.cockpit-sidebar--left .cockpit-sidebar__scroll');
    const computedContent = window.getComputedStyle(content);
    
    return {
      sidebarRect: sidebar.getBoundingClientRect(),
      scrollHeight: scroll.scrollHeight,
      clientHeight: scroll.clientHeight,
      overflowY: window.getComputedStyle(scroll).overflowY,
      transform: computedContent.transform,
      backgroundColor: window.getComputedStyle(shape).backgroundColor,
      backdropFilter: window.getComputedStyle(shape).backdropFilter
    };
  });

  const fs = require('fs');
  fs.writeFileSync('artifacts/ui-audit/after/left-sidebar-measurements.json', JSON.stringify(metrics, null, 2));

  await browser.close();
  console.log("Done");
})();
