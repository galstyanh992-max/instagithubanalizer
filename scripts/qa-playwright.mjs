import { chromium } from 'playwright';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'http://localhost:3000';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const results = {
    core: [],
    unauth: [],
    auth: [],
    ui: [],
    console: []
  };

  page.on('console', msg => {
    if (msg.type() === 'error') results.console.push(`Console error: ${msg.text()}`);
  });
  page.on('pageerror', err => {
    results.console.push(`Page error: ${err.message}`);
  });

  // --- 1. Unauthenticated API Checks ---
  const unauthContext = await browser.newContext();
  const unauthTests = [
    { path: '/api/departments', method: 'get', expected: 401 },
    { path: '/api/departments', method: 'post', expected: 401 },
    { path: '/api/workflow-templates', method: 'get', expected: 401 },
    { path: '/api/workflow-templates', method: 'post', expected: 401 },
    { path: '/api/settings', method: 'get', expected: 401 },
    { path: '/api/settings', method: 'patch', expected: 401 },
    { path: '/api/chat', method: 'post', expected: [401, 405] }, 
  ];

  for (const t of unauthTests) {
    try {
      const res = await unauthContext.request[t.method](URL + t.path);
      const pass = Array.isArray(t.expected) ? t.expected.includes(res.status()) : res.status() === t.expected;
      results.unauth.push(`[${t.method.toUpperCase()} ${t.path}] Expected: ${t.expected}, Actual: ${res.status()} -> ${pass ? 'PASS' : 'FAIL'}`);
    } catch(e) {
      results.unauth.push(`[${t.method.toUpperCase()} ${t.path}] Error: ${e.message}`);
    }
  }
  await unauthContext.close();

  // --- 2. Real Browser Session (Core Flow) ---
  try {
    results.core.push(`[Open /login] Navigate to login page`);
    await page.goto(`${URL}/login`);
    await page.waitForLoadState('networkidle');

    results.core.push(`[Login] Fill password`);
    const password = process.env.JARWISYAN_ADMIN_PASSWORD || 'jarwisyan-admin';
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.href.includes('/login'));
    results.core.push(`[Login] Success. URL: ${page.url()}`);

    results.core.push(`[Dashboard] Sidebar check`);
    await page.click('text="Департаменты"');
    await page.waitForURL('**/departments');
    results.core.push(`[Sidebar] Navigated to /departments`);

    results.core.push(`[UI] Check empty state`);
    const emptyText = await page.isVisible('text="Нет созданных департаментов"');
    results.ui.push(`[Empty State] isVisible: ${emptyText}`);

    results.core.push(`[Create Department] Fill form`);
    await page.fill('input[placeholder*="Название"]', 'QA Department');
    await page.fill('input[placeholder*="Key"]', 'qa_department');
    await page.fill('input[placeholder*="Описание"]', 'Browser QA test department');
    await page.click('button:has-text("Создать департамент")');
    
    // Wait for the department to appear in the list
    await page.waitForSelector('text="QA Department"', { timeout: 5000 });
    results.core.push(`[Create Department] Success. Appeared in list.`);

    results.core.push(`[Refresh] Reloading page`);
    await page.reload();
    await page.waitForSelector('text="QA Department"', { timeout: 5000 });
    results.core.push(`[Refresh] Department persists.`);

    // --- 3. Authenticated API Checks ---
    const authTests = [
      { path: '/api/departments', method: 'get', expected: 200 },
      { path: '/api/departments', method: 'post', body: { name: 'Valid', key: 'valid_key' }, expected: [200, 201] },
      { path: '/api/departments', method: 'post', body: { name: '' }, expected: 400 },
      { path: '/api/departments', method: 'post', body: { name: 'Valid', key: 'qa_department' }, expected: 409 },
      { path: '/api/workflow-templates', method: 'get', expected: 200 },
      { path: '/api/workflow-templates', method: 'post', body: { name: 'Invalid', steps: 'not json' }, expected: 400 },
    ];
  
    for (const t of authTests) {
      try {
        const reqOpts = t.body ? { data: t.body } : undefined;
        const res = await context.request[t.method](URL + t.path, reqOpts);
        const pass = Array.isArray(t.expected) ? t.expected.includes(res.status()) : res.status() === t.expected;
        results.auth.push(`[${t.method.toUpperCase()} ${t.path}] Expected: ${t.expected}, Actual: ${res.status()} -> ${pass ? 'PASS' : 'FAIL'}`);
      } catch(e) {
        results.auth.push(`[${t.method.toUpperCase()} ${t.path}] Error: ${e.message}`);
      }
    }

    results.core.push(`[Logout] Logging out`);
    await page.goto(`${URL}/api/auth/signout`);
    await page.waitForSelector('button[type="submit"]');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    results.core.push(`[Logout] Success`);

    results.core.push(`[Try Protected Route] Navigating to /departments`);
    const res = await page.goto(`${URL}/departments`);
    results.core.push(`[Try Protected Route] URL: ${page.url()}`);
    if (page.url().includes('/login') || res.status() === 401) {
      results.core.push(`[Try Protected Route] Blocked successfully`);
    } else {
      results.core.push(`[Try Protected Route] FAIL. Was able to access.`);
    }

  } catch (err) {
    results.core.push(`[FATAL] Error: ${err.message}`);
  }

  await browser.close();

  console.log(JSON.stringify(results, null, 2));
}

run();
