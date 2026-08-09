const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('http://localhost:3000/dashboard/index.html?v=volumetric-v55');
  await page.waitForTimeout(2000); // wait for 3D and JS to settle

  const measurements = await page.evaluate(() => {
    const sidebar = document.querySelector('.cockpit-sidebar--left');
    const shape = document.querySelector('.cockpit-sidebar--left .cockpit-sidebar__shape');
    const content = document.querySelector('.cockpit-sidebar--left .cockpit-sidebar__content');
    const scroll = document.querySelector('.cockpit-sidebar--left .cockpit-sidebar__scroll');
    const models = document.querySelectorAll('.cockpit-sidebar--left .prov');
    
    const getRect = el => {
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
    };

    return {
      "sidebar bounding box": getRect(sidebar),
      "shape bounding box": getRect(shape),
      "content bounding box": getRect(content),
      "scrollHeight": scroll ? scroll.scrollHeight : null,
      "clientHeight": scroll ? scroll.clientHeight : null,
      "scrollWidth": scroll ? scroll.scrollWidth : null,
      "clientWidth": scroll ? scroll.clientWidth : null,
      "bounding box каждой секции": {
        "header": getRect(document.querySelector('.sidebar-system-header')),
        "resources": getRect(document.querySelector('.sidebar-resource-list')),
        "metrics": getRect(document.querySelector('.sidebar-metrics')),
        "core": getRect(document.querySelector('.sidebar-core-visual')),
        "models": getRect(document.querySelector('.sidebar-models')),
        "network": getRect(document.querySelector('.sidebar-network')),
        "footer": getRect(document.querySelector('.sidebar-footer-stats'))
      },
      "видимость LIVE": getRect(document.querySelector('#coreLive')),
      "количество видимых model rows": models.length,
      "состояние network chart": getRect(document.querySelector('#netCanvas'))
    };
  });

  const outPath = 'D:\\АГЕНТ\\ДЖАРВИС\\artifacts\\ui-audit\\after\\left-sidebar-measurements.json';
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(measurements, null, 2));

  // Capture specific screenshot of left sidebar
  const sidebarEl = await page.$('.cockpit-sidebar--left');
  if (sidebarEl) {
    await sidebarEl.screenshot({ path: 'D:\\АГЕНТ\\ДЖАРВИС\\artifacts\\ui-audit\\after\\left-sidebar-overlay.png' });
  }

  await browser.close();
})();
