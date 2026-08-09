import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export type PhaseBRecordKind = 'social_draft' | 'video_plan' | 'message_draft' | 'call_session' | 'automation_workflow' | 'approval_preview' | 'center_event';
export interface PhaseBStateRecord { id:string; kind:PhaseBRecordKind; status:string; data:Record<string,unknown>; createdAt:string; updatedAt:string }
interface PhaseBSnapshot { schemaVersion:1; updatedAt:string; records:PhaseBStateRecord[] }

export class PhaseBStateStore {
  private queue: Promise<void> = Promise.resolve();
  constructor(private readonly path = join(process.cwd(), '.jarvis', 'state', 'phase-b-center.json')) {}

  async list(kind?: PhaseBRecordKind) {
    const snapshot = await this.read();
    return kind ? snapshot.records.filter((record) => record.kind === kind) : snapshot.records;
  }

  async append(record: Omit<PhaseBStateRecord,'createdAt'|'updatedAt'>) {
    return (await this.appendMany([record]))[0]!;
  }

  async appendMany(records: Array<Omit<PhaseBStateRecord,'createdAt'|'updatedAt'>>) {
    let created: PhaseBStateRecord[] = [];
    const operation=this.queue.catch(()=>undefined).then(async()=>{
      const snapshot = await this.read();
      const timestamp = new Date().toISOString();
      created = records.map((record) => ({ ...record, createdAt:timestamp, updatedAt:timestamp }));
      snapshot.records = [...created, ...snapshot.records].slice(0, 2_000);
      snapshot.updatedAt = timestamp;
      await this.write(snapshot);
    });
    this.queue=operation.then(()=>undefined,()=>undefined);
    await operation;
    return created;
  }

  async patch(id: string, patch: Pick<Partial<PhaseBStateRecord>,'status'|'data'>) {
    let updated: PhaseBStateRecord | null = null;
    const operation=this.queue.catch(()=>undefined).then(async()=>{
      const snapshot=await this.read();
      const index=snapshot.records.findIndex((record)=>record.id===id);
      if(index<0) return;
      const current=snapshot.records[index]!;
      updated={ ...current, ...patch, data:patch.data ? { ...current.data, ...patch.data }:current.data, updatedAt:new Date().toISOString() };
      snapshot.records[index]=updated;
      snapshot.updatedAt=updated.updatedAt;
      await this.write(snapshot);
    });
    this.queue=operation.then(()=>undefined,()=>undefined);
    await operation;
    return updated;
  }

  private async read(): Promise<PhaseBSnapshot> {
    try {
      const parsed = JSON.parse(await readFile(this.path, 'utf8')) as PhaseBSnapshot;
      return Array.isArray(parsed.records) ? parsed : { schemaVersion:1, updatedAt:new Date(0).toISOString(), records:[] };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      return { schemaVersion:1, updatedAt:new Date(0).toISOString(), records:[] };
    }
  }

  private async write(snapshot: PhaseBSnapshot) {
    await mkdir(dirname(this.path), { recursive:true });
    const temporary = `${this.path}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporary, JSON.stringify(snapshot, null, 2), { encoding:'utf8', mode:0o600 });
    await rename(temporary, this.path);
  }
}

export const phaseBStateStore = new PhaseBStateStore();

export function summarizePhaseBRecords(records: PhaseBStateRecord[]) {
  const byKind=(kind:PhaseBRecordKind)=>records.filter((record)=>record.kind===kind);
  const social=byKind('social_draft');
  const approvals=byKind('approval_preview');
  const calls=byKind('call_session');
  const videos=byKind('video_plan');
  const workflows=byKind('automation_workflow');
  return {
    automation:{ activeWorkflows:workflows.filter((item)=>['running','active'].includes(item.status)).length, failedWorkflows:workflows.filter((item)=>item.status==='failed').length, total:workflows.length },
    social:{ drafts:social.filter((item)=>item.status==='draft').length, scheduled:social.filter((item)=>item.status==='scheduled').length, approvalPending:approvals.filter((item)=>item.status==='pending' && item.data.approvalType==='SOCIAL_PUBLISH').length, published:social.filter((item)=>item.status==='published').length },
    messages:{ connectedAccounts:0, unread:0, escalations:byKind('message_draft').filter((item)=>Boolean((item.data.risk as {requiresEscalation?:boolean}|undefined)?.requiresEscalation)).length },
    calls:{ active:calls.filter((item)=>item.status==='active').length, recent:calls.length, failed:calls.filter((item)=>item.status==='failed').length },
    video:{ renderQueue:videos.filter((item)=>['planned','queued','rendering'].includes(item.status)).length, readyDrafts:videos.filter((item)=>item.status==='ready').length },
    monitoring:{ watchedSources:0, detectedChanges:0 },
  };
}
