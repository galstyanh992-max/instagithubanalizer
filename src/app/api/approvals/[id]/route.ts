import { z } from 'zod';
import { err, ok, parseJson, safe } from '@/lib/api';
import { approvalSystem } from '@/lib/approval';
import { requireJarvisOwner } from '@/lib/jarvis/owner-guard';
import { phaseBStateStore } from '@/lib/jarvis/phase-b/state-store';

export const runtime='nodejs';
const schema=z.object({action:z.enum(['approve','reject'])});

export const PATCH=safe(async(request:Request,context?:{params:Promise<Record<string,string>>})=>{
  const accessError=await requireJarvisOwner(); if(accessError) return accessError;
  const id=(await context?.params)?.id; if(!id) return err('Не указан id подтверждения',400);
  const parsed=schema.safeParse(await parseJson(request)); if(!parsed.success) return err('Неизвестное действие',400);
  if(id.startsWith('phase-b-approval-')) {
    const status=parsed.data.action==='approve' ? 'approved':'rejected';
    const approval=await phaseBStateStore.patch(id,{status,data:{decision:status,sideEffectExecuted:false}});
    if(!approval) return err('Подтверждение Phase B не найдено',404);
    return ok({approval,fallbackUsed:true,sideEffectExecuted:false});
  }
  const approval=parsed.data.action==='approve' ? await approvalSystem.approve(id):await approvalSystem.reject(id);
  return ok({approval,fallbackUsed:false});
});
