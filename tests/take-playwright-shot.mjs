import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const bgPath = path.resolve('public/dashboard/assets/backgrounds/user-background.png').replace(/\\/g, '/');
  const bgBytes = fs.readFileSync(bgPath);
  const bgB64 = bgBytes.toString('base64');
  const bgDataUrl = `data:image/png;base64,${bgB64}`;

  const cssFiles = [
    'public/dashboard/styles.css',
    'public/dashboard/ui.css', 
    'public/dashboard/cockpit-reference.css',
    'public/dashboard/cockpit-fixed-stage.css'
  ];
  let allCss = '';
  for (const f of cssFiles) {
    allCss += fs.readFileSync(f, 'utf8') + '\n';
  }
  allCss = allCss.replace(/url\(["']?\.\/assets\/backgrounds\/user-background\.png[^)]*\)/g, `url("${bgDataUrl}")`);

  const htmlPath = path.resolve('public/dashboard/index.html');
  let htmlContent = fs.readFileSync(htmlPath, 'utf8');

  htmlContent = htmlContent.replace(/<link[^>]*rel="stylesheet"[^>]*>/g, '');
  htmlContent = htmlContent.replace('</head>', `<style>${allCss}</style></head>`);

  const girlPath = path.resolve('public/dashboard/assets/model/new-girl-visible-v12.jpg').replace(/\\/g, '/');
  if (fs.existsSync(girlPath)) {
    const girlBytes = fs.readFileSync(girlPath);
    const girlB64 = girlBytes.toString('base64');
    htmlContent = htmlContent.replace(
      /src="\.\/assets\/model\/new-girl-visible-v12\.jpg[^"]*"/,
      `src="data:image/jpeg;base64,${girlB64}"`
    );
  }

  await page.setContent(htmlContent, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  await page.screenshot({ path: 'artifacts/ui-audit/after/left-sidebar-rollback.png' });

  await page.screenshot({ 
    path: 'artifacts/ui-audit/after/left-sidebar-rollback-crop.png',
    clip: { x: 0, y: 0, width: 500, height: 1080 }
  });

  await page.screenshot({ 
    path: 'artifacts/ui-audit/after/left-sidebar-final-1920x930.png',
    clip: { x: 0, y: 70, width: 1920, height: 930 }
  });

  const metrics = await page.evaluate(() => {
    const sidebar = document.querySelector('.cockpit-sidebar--left');
    const shape = document.querySelector('.cockpit-sidebar--left .cockpit-sidebar__shape');
    const content = document.querySelector('.cockpit-sidebar--left .cockpit-sidebar__content');
    const scroll = document.querySelector('.cockpit-sidebar--left .cockpit-sidebar__scroll');
    if (!sidebar || !shape || !content || !scroll) return { error: 'elements not found' };
    const cs = window.getComputedStyle(shape);
    const cc = window.getComputedStyle(content);
    const csc = window.getComputedStyle(scroll);
    return {
      sidebarRect: sidebar.getBoundingClientRect(),
      scrollHeight: scroll.scrollHeight,
      clientHeight: scroll.clientHeight,
      overflowY: csc.overflowY,
      overflowX: csc.overflowX,
      contentTransform: cc.transform,
      shapeBackground: cs.backgroundColor,
      shapeBackdropFilter: cs.backdropFilter,
      shapeClipPath: cs.clipPath,
      pageScrollbarVisible: document.documentElement.scrollHeight > document.documentElement.clientHeight
    };
  });

  fs.writeFileSync('artifacts/ui-audit/after/left-sidebar-measurements.json', JSON.stringify(metrics, null, 2));

  await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    canvas.style.cssText = 'position:absolute;top:0;left:0;z-index:99999;pointer-events:none';
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = 'rgba(255,0,0,0.8)';
    ctx.lineWidth = 2;
    const ox = 28, oy = 95;
    const p = new Path2D();
    p.moveTo(ox+2, oy+30);
    p.bezierCurveTo(ox+40, oy+10, ox+200, oy+0, ox+340, oy+5);
    p.bezierCurveTo(ox+370, oy+8, ox+395, oy+30, ox+400, oy+70);
    p.quadraticCurveTo(ox+410, oy+250, ox+405, oy+370);
    p.quadraticCurveTo(ox+400, oy+500, ox+395, oy+560);
    p.quadraticCurveTo(ox+385, oy+680, ox+370, oy+720);
    p.bezierCurveTo(ox+350, oy+740, ox+300, oy+745, ox+200, oy+748);
    p.bezierCurveTo(ox+100, oy+750, ox+40, oy+745, ox+2, oy+730);
    p.closePath();
    ctx.stroke(p);
    document.querySelector('#jarvis-stage').appendChild(canvas);
  });

  await page.screenshot({ path: 'artifacts/ui-audit/after/left-sidebar-contour-overlay.png' });

  await browser.close();
  console.log('All captures done.');
  console.log('Measurements:', JSON.stringify(metrics, null, 2));
})();
