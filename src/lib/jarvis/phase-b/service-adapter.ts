import type { AdapterExecutionRequest, AdapterExecutionResult, AdapterHealth, AdapterStatus, JarvisRuntimeAdapter } from '@/lib/jarvis/platform/adapter-contract';
import type { PhaseBComponent } from './catalog';
import { PHASE_B_COMPONENTS } from './catalog';
import { approvalForAction } from './policies';
import { phaseBDockerServiceManager } from './docker-service-manager';
import { n8nWorkflowController, SAFE_FIXTURE_WORKFLOW_ID } from './n8n-workflows';

const now = () => new Date().toISOString();
const duration = (started: number) => Date.now() - started;
const ACTION_ALIASES:Record<string,string>={
  'workflow.list':'automation.workflow.list','workflow.get':'automation.workflow.get','workflow.create':'automation.workflow.create',
  'workflow.update':'automation.workflow.update','workflow.run':'automation.workflow.run','workflow.stop':'automation.workflow.stop',
  'workflow.status':'automation.workflow.status','execution.list':'automation.execution.list','execution.inspect':'automation.execution.inspect',
  'telegram.updates':'message.telegram.read','telegram.draft':'message.telegram.draft','telegram.send':'message.telegram.send',
};

async function probe(endpoint: string): Promise<AdapterHealth> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetch(endpoint, { cache:'no-store', signal:controller.signal });
    return { state:response.ok ? 'HEALTHY':'DEGRADED', message:`HTTP ${response.status}`, checkedAt:now(), latencyMs:duration(started) };
  } catch (error) {
    return { state:'UNHEALTHY', message:error instanceof Error ? error.message : String(error), checkedAt:now(), latencyMs:duration(started) };
  } finally { clearTimeout(timer); }
}

export class PhaseBServiceAdapter implements JarvisRuntimeAdapter {
  constructor(readonly component: PhaseBComponent) {}

  metadata() {
    return { id:this.component.id, name:this.component.name, kind:this.component.kind, description:this.component.purpose, source:`phase-b:${this.component.canonicalRepository}` };
  }

  capabilities() { return this.component.capabilities; }

  private credentialsConfigured() {
    return this.component.env.length === 0 || this.component.env.every((name) => Boolean(process.env[name]?.trim()));
  }

  private defaultEnabled() {
    return ['CORE_ENABLED','ENABLED_ON_DEMAND','DOCKER_ON_DEMAND'].includes(this.component.lifecycle) && this.component.securityVerdict !== 'QUARANTINED';
  }

  async health(): Promise<AdapterHealth> {
    if (this.component.securityVerdict === 'QUARANTINED') return { state:'UNHEALTHY', message:'Компонент помещён в карантин', checkedAt:now() };
    if (this.component.id === 'n8n') {
      const state = await phaseBDockerServiceManager.state('n8n');
      if (!state.running) return { state:'UNKNOWN', message:'Установлен профиль on-demand; контейнер остановлен', checkedAt:now() };
      return probe('http://127.0.0.1:15678/healthz/readiness');
    }
    if (!this.credentialsConfigured()) return { state:'MISSING', message:`Не настроено: ${this.component.env.join(', ')}`, checkedAt:now() };
    if (this.component.endpoint && this.component.endpoint.startsWith('http://127.0.0.1')) return probe(this.component.endpoint);
    if (this.component.mode === 'api' || this.component.mode === 'remote') return { state:'DEGRADED', message:'Адаптер готов; проверка сервиса требует настроенной конечной точки', checkedAt:now() };
    return { state:'UNKNOWN', message:'Компонент зарегистрирован и отключён до запуска по запросу', checkedAt:now() };
  }

  async version() { return this.component.version; }

