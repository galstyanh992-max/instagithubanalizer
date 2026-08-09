import { db } from '@/lib/db';
import { err, ok, safe } from '@/lib/api';
import { deleteAsset } from '@/services/storage.service';

const OWNER_ID = 'web-user';

export const DELETE = safe(async (_req: Request, ctx?: { params: Promise<Record<string, string>> }) => {
  const id = (await ctx?.params)?.id;
  if (!id) return err('Attachment id is required', 400);
  const attachment = await db.chatAttachment.findFirst({ where: { id, ownerId: OWNER_ID } });
  if (!attachment) return err('Attachment not found', 404);
  await deleteAsset('files', attachment.storageKey);
  await db.chatAttachment.delete({ where: { id } });
  return ok({ removed: true });
});
