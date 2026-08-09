import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

function loadEnv(path) {
  try {
    for (const line of readFileSync(path,'utf8').split(/\r?\n/)) {
      const match=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if(!match || process.env[match[1]]) continue;
      let value=match[2];
      if((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value=value.slice(1,-1);
      process.env[match[1]]=value;
    }
  } catch {}
}

loadEnv('.env');
loadEnv('.env.local');

const base='http://localhost:3000';
const ownerId=process.env.JARVIS_OWNER_ID;
const supabaseUrl=process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
assert(ownerId && supabaseUrl && serviceKey,'Supabase owner test configuration is incomplete');

const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:{user},error:userError}=await admin.auth.admin.getUserById(ownerId);
assert(!userError && user?.email,'JARVIS owner user is unavailable');
const {data:link,error:linkError}=await admin.auth.admin.generateLink({type:'magiclink',email:user.email,options:{redirectTo:`${base}/dashboard`}});
assert(!linkError && link?.properties?.hashed_token,'Could not create a non-delivery E2E login token');
const publicClient=createClient(supabaseUrl,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:verified,error:verifyError}=await publicClient.auth.verifyOtp({type:'magiclink',token_hash:link.properties.hashed_token});
assert(!verifyError && verified.session,'Could not verify the E2E owner session');
const cookieWrites=[];
const ssr=createServerClient(supabaseUrl,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{
  cookies:{getAll(){return [];},setAll(values){cookieWrites.push(...values);}},
});
const {error:sessionError}=await ssr.auth.setSession({access_token:verified.session.access_token,refresh_token:verified.session.refresh_token});
assert(!sessionError && cookieWrites.length>0,'Could not serialize the E2E SSR session');

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.addCookies(cookieWrites.map(({name,value,options})=>({name,value,url:base,httpOnly:options?.httpOnly,secure:options?.secure,sameSite:options?.sameSite==='strict'?'Strict':options?.sameSite==='none'?'None':'Lax'})));
const page=await context.newPage();
page.setDefaultTimeout(90_000);

async function api(body) {
  return page.evaluate(async (payload) => {
    const response=await fetch('/api/jarvis/programs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    return {status:response.status,data:await response.json()};
  },body);
}

try {
  await page.goto(`${base}/dashboard`,{waitUntil:'networkidle',timeout:120_000});
  assert.equal(new URL(page.url()).pathname,'/dashboard','Owner session did not reach Dashboard');

  const card=page.locator('article').filter({has:page.getByRole('heading',{name:'n8n',exact:true})}).first();
  await card.waitFor({state:'visible',timeout:120_000});
  const stop=card.getByRole('button',{name:'ОСТАНОВИТЬ',exact:true});
  if(await stop.isVisible()) await stop.click();
  await page.waitForFunction(() => [...document.querySelectorAll('article')].some((node)=>node.textContent?.includes('n8n') && node.textContent?.includes('ОСТАНОВЛЕНО')),{timeout:120_000});

  const imported=await api({action:'execute',id:'n8n',adapterAction:'automation.workflow.create'});
  assert.equal(imported.status,200);
  assert.equal(imported.data.result?.ok,true,'On-demand n8n workflow import failed');
  const run=await api({action:'execute',id:'n8n',adapterAction:'automation.workflow.run',input:{id:'jarvisPhaseBSmoke001'}});
  assert.equal(run.data.result?.ok,true,'Deterministic n8n workflow failed');
  assert.equal(run.data.result?.output?.status,'success');

  // Dashboard intentionally polls discovery every 15s, so networkidle is not
  // a stable completion signal after lifecycle actions.
  await page.reload({waitUntil:'domcontentloaded',timeout:120_000});
  const runningCard=page.locator('article').filter({has:page.getByRole('heading',{name:'n8n',exact:true})}).first();
  await runningCard.waitFor({state:'visible'});
  const runningText=await runningCard.innerText();
  assert.match(runningText,/РАБОТАЕТ|ГОТОВО|В СЕТИ/);
  assert.match(runningText,/Задачи\s+[1-9]/);
  await runningCard.getByRole('button',{name:'ЛОГИ',exact:true}).click();
  await runningCard.locator('pre').waitFor({state:'visible'});

  await page.goto(`${base}/phase-b`,{waitUntil:'networkidle',timeout:120_000});
  await page.getByRole('button',{name:'СОЗДАТЬ ЧЕРНОВИК',exact:true}).click();
  await page.getByText(/Approval Center/).waitFor({state:'visible'});
  await page.getByRole('button',{name:'ПЛАН ВИДЕО',exact:true}).click();
  await page.getByText(/Внешняя отправка не выполнялась/).waitFor({state:'visible'});
  await page.getByRole('button',{name:'ЛОКАЛЬНАЯ СЕССИЯ',exact:true}).click();

  const message=await page.evaluate(async()=>{
    const response=await fetch('/api/jarvis/phase-b',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'message.prepare',text:'Верните деньги на банковскую карту',mode:'AUTO_SAFE'})});
    return {status:response.status,data:await response.json()};
  });
  assert.equal(message.status,201);
  assert.equal(message.data.record?.data?.risk?.requiresEscalation,true);
  assert.equal(message.data.externalSideEffect,false);

  await page.goto(`${base}/approvals`,{waitUntil:'networkidle',timeout:120_000});
  await page.getByText(/Публикация черновика/).first().waitFor({state:'visible'});

  console.log(JSON.stringify({dashboard:true,n8nLifecycle:true,n8nWorkflow:true,n8nMetrics:true,n8nLogs:true,socialDraft:true,socialApproval:true,messageEscalation:true,videoFixture:true,localCall:true,externalSideEffects:false}));
} catch(error) {
  await page.screenshot({path:'.jarvis/phase-b-browser-e2e-failure.png',fullPage:true}).catch(()=>undefined);
  throw error;
} finally {
  await browser.close();
}