  async configuration() {
    const docker = this.component.id === 'n8n' ? await phaseBDockerServiceManager.state('n8n') : null;
    return {
      lifecycle:this.component.lifecycle,
      mode:this.component.mode,
      endpoint:this.component.endpoint,
      port:this.component.port,
      repository:this.component.canonicalRepository,
      sourceRepository:this.component.repository,
      commitSha:this.component.commitSha,
      license:this.component.license,
      securityVerdict:this.component.securityVerdict,
      adapterVersion:this.component.adapterVersion,
      installDate:this.component.installDate,
      verifiedAt:this.component.verifiedAt,
      requiredConfiguration:this.component.env.map((name) => ({ name, configured:Boolean(process.env[name]?.trim()) })),
      docker,
    };
  }

  async status(): Promise<AdapterStatus> {
    if (this.component.id === 'n8n') {
      const state = await phaseBDockerServiceManager.state('n8n');
      return { installed:state.installed, enabled:true, running:state.running, state:state.running ? 'RUNNING':'STOPPED' };
    }
    const configured = this.credentialsConfigured();
    const enabled = this.defaultEnabled() && configured;
    return { installed:enabled, enabled, running:false, state:this.component.securityVerdict === 'QUARANTINED' ? 'QUARANTINED' : enabled ? 'READY' : configured ? 'DISABLED':'NOT_CONFIGURED' };
  }

  async metrics() { return { task_count:0, success_rate:null, last_used:null, idle_stop_minutes:this.component.lifecycle === 'DOCKER_ON_DEMAND' ? 20:null }; }

  private async ensureN8nReady() {
    const current=await phaseBDockerServiceManager.state('n8n');
    if(!current.running) await phaseBDockerServiceManager.start('n8n');
    const deadline=Date.now()+180_000;
    while(Date.now()<deadline) {
      const health=await probe('http://127.0.0.1:15678/healthz/readiness');
      if(health.state==='HEALTHY') return health;
      await new Promise((resolve)=>setTimeout(resolve,1_000));
    }
    throw new Error('n8n запущен, но readiness не подтверждён за 180 секунд');
  }

