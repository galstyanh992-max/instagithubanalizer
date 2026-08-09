import { describe, expect, it } from 'vitest';
import { runtimeAdapterRegistry } from '@/lib/jarvis/platform/adapter-registry';

describe.runIf(process.env.JARVIS_PHASE_B_N8N_E2E === '1')('n8n Docker lifecycle E2E', () => {
  const adapter=runtimeAdapterRegistry.get('n8n')!;

  it('discovers, stops, starts and becomes healthy', async () => {
    expect((await adapter.status()).installed).toBe(true);
    expect((await adapter.stop?.())?.ok).toBe(true);
    expect((await adapter.status()).running).toBe(false);
    expect((await adapter.start?.())?.ok).toBe(true);
    let healthy=false;
    const deadline=Date.now()+180_000;
    while(Date.now()<deadline){
      const result=await adapter.health();
      if(result.state==='HEALTHY'){healthy=true;break;}
      await new Promise((resolve)=>setTimeout(resolve,1_000));
    }
    expect(healthy).toBe(true);
  }, 240_000);

  it('lists and executes the deterministic fixture', async () => {
    const imported=await adapter.execute({action:'automation.workflow.create'});
    expect(imported.ok).toBe(true);
    const list=await adapter.execute({action:'automation.workflow.list'});
    expect(list.ok).toBe(true);
    expect(list.output).toEqual(expect.arrayContaining([expect.objectContaining({id:'jarvisPhaseBSmoke001'})]));
    const run=await adapter.execute({action:'automation.workflow.run',input:{id:'jarvisPhaseBSmoke001'}});
    expect(run.ok).toBe(true);
    expect(run.output).toMatchObject({status:'success',finished:true});
    const executions=await adapter.execute({action:'automation.execution.list',input:{workflowId:'jarvisPhaseBSmoke001'}});
    expect(executions.ok).toBe(true);
    expect(executions.output).toEqual(expect.arrayContaining([expect.objectContaining({status:'success'})]));
  }, 60_000);
});
