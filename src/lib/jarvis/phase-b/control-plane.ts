import type { PhaseBStateRecord } from './state-store';

export type ControlPlanePersistence = 'supabase' | 'local_fallback' | 'not_applicable';

function ownerId() { return process.env.JARVIS_OWNER_ID?.trim() ?? ''; }

/**
 * Best-effort Supabase/Prisma dual write. The local atomic store remains the
 * offline control plane when credentials or the Phase B migration are absent.
 * Provider tokens, message bodies and transcript content are never copied.
 */
export async function persistPhaseBRecord(record:PhaseBStateRecord):Promise<ControlPlanePersistence> {
  const ownerUserId=ownerId();
  if(!ownerUserId || !process.env.DATABASE_URL?.trim()) return 'local_fallback';
  try {
    const {db}=await import('@/lib/db');
    if(record.kind==='social_draft') {
      await db.contentDraft.upsert({
        where:{id:record.id},
        create:{id:record.id,ownerUserId,platform:String(record.data.platform ?? 'unknown'),title:String(record.data.title ?? 'Без названия'),body:String(record.data.body ?? record.data.title ?? ''),status:record.status,published:false,metadata:JSON.stringify({objective:record.data.objective ?? null})},
        update:{status:record.status,title:String(record.data.title ?? 'Без названия'),published:Boolean(record.data.published),metadata:JSON.stringify({objective:record.data.objective ?? null})},
      });
      return 'supabase';
    }
    if(record.kind==='approval_preview' && record.data.approvalType==='SOCIAL_PUBLISH') {
      await db.publicationJob.upsert({
        where:{id:`publication-${String(record.data.draftId)}`},
        create:{id:`publication-${String(record.data.draftId)}`,ownerUserId,draftId:String(record.data.draftId),provider:String(record.data.service ?? 'Postiz'),status:record.status,approvalRequestId:record.id,metadata:JSON.stringify({target:record.data.target ?? null})},
        update:{status:record.status,approvalRequestId:record.id},
      });
      return 'supabase';
    }
    if(record.kind==='message_draft') {
      const risk=record.data.risk && typeof record.data.risk==='object' ? record.data.risk as Record<string,unknown>:{};
      await db.messageEvent.create({data:{id:record.id,ownerUserId,type:Boolean(risk.requiresEscalation)?'message_escalation':'message_draft_created',payload:JSON.stringify({mode:record.data.mode ?? null,reasons:risk.reasons ?? []})}});
      return 'supabase';
    }
    if(record.kind==='call_session') {
      await db.callSession.upsert({where:{id:record.id},create:{id:record.id,ownerUserId,provider:String(record.data.transport ?? 'livekit'),mode:Boolean(record.data.external)?'external':'local',status:record.status,metadata:JSON.stringify({room:record.data.room ?? null})},update:{status:record.status}});
      return 'supabase';
    }
    if(record.kind==='automation_workflow') {
      const externalWorkflowId=String(record.data.workflowId ?? record.data.id ?? record.id);
      await db.automationWorkflowRef.upsert({where:{ownerUserId_provider_externalWorkflowId:{ownerUserId,provider:'n8n',externalWorkflowId}},create:{id:record.id,ownerUserId,provider:'n8n',externalWorkflowId,name:String(record.data.name ?? externalWorkflowId),status:record.status,lastResult:record.data.result?JSON.stringify(record.data.result):null},update:{status:record.status,lastResult:record.data.result?JSON.stringify(record.data.result):null}});
      return 'supabase';
    }
    return 'not_applicable';
  } catch {
    return 'local_fallback';
  }
}