  async execute(request: AdapterExecutionRequest): Promise<AdapterExecutionResult> {
    const started = Date.now();
    const action=ACTION_ALIASES[request.action] ?? request.action;
    if (request.action === 'health' || request.action === 'test') { const health=await this.health(); return { ok:health.state === 'HEALTHY', output:health, durationMs:duration(started) }; }
    if (request.action === 'status') return { ok:true, output:await this.status(), durationMs:duration(started) };
    if (request.action === 'configuration') return { ok:true, output:await this.configuration(), durationMs:duration(started) };
    if (request.action === 'logs' && this.component.id === 'n8n') return { ok:true, output:{ logs:await phaseBDockerServiceManager.logs('n8n') }, durationMs:duration(started) };
    if (this.component.id === 'n8n') {
      if(action==='automation.workflow.run' && request.input?.id!==SAFE_FIXTURE_WORKFLOW_ID) {
        return {ok:false,error:{code:'APPROVAL_REQUIRED',message:'Запуск произвольного n8n workflow требует привязанного подтверждения',retryable:false},output:{approvalType:'EXTERNAL_SEND_HIGH_RISK',preview:{workflowId:request.input?.id ?? null}},durationMs:duration(started)};
      }
      if(action.startsWith('automation.')) await this.ensureN8nReady();
      const input=request.input ?? {};
      if (action === 'automation.workflow.list') return {ok:true,output:await n8nWorkflowController.list(),durationMs:duration(started)};
      if (action === 'automation.workflow.get' || action === 'automation.workflow.status') return {ok:true,output:await n8nWorkflowController.get(input.id),durationMs:duration(started)};
      if (action === 'automation.workflow.create' || action === 'automation.workflow.update') return {ok:true,output:await n8nWorkflowController.importSafeFixture(),durationMs:duration(started)};
      if (action === 'automation.workflow.run') return {ok:true,output:await n8nWorkflowController.run(input.id),durationMs:duration(started)};
      if (action === 'automation.workflow.stop') return {ok:true,output:{id:input.id,running:false,message:'CLI workflow завершает детерминированный запуск синхронно'},durationMs:duration(started)};
      if (action === 'automation.execution.list') return {ok:true,output:await n8nWorkflowController.executions(input.workflowId),durationMs:duration(started)};
      if (action === 'automation.execution.inspect') { const list=await n8nWorkflowController.executions(); return {ok:true,output:list.find((item)=>item.id===input.id) ?? null,durationMs:duration(started)}; }
    }
    if (this.component.id === 'telegram-grammy' && action === 'message.telegram.draft') {
      return { ok:true, output:{ text:String(request.input?.text ?? ''), status:'draft', sent:false }, durationMs:duration(started) };
    }
    if (this.component.id === 'telegram-grammy' && action === 'message.telegram.read') {
      const token=process.env.TELEGRAM_BOT_TOKEN?.trim();
      if (!token) return { ok:false, error:{code:'NOT_CONFIGURED',message:'Не настроен TELEGRAM_BOT_TOKEN',retryable:false}, durationMs:duration(started) };
      try {
        const { Api }=await import('grammy');
        const updates=await new Api(token).getUpdates({limit:Math.min(100,Math.max(1,Number(request.input?.limit ?? 20))),timeout:0});
        return {ok:true,output:{updates,transport:'grammy'},durationMs:duration(started)};
      } catch(error) {
        return {ok:false,error:{code:'TELEGRAM_API_ERROR',message:error instanceof Error?error.message:String(error),retryable:true},durationMs:duration(started)};
      }
    }
    const approvalType = approvalForAction(action) ?? (this.component.approvalActions.includes(action) ? 'EXTERNAL_SEND_HIGH_RISK':null);
    if (approvalType) return { ok:false, error:{ code:'APPROVAL_REQUIRED', message:`Требуется подтверждение: ${approvalType}`, retryable:false }, output:{ approvalType, preview:request.input ?? {} }, durationMs:duration(started) };
    if (!this.component.capabilities.includes(action)) return { ok:false, error:{ code:'UNSUPPORTED_ACTION', message:`Действие ${action} не поддерживается адаптером ${this.component.id}`, retryable:false }, durationMs:duration(started) };
    const status = await this.status();
    if (!status.enabled) return { ok:false, error:{ code:'NOT_CONFIGURED', message:'Интеграция зарегистрирована, но не настроена или отключена', retryable:false }, durationMs:duration(started) };
    return { ok:false, error:{ code:'EXTERNAL_OPERATION_NOT_IMPLEMENTED', message:`Операция ${action} не выдаёт фиктивный успех: нужен настроенный и проверенный API-клиент ${this.component.id}`, retryable:false }, durationMs:duration(started) };
  }

  async start() {
    const started = Date.now();
    if (this.component.id !== 'n8n') return { ok:false, error:{code:'START_NOT_AVAILABLE',message:'Для компонента нет локального lifecycle',retryable:false}, durationMs:duration(started) };
    await phaseBDockerServiceManager.start('n8n');
    const health=await this.ensureN8nReady();
    return { ok:true, output:{state:await phaseBDockerServiceManager.state('n8n'),health}, durationMs:duration(started) };
  }
  async stop() {
    const started = Date.now();
    if (this.component.id !== 'n8n') return { ok:false, error:{code:'STOP_NOT_AVAILABLE',message:'Для компонента нет локального lifecycle',retryable:false}, durationMs:duration(started) };
    return { ok:true, output:await phaseBDockerServiceManager.stop('n8n'), durationMs:duration(started) };
  }
  async restart() {
    const started = Date.now();
    if (this.component.id !== 'n8n') return { ok:false, error:{code:'RESTART_NOT_AVAILABLE',message:'Для компонента нет локального lifecycle',retryable:false}, durationMs:duration(started) };
    return { ok:true, output:await phaseBDockerServiceManager.restart('n8n'), durationMs:duration(started) };
  }
}

export const phaseBServiceAdapters = PHASE_B_COMPONENTS.map((component) => new PhaseBServiceAdapter(component));
