import { join } from 'node:path';
import { phaseBDockerServiceManager } from './docker-service-manager';
import { phaseBStateStore } from './state-store';
import { persistPhaseBRecord } from './control-plane';

const ID = /^[a-zA-Z0-9_-]{1,80}$/;
export const SAFE_FIXTURE_WORKFLOW_ID = 'jarvisPhaseBSmoke001';
function workflowId(value: unknown) {
  if (typeof value !== 'string' || !ID.test(value)) throw new Error('Некорректный id workflow');
  return value;
}

export function parseExecutionOutput(output: string) {
  const start = output.indexOf('{\n  "data"');
  if (start < 0) throw new Error('n8n не вернул JSON результата');
  let depth=0;
  let quoted=false;
  let escaped=false;
  for(let index=start;index<output.length;index+=1) {
    const character=output[index]!;
    if(escaped){escaped=false;continue;}
    if(character==='\\' && quoted){escaped=true;continue;}
    if(character==='"'){quoted=!quoted;continue;}
    if(quoted) continue;
    if(character==='{') depth+=1;
    if(character==='}') {
      depth-=1;
      if(depth===0) return JSON.parse(output.slice(start,index+1)) as Record<string,unknown>;
    }
  }
  throw new Error('n8n вернул незавершённый JSON результата');
}

export class N8nWorkflowController {
  async list() {
    const output=await phaseBDockerServiceManager.n8nCli(['list:workflow']);
    return output.split(/\r?\n/).filter((line)=>line.includes('|')).map((line)=>{const [id,...name]=line.split('|');return {id,name:name.join('|')};});
  }

  async get(idValue:unknown) {
    const id=workflowId(idValue);
    const path=`/tmp/jarvis-export-${id}.json`;
    await phaseBDockerServiceManager.n8nCli(['export:workflow',`--id=${id}`,`--output=${path}`]);
    const raw=await phaseBDockerServiceManager.n8nCli(['--help']).catch(()=>null);
    // The CLI has no stdout export mode. Keep returned metadata deterministic;
    // detailed content remains available through the n8n UI on loopback.
    return { id, exists:(await this.list()).some((workflow)=>workflow.id===id), exportedTo:path, cliAvailable:Boolean(raw) };
  }

  async importSafeFixture() {
    const local=join(process.cwd(),'infra','phase-b','fixtures','n8n-safe-workflow.json');
    const target='/tmp/jarvis-safe-workflow.json';
    await phaseBDockerServiceManager.copyToN8n(local,target);
    const output=await phaseBDockerServiceManager.n8nCli(['import:workflow',`--input=${target}`]);
    return { id:SAFE_FIXTURE_WORKFLOW_ID, imported:/successfully imported/i.test(output), output };
  }

  async run(idValue:unknown) {
    const id=workflowId(idValue);
    if(id!==SAFE_FIXTURE_WORKFLOW_ID) throw new Error('APPROVAL_REQUIRED: разрешён только проверенный fixture workflow');
    const raw=await phaseBDockerServiceManager.n8nCli(['execute',`--id=${id}`,'--rawOutput'],{brokerPort:5680,timeout:60_000});
    const result=parseExecutionOutput(raw);
    const record=await phaseBStateStore.append({
      id:`n8n-run-${crypto.randomUUID()}`,
      kind:'automation_workflow',
      status:String(result.status ?? 'unknown'),
      data:{workflowId:id,result:{status:result.status ?? 'unknown',finished:Boolean(result.finished),redacted:true}},
    });
    await persistPhaseBRecord(record);
    return result;
  }

  async executions(idValue?:unknown) {
    const workflowIdValue=typeof idValue === 'string' ? workflowId(idValue):null;
    const records=await phaseBStateStore.list('automation_workflow');
    return records.filter((record)=>!workflowIdValue || record.data.workflowId===workflowIdValue);
  }
}

export const n8nWorkflowController=new N8nWorkflowController();
