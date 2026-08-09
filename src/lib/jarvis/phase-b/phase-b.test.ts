import { mkdtemp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { runtimeAdapterRegistry } from '@/lib/jarvis/platform/adapter-registry';
import { createCapabilityRecord } from '@/lib/jarvis/platform/capability-registry';
import { PHASE_B_COMPONENTS, validatePhaseBCatalog } from './catalog';
import { aggregateTrendSignals, createLocalCallSession, createSocialApprovalPreview, createSocialDraft, createVideoPlan, prepareMessage } from './centers';
import { phaseBAgentProfiles } from './agent-profiles';
import { approvalForAction, classifyMessageRisk, PHASE_B_SAFETY_DEFAULTS } from './policies';
import { PhaseBStateStore, summarizePhaseBRecords } from './state-store';
import { parseExecutionOutput } from './n8n-workflows';

describe('JARVIS Phase B integration', () => {
  it('registers exactly the 22 inspected repositories with supply-chain SHA', () => {
    expect(PHASE_B_COMPONENTS).toHaveLength(22);
    expect(validatePhaseBCatalog()).toEqual({ valid:true, errors:[] });
    expect(new Set(PHASE_B_COMPONENTS.map((item)=>item.repository)).size).toBe(22);
    expect(PHASE_B_COMPONENTS.every((item)=>item.adapterVersion && item.installDate && item.verifiedAt)).toBe(true);
  });

  it.each(['n8n','postiz','evolution-api','telegram-grammy','livekit-agents','trend-radar','changedetection'])('registers the %s adapter', (id) => {
    const adapter=runtimeAdapterRegistry.get(id);
    expect(adapter).toBeDefined();
    expect(adapter?.metadata()).toMatchObject({id});
  });

  it('exposes required n8n workflow and execution capabilities', () => {
    expect(runtimeAdapterRegistry.get('n8n')?.capabilities()).toEqual(expect.arrayContaining(['automation.workflow.create','automation.workflow.run','automation.execution.inspect']));
  });

  it('uses repository-independent generic capabilities for communication, calls and design', () => {
    expect(runtimeAdapterRegistry.get('evolution-api')?.capabilities()).toContain('message.whatsapp.send');
    expect(runtimeAdapterRegistry.get('telegram-grammy')?.capabilities()).toContain('message.telegram.send');
    expect(runtimeAdapterRegistry.get('livekit-agents')?.capabilities()).toContain('voice.session.create');
    expect(runtimeAdapterRegistry.get('penpot')?.capabilities()).toContain('design.project.open');
  });

  it('requires approval for publishing and production actions', () => {
    expect(approvalForAction('social.publish')).toBe('SOCIAL_PUBLISH');
    expect(approvalForAction('production.deploy')).toBe('PRODUCTION_DEPLOY');
    expect(approvalForAction('financial.action')).toBe('FINANCIAL_ACTION');
    expect(approvalForAction('message.whatsapp.send')).toBe('EXTERNAL_SEND_HIGH_RISK');
    expect(approvalForAction('message.telegram.send')).toBe('EXTERNAL_SEND_HIGH_RISK');
  });

  it('escalates sensitive messages and keeps safe replies as drafts', () => {
    expect(classifyMessageRisk({text:'Верните деньги на банковскую карту'}).requiresEscalation).toBe(true);
    expect(prepareMessage({text:'Добрый день',mode:'DRAFT_ONLY'})).toMatchObject({action:'DRAFT_ONLY',sent:false});
    expect(prepareMessage({text:'Добрый день',mode:'AUTO_SAFE'})).toMatchObject({action:'AUTO_SAFE_SEND_ALLOWED',sent:false});
  });

  it('does not retain the message body in Phase B center state', () => {
    expect(JSON.stringify(prepareMessage({text:'secret-message-body',mode:'DRAFT_ONLY'}))).not.toContain('secret-message-body');
  });

  it('creates social, video and local-call plans without external side effects', () => {
    const draft=createSocialDraft({topic:'JARVIS',platform:'telegram'});
    expect(draft).toMatchObject({status:'draft',approvalRequired:true,published:false});
    expect(createSocialApprovalPreview(draft)).toMatchObject({status:'pending',approvalType:'SOCIAL_PUBLISH',sideEffectExecuted:false});
    expect(createVideoPlan({topic:'JARVIS',profile:'shorts-9:16'})).toMatchObject({status:'planned',externalPublish:false,preview:{kind:'local_storyboard_fixture',cost:'none'}});
    expect(createLocalCallSession({room:'test'})).toMatchObject({status:'simulated',external:false});
  });

  it('aggregates and ranks trend signals without a repository-specific taxonomy', () => {
    expect(aggregateTrendSignals([{source:'a',topic:'AI',score:2},{source:'b',topic:'ai',score:3},{source:'a',topic:'Video',score:1}])[0]).toMatchObject({topic:'AI',score:5,sources:['a','b']});
  });

  it('keeps camera, trading, PSTN, production and mass messaging off', () => {
    expect(PHASE_B_SAFETY_DEFAULTS).toMatchObject({cameraEnabled:false,liveTrading:false,pstnCalls:false,productionDeploy:false,massMessaging:false});
  });

  it('defines ten subordinate agent profiles routed through the provider router', () => {
    expect(phaseBAgentProfiles).toHaveLength(10);
    expect(phaseBAgentProfiles.every((profile)=>profile.providerPolicy==='provider-router' && !profile.isModel)).toBe(true);
  });

  it('maps Phase B programs into the existing capability shape', () => {
    const n8n=PHASE_B_COMPONENTS.find((item)=>item.id==='n8n')!;
    const capability=createCapabilityRecord({id:n8n.id,name:n8n.name,kind:'automation',category:n8n.category,description:n8n.purpose,capabilities:n8n.capabilities});
    expect(capability.kind).toBe('automation');
    expect(capability.capabilities).toContain('automation.workflow.run');
  });

  it('persists center actions atomically instead of resetting them', async () => {
    const root=await mkdtemp(join(tmpdir(),'jarvis-phase-b-'));
    const path=join(root,'state.json');
    const first=new PhaseBStateStore(path);
    await first.append({id:'draft-1',kind:'social_draft',status:'draft',data:{topic:'test'}});
    await first.appendMany([
      {id:'approval-1',kind:'approval_preview',status:'pending',data:{approvalType:'SOCIAL_PUBLISH'}},
      {id:'message-1',kind:'message_draft',status:'saved',data:{risk:{requiresEscalation:true}}},
    ]);
    await first.patch('approval-1',{status:'approved',data:{sideEffectExecuted:false}});
    const second=new PhaseBStateStore(path);
    const records=await second.list();
    expect(records).toHaveLength(3);
    expect(records.find((record)=>record.id==='approval-1')).toMatchObject({status:'approved',data:{sideEffectExecuted:false}});
    expect(summarizePhaseBRecords(records)).toMatchObject({social:{drafts:1,approvalPending:0,published:0},messages:{escalations:1}});
    expect(JSON.parse(await readFile(path,'utf8')).schemaVersion).toBe(1);
  });

  it('keeps the Phase B cockpit cards and observability summary wired to the local API', async () => {
    const page=await readFile(join(process.cwd(),'src','app','phase-b','page.tsx'),'utf8');
    expect(page).toContain('/api/jarvis/phase-b');
    expect(page).toContain('summary');
    expect(page).toContain('Approval Center');
  });

  it('uses a dedicated loopback-only Docker compose profile without host bind mounts', async () => {
    const compose=await readFile(join(process.cwd(),'infra','phase-b','compose.yaml'),'utf8');
    expect(compose).toContain('127.0.0.1:15678:5678');
    expect(compose).toContain('n8nio/n8n@sha256:3989d9b8ebb77b4ee8f604519eb73e44f4384bfaa689526e0104eed79a237d30');
    expect(compose).toContain('http://127.0.0.1:5678/healthz/readiness');
    expect(compose).toContain('no-new-privileges:true');
    expect(compose).not.toMatch(/[A-Z]:\\|\/home\/[^n]/i);
    expect(compose).not.toContain('/var/run/docker.sock');
  });

  it('parses the balanced n8n result even when CLI diagnostics follow JSON', () => {
    expect(parseExecutionOutput('runner ready\n{\n  "data": {},\n  "status": "success",\n  "finished": true\n}\nrunner stopped')).toMatchObject({status:'success',finished:true});
  });
});
