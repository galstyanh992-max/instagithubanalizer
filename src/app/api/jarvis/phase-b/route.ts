import { z } from 'zod';
import { err, ok, parseJson, safe } from '@/lib/api';
import { requireJarvisOwner } from '@/lib/jarvis/owner-guard';
import { PHASE_B_COMPONENTS } from '@/lib/jarvis/phase-b/catalog';
import { createLocalCallSession, createSocialApprovalPreview, createSocialDraft, createVideoPlan, prepareMessage, VIDEO_PROFILES } from '@/lib/jarvis/phase-b/centers';
import { phaseBDockerServiceManager } from '@/lib/jarvis/phase-b/docker-service-manager';
import { persistPhaseBRecord } from '@/lib/jarvis/phase-b/control-plane';
import { phaseBStateStore, summarizePhaseBRecords } from '@/lib/jarvis/phase-b/state-store';

export const dynamic = 'force-dynamic';

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action:z.literal('social.draft'), topic:z.string().min(2).max(500), platform:z.string().min(2).max(50), objective:z.string().max(500).optional() }),
  z.object({ action:z.literal('video.plan'), topic:z.string().min(2).max(500), profile:z.enum(VIDEO_PROFILES) }),
  z.object({ action:z.literal('message.prepare'), text:z.string().min(1).max(10_000), mode:z.enum(['MANUAL','DRAFT_ONLY','AUTO_SAFE']), attachmentKnown:z.boolean().optional(), massSend:z.boolean().optional() }),
  z.object({ action:z.literal('call.session'), room:z.string().min(1).max(120), external:z.boolean().optional() }),
  z.object({ action:z.literal('automation.fixture'), name:z.string().min(2).max(120) }),
]);

export const GET = safe(async () => {
  const accessError = await requireJarvisOwner();
  if (accessError) return accessError;
  const records=await phaseBStateStore.list();
  const n8n=await phaseBDockerServiceManager.state('n8n');
  return ok({ components:PHASE_B_COMPONENTS, records, summary:{...summarizePhaseBRecords(records),docker:{running:Number(n8n.running),stopped:Number(n8n.installed && !n8n.running),degraded:Number(n8n.installed && /unhealthy|error/i.test(n8n.status))}}, safety:{ realSocialPostSent:false, massMessagesSent:false, externalCallsMade:false, liveTrading:false, productionDeploy:false } });
});

export const POST = safe(async (request:Request) => {
  const accessError = await requireJarvisOwner();
  if (accessError) return accessError;
  const parsed = actionSchema.safeParse(await parseJson(request));
  if (!parsed.success) return err('Некорректное действие центра Phase B', 400, { issues:parsed.error.flatten() });
  let kind: Parameters<typeof phaseBStateStore.append>[0]['kind'];
  let value: Record<string,unknown>;
  if (parsed.data.action === 'social.draft') {
    const draft=createSocialDraft(parsed.data);
    const approval=createSocialApprovalPreview(draft);
    const [record,approvalRecord]=await phaseBStateStore.appendMany([
      {id:draft.id,kind:'social_draft',status:draft.status,data:draft},
      {id:approval.id,kind:'approval_preview',status:approval.status,data:approval},
      {id:`event-${crypto.randomUUID()}`,kind:'center_event',status:'recorded',data:{type:'publication_approval_required',entityId:draft.id,approvalId:approval.id}},
    ]);
    const persistence=await Promise.all([persistPhaseBRecord(record!),persistPhaseBRecord(approvalRecord!)]);
    return ok({record,approval:approvalRecord,persistence,externalSideEffect:false},{status:201});
  }
  else if (parsed.data.action === 'video.plan') { kind='video_plan'; value=createVideoPlan(parsed.data); }
  else if (parsed.data.action === 'message.prepare') { kind='message_draft'; value=prepareMessage(parsed.data); }
  else if (parsed.data.action === 'call.session') { kind='call_session'; value=createLocalCallSession(parsed.data); }
  else { kind='automation_workflow'; value={ id:`workflow-${crypto.randomUUID()}`, name:parsed.data.name, deterministic:true, status:'fixture_ready', nodes:[{type:'manualTrigger'},{type:'set',value:'JARVIS_PHASE_B_OK'}], externalSideEffects:false }; }
  const id = typeof value.id === 'string' ? value.id : `${kind}-${crypto.randomUUID()}`;
  const status = typeof value.status === 'string' ? value.status : 'saved';
  const records=await phaseBStateStore.appendMany([
    {id,kind,status,data:value},
    {id:`event-${crypto.randomUUID()}`,kind:'center_event',status:'recorded',data:{type:kind==='message_draft' && Boolean((value.risk as {requiresEscalation?:boolean}|undefined)?.requiresEscalation) ? 'message_escalation':`${kind}_created`,entityId:id}},
  ]);
  const persistence=await persistPhaseBRecord(records[0]!);
  return ok({ record:records[0], event:records[1], persistence, externalSideEffect:false }, { status:201 });
});
