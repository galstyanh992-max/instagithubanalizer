import { z } from 'zod';
import { err, ok, parseJson, safe } from '@/lib/api';
import { approvalSystem } from '@/lib/approval';
import { requireJarvisOwner } from '@/lib/jarvis/owner-guard';
import { PHASE_B_APPROVAL_TYPES } from '@/lib/jarvis/phase-b/policies';
import { phaseBStateStore } from '@/lib/jarvis/phase-b/state-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  agentId:z.string().min(1), workspaceId:z.string().optional(), taskId:z.string().optional(),
  approvalType:z.enum(PHASE_B_APPROVAL_TYPES), summary:z.string().min(2).max(1_000),
  risk:z.enum(['low','medium','high','critical']).default('high'),
  target:z.string().max(500), reason:z.string().max(1_000), preview:z.unknown().optional(), service:z.string().max(120), account:z.string().max(200).optional(),
});

function approvalCard(value:Record<string,unknown>) {
  const payload=value.payload && typeof value.payload==='object' ? value.payload as Record<string,unknown>:{};
  return {
    ...value,
    title:String(value.title ?? value.summary ?? payload.approvalType ?? 'Подтверждение действия'),
    description:String(value.description ?? value.summary ?? payload.reason ?? ''),
    riskLevel:String(value.riskLevel ?? value.risk ?? 'high').toUpperCase(),
    toolName:String(value.toolName ?? payload.service ?? value.actionType ?? 'JARVIS'),
    command:value.command ?? payload.target ?? null,
  };
}

export const GET = safe(async (request:Request) => {
  const accessError=await requireJarvisOwner(); if(accessError) return accessError;
  const workspaceId=new URL(request.url).searchParams.get('workspaceId') ?? undefined;
  const local=(await phaseBStateStore.list('approval_preview'))
    .filter((record)=>record.status==='pending')
    .map((record)=>approvalCard({id:record.id,status:record.status,createdAt:record.createdAt,updatedAt:record.updatedAt,...record.data}));
  try {
    const persisted=(await approvalSystem.getPending(workspaceId)).map((approval)=>approvalCard(approval as unknown as Record<string,unknown>));
    return ok({approvals:[...local,...persisted],fallbackUsed:false});
  } catch {
    return ok({approvals:local,fallbackUsed:true});
  }
});

export const POST = safe(async (request:Request) => {
  const accessError=await requireJarvisOwner(); if(accessError) return accessError;
  const parsed=schema.safeParse(await parseJson(request));
  if(!parsed.success) return err('Некорректный запрос подтверждения',400,{issues:parsed.error.flatten()});
  const {approvalType,target,reason,preview,service,account,...input}=parsed.data;
  const approval=await approvalSystem.requestApproval({ ...input, actionType:approvalType, payload:{ approvalType,target,reason,preview:preview ?? null,service,account:account ?? null } });
  return ok({ approval, fallbackUsed:false },{status:201});
});
