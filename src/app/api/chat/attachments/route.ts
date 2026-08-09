import { db } from '@/lib/db';
import { err, ok, safe } from '@/lib/api';
import {
  MAX_CHAT_ATTACHMENTS,
  normalizeAttachmentError,
  validateChatAttachment,
} from '@/lib/chat/attachment-policy';
import { deleteAsset, fileToBuffer, uploadAsset } from '@/services/storage.service';

export const runtime = 'nodejs';
const OWNER_ID = 'web-user';
interface AttachmentResponse {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  duplicate: boolean;
}

export const POST = safe(async (req: Request) => {
  const form = await req.formData();
  const files = form.getAll('files').filter((value): value is File => value instanceof File);
  if (files.length === 0) return err('At least one attachment is required', 400);
  if (files.length > MAX_CHAT_ATTACHMENTS) return err(`Maximum ${MAX_CHAT_ATTACHMENTS} attachments`, 400);

  const created: Array<{ id: string; key: string }> = [];
  try {
    const attachments: AttachmentResponse[] = [];
    const batchHashes = new Set<string>();
    for (const file of files) {
      if (req.signal.aborted) throw new Error('Upload cancelled');
      const buffer = await fileToBuffer(file);
      const validated = validateChatAttachment({
        name: file.name,
        declaredMime: file.type || 'application/octet-stream',
        bytes: buffer,
      });
      if (batchHashes.has(validated.contentHash)) throw new Error(`Duplicate attachment: ${validated.fileName}`);
      batchHashes.add(validated.contentHash);

      const existing = await db.chatAttachment.findUnique({
        where: { ownerId_contentHash: { ownerId: OWNER_ID, contentHash: validated.contentHash } },
      });
      if (existing) {
        attachments.push({
          id: existing.id,
          fileName: existing.fileName,
          mimeType: existing.detectedMime,
          size: existing.size,
          url: existing.publicUrl,
          duplicate: true,
        });
        continue;
      }

      const stored = await uploadAsset('files', buffer, validated.fileName, validated.detectedMime);
      if (req.signal.aborted) {
        await deleteAsset('files', stored.key).catch(() => undefined);
        throw new Error('Upload cancelled');
      }
      const record = await db.chatAttachment.create({
        data: {
          ownerId: OWNER_ID,
          fileName: validated.fileName,
          originalName: validated.originalName,
          declaredMime: validated.declaredMime,
          detectedMime: validated.detectedMime,
          size: validated.size,
          contentHash: validated.contentHash,
          bucket: stored.bucket,
          storageKey: stored.key,
          publicUrl: stored.publicUrl,
          metadata: JSON.stringify({
            category: validated.category,
            textPreview: validated.textPreview,
            chunkCount: validated.chunkCount,
          }),
        },
      });
      created.push({ id: record.id, key: record.storageKey });
      attachments.push({
        id: record.id,
        fileName: record.fileName,
        mimeType: record.detectedMime,
        size: record.size,
        url: record.publicUrl,
        duplicate: false,
      });
    }
    return ok({ attachments });
  } catch (error) {
    await Promise.all(created.map(async (item) => {
      await deleteAsset('files', item.key).catch(() => undefined);
      await db.chatAttachment.delete({ where: { id: item.id } }).catch(() => undefined);
    }));
    const normalized = normalizeAttachmentError(error);
    return err(normalized.message, normalized.status);
  }
});
