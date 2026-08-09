'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './phase-b.module.css';

type ComponentRow = { id:string; name:string; category:string; lifecycle:string; securityVerdict:string; capabilities:string[] };
type StateRow = { id:string; kind:string; status:string; createdAt:string; data:Record<string,unknown> };
type CenterSummary = Record<string,Record<string,number>>;

const CENTERS = ['AUTOMATION','SOCIAL','MESSAGING','CALLS','VIDEO','DESIGN','MONITORING','DOCUMENT ARCHIVE','EDGE AI','MOBILE','DEPLOYMENT','SECURITY TOOLS','TRADING RESEARCH'];

export default function PhaseBCentersPage() {
  const [components,setComponents] = useState<ComponentRow[]>([]);
  const [records,setRecords] = useState<StateRow[]>([]);
  const [summary,setSummary] = useState<CenterSummary>({});
  const [active,setActive] = useState('AUTOMATION');
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState('');
  const load = useCallback(async()=>{ const response=await fetch('/api/jarvis/phase-b',{cache:'no-store'}); if(response.ok){const data=await response.json();setComponents(data.components);setRecords(data.records);setSummary(data.summary ?? {});} },[]);
  useEffect(()=>{void load();},[load]);
  const visible=useMemo(()=>components.filter((item)=>item.category===active),[components,active]);

  async function fixture(action:string, body:Record<string,unknown>) {
    setBusy(true); setNotice('');
    try { const response=await fetch('/api/jarvis/phase-b',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,...body})}); const data=await response.json(); if(!response.ok) throw new Error(data.error ?? 'Ошибка'); setNotice(data.approval ? 'Черновик сохранён, подтверждение добавлено в Approval Center. Публикация не выполнялась.':'Действие подготовлено и сохранено. Внешняя отправка не выполнялась.'); await load(); }
    catch(error){setNotice(error instanceof Error ? error.message:String(error));} finally {setBusy(false);}
  }

  return <main className={styles.shell}>
    <header><p>J.A.R.V.I.S. / PHASE B</p><h1>Центры автоматизации и коммуникаций</h1><span>Все внешние действия проходят через единый оркестратор и политику подтверждений.</span></header>
    <nav className={styles.tabs} aria-label="Центры Phase B">{CENTERS.map((name)=><button key={name} data-active={name===active} onClick={()=>setActive(name)}>{name}</button>)}</nav>
    <section className={styles.summary} aria-label="Сводка Phase B">{Object.entries(summary).map(([center,metrics])=><article key={center}><b>{center.toUpperCase()}</b>{Object.entries(metrics).map(([name,value])=><span key={name}>{name.replaceAll(/([A-Z])/g,' $1')}: <strong>{value}</strong></span>)}</article>)}</section>
    {notice && <div className={styles.notice}>{notice}</div>}
    <section className={styles.grid}>{visible.map((item)=><article key={item.id}>
      <div className={styles.cardHead}><h2>{item.name}</h2><b>{item.lifecycle}</b></div>
      <p>{item.securityVerdict}</p><div className={styles.tags}>{item.capabilities.map((cap)=><span key={cap}>{cap}</span>)}</div>
    </article>)}</section>
    <section className={styles.controls}>
      <h2>Безопасные тестовые сценарии</h2>
      <div>
        <button disabled={busy} onClick={()=>void fixture('automation.fixture',{name:'Проверка Phase B'})}>СОЗДАТЬ WORKFLOW</button>
        <button disabled={busy} onClick={()=>void fixture('social.draft',{topic:'Тренды продукта',platform:'telegram'})}>СОЗДАТЬ ЧЕРНОВИК</button>
        <button disabled={busy} onClick={()=>void fixture('message.prepare',{text:'Спасибо! Подготовлю ответ.',mode:'DRAFT_ONLY'})}>ПОДГОТОВИТЬ ОТВЕТ</button>
        <button disabled={busy} onClick={()=>void fixture('video.plan',{topic:'Обзор JARVIS',profile:'shorts-9:16'})}>ПЛАН ВИДЕО</button>
        <button disabled={busy} onClick={()=>void fixture('call.session',{room:'jarvis-local-test'})}>ЛОКАЛЬНАЯ СЕССИЯ</button>
      </div>
    </section>
    <section className={styles.history}><h2>Сохранённые действия</h2>{records.length===0?<p>Действий пока нет.</p>:records.slice(0,20).map((row)=><div key={row.id}><b>{row.kind}</b><span>{row.status}</span><time>{new Date(row.createdAt).toLocaleString('ru-RU')}</time></div>)}</section>
  </main>;
}
