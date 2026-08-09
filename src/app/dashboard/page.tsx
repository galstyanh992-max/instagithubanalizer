'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { OllamaModelDetails, ProgramRecord, RegistrySummary } from '@/lib/jarvis/platform/types';
import type { RepositoryKnowledgeRecord } from '@/lib/jarvis/capability-intelligence';
import styles from './program-dashboard.module.css';

interface DashboardPayload {
  programs: ProgramRecord[];
  summary: RegistrySummary;
  refreshedAt: string;
}

interface CapabilityCenterPayload {
  summary: {
    physicalCapabilityRecords: number;
    genericCapabilityIdentifiers: number;
    repositoryKnowledge: { total: number; verified: number; referenceOnly: number; candidates: number; quarantined: number; rejected: number };
    automaticInstalls: number;
    automaticActivations: number;
    dashboardReality: { matched: number; checked: number };
  };
  repositories: RepositoryKnowledgeRecord[];
  safeguards: { singleOrchestrator: string; existingCapabilitiesFirst: boolean; autoInstallAllowed: false; autoActivationAllowed: false };
}

const STATUS_LABELS: Record<string, string> = {
  DISCOVERED: 'ОБНАРУЖЕНО', CONFIGURED: 'НАСТРОЕНО', QUARANTINED: 'КАРАНТИН',
  ONLINE: 'В СЕТИ', OFFLINE: 'НЕ В СЕТИ', STOPPED: 'ОСТАНОВЛЕНО',
  DISABLED: 'ОТКЛЮЧЕНО', MISSING: 'НЕ НАЙДЕНО', UNKNOWN: 'НЕИЗВЕСТНО',
  NOT_INSTALLED: 'НЕ УСТАНОВЛЕНО', INSTALLING: 'УСТАНОВКА', INSTALLED: 'УСТАНОВЛЕНО',
  READY: 'ГОТОВО', RUNNING: 'РАБОТАЕТ', DEGRADED: 'ОГРАНИЧЕНО', BLOCKED: 'ЗАБЛОКИРОВАНО',
};

function formatBytes(value: number | null): string {
  if (!value) return '—';
  const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) { size /= 1024; index += 1; }
  return `${size.toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}

export default function Dashboard() {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [capabilityCenter, setCapabilityCenter] = useState<CapabilityCenterPayload | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionOutput, setActionOutput] = useState<Record<string, string>>({});

  const load = useCallback(async (force = false) => {
    setBusy(force ? 'refresh' : null);
    try {
      const [response, intelligenceResponse] = await Promise.all([
        force
          ? fetch('/api/jarvis/programs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'refresh' }) })
          : fetch('/api/jarvis/programs', { cache: 'no-store' }),
        fetch('/api/jarvis/capability-center', { cache: 'no-store' }),
      ]);
      if (!response.ok || !intelligenceResponse.ok) throw new Error(`Dashboard API returned ${response.status}/${intelligenceResponse.status}`);
      const [data, intelligence] = await Promise.all([response.json(), intelligenceResponse.json()]);
      setPayload(force ? { programs: data.programs, summary: data.summary, refreshedAt: new Date().toISOString() } : data);
      setCapabilityCenter(intelligence);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally { setBusy(null); }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const groups = useMemo(() => {
    const result = new Map<string, ProgramRecord[]>();
    for (const program of payload?.programs ?? []) {
      const list = result.get(program.category) ?? [];
      list.push(program);
      result.set(program.category, list);
    }
    return Array.from(result.entries());
  }, [payload]);

  async function toggle(program: ProgramRecord) {
    setBusy(program.id);
    try {
      const response = await fetch('/api/jarvis/programs', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: program.id, enabled: !program.enabled }),
      });
      if (!response.ok) throw new Error('Не удалось изменить состояние');
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(null); }
  }

  async function test(program: ProgramRecord) {
    setBusy(program.id);
    try {
      const response = await fetch('/api/jarvis/programs', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'test', id: program.id }),
      });
      const data = await response.json();
      if (!response.ok || !data.result?.ok) throw new Error(data.result?.error?.message ?? data.error ?? 'Проверка не пройдена');
      setError('');
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(null); }
  }

  async function lifecycle(program: ProgramRecord, action: 'start' | 'stop' | 'restart') {
    setBusy(program.id);
    try {
      const response = await fetch('/api/jarvis/programs', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, id: program.id }),
      });
      const data = await response.json();
      if (!response.ok || !data.result?.ok) throw new Error(data.result?.error?.message ?? data.error ?? 'Действие не выполнено');
      setError('');
      await load(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(null); }
  }

  async function inspect(program: ProgramRecord, action: 'logs' | 'configuration') {
    setBusy(program.id);
    try {
      const response=await fetch('/api/jarvis/programs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,id:program.id})});
      const data=await response.json();
      if(!response.ok || !data.result?.ok) throw new Error(data.result?.error?.message ?? data.error ?? 'Данные недоступны');
      setActionOutput((current)=>({...current,[program.id]:typeof data.result.output==='string'?data.result.output:JSON.stringify(data.result.output,null,2)}));
      setExpanded(program.id);
    } catch(reason){setError(reason instanceof Error?reason.message:String(reason));}
    finally{setBusy(null);}
  }

  const summary = payload?.summary;

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>J.A.R.V.I.S. / ЦЕНТР ВОЗМОЖНОСТЕЙ</p>
          <h1>Панель программ</h1>
          <p className={styles.subtitle}>Живой реестр локальных программ, провайдеров, агентов и сервисов</p>
        </div>
        <button className={styles.refresh} onClick={() => void load(true)} disabled={busy === 'refresh'}>
          {busy === 'refresh' ? 'СКАНИРОВАНИЕ…' : 'ОБНОВИТЬ РЕЕСТР'}
        </button>
      </header>

      <section className={styles.summary} aria-label="Сводка">
        {[
          ['ВСЕГО', summary?.total ?? 0], ['УСТАНОВЛЕНО', summary?.installed ?? 0],
          ['ВКЛЮЧЕНО', summary?.enabled ?? 0], ['РАБОТАЕТ', summary?.running ?? 0],
          ['ИСПРАВНО', summary?.healthy ?? 0], ['НЕ НАЙДЕНО', summary?.missing ?? 0],
        ].map(([label, value]) => <div key={String(label)}><span>{label}</span><strong>{value}</strong></div>)}
      </section>

      {error && <div className={styles.error} role="alert">ОШИБКА: {error}</div>}
      {!payload && !error && <div className={styles.loading}>ОБНАРУЖЕНИЕ КОМПОНЕНТОВ…</div>}

      {capabilityCenter && (
        <section className={styles.capabilityCenter} aria-label="Capability Center">
          <div className={styles.centerHeader}>
            <div>
              <p className={styles.eyebrow}>PHASE C / CAPABILITY INTELLIGENCE</p>
              <h2>Capability Center</h2>
              <p>Сначала существующие реализации. Репозитории проходят проверку, staging и ручное одобрение.</p>
            </div>
            <span className={styles.orchestrator}>ORCHESTRATOR · {capabilityCenter.safeguards.singleOrchestrator}</span>
          </div>
          <div className={styles.intelligenceSummary}>
            <div><span>ФИЗИЧЕСКИЕ ЗАПИСИ</span><strong>{capabilityCenter.summary.physicalCapabilityRecords}</strong></div>
            <div><span>GENERIC CAPABILITIES</span><strong>{capabilityCenter.summary.genericCapabilityIdentifiers}</strong></div>
            <div><span>REPOSITORY KB</span><strong>{capabilityCenter.summary.repositoryKnowledge.total}</strong></div>
            <div><span>REFERENCE ONLY</span><strong>{capabilityCenter.summary.repositoryKnowledge.referenceOnly}</strong></div>
            <div><span>AUTO INSTALL</span><strong>{capabilityCenter.summary.automaticInstalls}</strong></div>
            <div><span>AUTO ACTIVATE</span><strong>{capabilityCenter.summary.automaticActivations}</strong></div>
            <div><span>REALITY CHECK</span><strong>{capabilityCenter.summary.dashboardReality.matched}/{capabilityCenter.summary.dashboardReality.checked}</strong></div>
          </div>
          <div className={styles.repositoryStrip}>
            {capabilityCenter.repositories.slice(0, 12).map((repository) => (
              <article key={repository.id}>
                <div><b>{repository.name}</b><span data-lifecycle={repository.lifecycle}>{repository.lifecycle}</span></div>
                <p>{repository.capabilities.slice(0, 2).join(' · ')}</p>
                <small>{repository.license} · {repository.integrationMode.toUpperCase()} · {repository.tier}</small>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className={styles.groups}>
        {groups.map(([category, programs]) => (
          <section className={styles.group} key={category}>
            <div className={styles.groupTitle}><span>{category}</span><b>{programs.length}</b></div>
            <div className={styles.grid}>
              {programs.map((program) => {
                const models = program.id === 'ollama-local' && Array.isArray(program.metadata.models)
                  ? program.metadata.models as OllamaModelDetails[] : [];
                const configuration = program.metadata.configuration && typeof program.metadata.configuration === 'object'
                  ? program.metadata.configuration as Record<string, unknown> : null;
                const managedLifecycle = configuration?.lifecycle === 'DOCKER_ON_DEMAND' && program.id === 'n8n';
                return (
                  <article className={`${styles.card} ${!program.enabled ? styles.disabled : ''}`} key={program.id}>
                    <div className={styles.cardHead}>
                      <div>
                        <h2>{program.name}</h2>
                        <p>{program.type.replaceAll('_', ' ')}</p>
                      </div>
                      <span className={styles.status} data-status={program.status}>{STATUS_LABELS[program.status] ?? program.status}</span>
                    </div>
                    <p className={styles.description}>{program.description}</p>
                    <div className={styles.health}><i data-health={program.health} />{program.health_message}</div>
                    <dl className={styles.facts}>
                      <div><dt>Версия</dt><dd>{program.version ?? '—'}</dd></div>
                      <div><dt>Режим</dt><dd>{program.endpoint?.startsWith('http://127.') || program.install_path ? 'Локальный' : 'Облачный'}</dd></div>
                      <div><dt>Задачи</dt><dd>{program.task_count}</dd></div>
                      <div><dt>Успех</dt><dd>{program.task_count ? `${program.success_rate}%` : '—'}</dd></div>
                    </dl>
                    <div className={styles.capabilities}>
                      {program.capabilities.slice(0, 5).map((item) => <span key={item}>{item.replaceAll('_', ' ')}</span>)}
                      {program.capabilities.length > 5 && <span>+{program.capabilities.length - 5}</span>}
                    </div>
                    {expanded === program.id && (
                      <div className={styles.details}>
                        <p><b>Путь:</b> {program.install_path ?? '—'}</p>
                        <p><b>Точка доступа:</b> {program.endpoint ?? '—'}{program.port ? ` · порт ${program.port}` : ''}</p>
                        <p><b>Процесс/контейнер:</b> {program.pid ?? program.docker_container_id ?? '—'}</p>
                        <p><b>CPU / RAM:</b> {program.cpu_usage ?? '—'}% / {program.ram_usage == null ? '—' : `${program.ram_usage}%`}</p>
                        <p><b>Последнее использование:</b> {program.last_used ? new Date(program.last_used).toLocaleString('ru-RU') : '—'}</p>
                        {program.error && <p className={styles.detailError}><b>Ошибка:</b> {program.error}</p>}
                        {models.length > 0 && <div className={styles.models}>
                          <b>Модели Ollama</b>
                          {models.map((model) => <div key={model.name}>
                            <span>{model.name}</span><small>{model.parameter_size ?? '—'} · {model.quantization ?? '—'} · {formatBytes(model.size)}{model.loaded ? ' · ЗАГРУЖЕНА' : ''}</small>
                          </div>)}
                        </div>}
                        {actionOutput[program.id] && <pre className={styles.actionOutput}>{actionOutput[program.id]}</pre>}
                      </div>
                    )}
                    <div className={styles.actions}>
                      <button onClick={() => setExpanded(expanded === program.id ? null : program.id)}>{expanded === program.id ? 'СВЕРНУТЬ' : 'ПОДРОБНЕЕ'}</button>
                      <button onClick={() => void test(program)} disabled={busy === program.id || !program.installed}>ТЕСТ</button>
                      {managedLifecycle && !program.running && <button onClick={() => void lifecycle(program, 'start')} disabled={busy === program.id}>ЗАПУСТИТЬ</button>}
                      {managedLifecycle && program.running && <button onClick={() => void lifecycle(program, 'stop')} disabled={busy === program.id}>ОСТАНОВИТЬ</button>}
                      {managedLifecycle && program.running && <button onClick={() => void lifecycle(program, 'restart')} disabled={busy === program.id}>ПЕРЕЗАПУСТИТЬ</button>}
                      {program.endpoint && <button onClick={() => window.open(program.endpoint!, '_blank', 'noopener,noreferrer')}>ОТКРЫТЬ</button>}
                      <button onClick={() => void inspect(program, 'configuration')} disabled={busy === program.id}>НАСТРОЙКА</button>
                      {managedLifecycle && <button onClick={() => void inspect(program, 'logs')} disabled={busy === program.id}>ЛОГИ</button>}
                      <button onClick={() => void toggle(program)} disabled={busy === program.id}>{program.enabled ? 'ОТКЛЮЧИТЬ' : 'ВКЛЮЧИТЬ'}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
