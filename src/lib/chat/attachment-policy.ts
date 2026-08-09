import { createHash } from 'crypto';
import path from 'path';

export const MAX_CHAT_ATTACHMENTS = 5;
export const MAX_CHAT_ATTACHMENT_BYTES = 20 * 1024 * 1024;

const SAFE_ATTACHMENT_ERROR_PREFIXES = [
  'Invalid attachment filename',
  'Invalid JSON attachment',
  'Invalid JSONL attachment',
  'Unsupported attachment extension:',
  'Attachment is empty',
  'Attachment exceeds the 20 MB limit',
  'Declared MIME does not match the file extension',
  'MIME spoofing detected:',
  'Duplicate attachment:',
  'Upload cancelled',
];

export function normalizeAttachmentError(error: unknown): { message: string; status: number } {
  const raw = error instanceof Error ? error.message : '';
  if (SAFE_ATTACHMENT_ERROR_PREFIXES.some((prefix) => raw.startsWith(prefix))) {
    return { message: raw.slice(0, 240), status: raw.includes('cancelled') ? 499 : 400 };
  }
  return { message: 'Attachment upload failed', status: 500 };
}

const ALLOWED: Record<string, string[]> = {
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.gif': ['image/gif'],
  '.webp': ['image/webp'],
  '.mp4': ['video/mp4'],
  '.webm': ['video/webm'],
  '.pdf': ['application/pdf'],
  '.txt': ['text/plain'],
  '.md': ['text/markdown', 'text/plain'],
  '.json': ['application/json', 'text/json', 'text/plain'],
  '.jsonl': ['application/x-ndjson', 'application/jsonl', 'text/plain'],
  '.csv': ['text/csv', 'application/csv', 'text/plain'],
  '.ts': ['text/plain', 'text/typescript', 'application/typescript'],
  '.tsx': ['text/plain', 'text/typescript', 'application/typescript'],
  '.js': ['text/plain', 'text/javascript', 'application/javascript'],
  '.jsx': ['text/plain', 'text/javascript', 'application/javascript'],
  '.py': ['text/plain', 'text/x-python', 'application/x-python-code'],
};

export interface AttachmentValidationInput {
  name: string;
  declaredMime: string;
  bytes: Buffer;
}

export interface ValidatedAttachment {
  fileName: string;
  originalName: string;
  extension: string;
  declaredMime: string;
  detectedMime: string;
  size: number;
  contentHash: string;
  category: 'image' | 'video' | 'pdf' | 'text';
  textPreview?: string;
  chunkCount: number;
}

export function sanitizeAttachmentName(name: string): string {
  const base = path.win32.basename(path.posix.basename(name)).replace(/[\u0000-\u001f<>:"/\\|?*]/g, '_');
  const normalized = base.replace(/\s+/g, ' ').trim().slice(0, 180);
  if (!normalized || normalized === '.' || normalized === '..') throw new Error('Invalid attachment filename');
  return normalized;
}

function detectMime(bytes: Buffer, extension: string): string {
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.subarray(0, 6).toString('ascii').match(/^GIF8[79]a$/)) return 'image/gif';
  if (bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (bytes.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
  if (bytes.subarray(4, 8).toString('ascii') === 'ftyp') return 'video/mp4';
  if (bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return 'video/webm';
  if (['.txt', '.md', '.json', '.jsonl', '.csv', '.ts', '.tsx', '.js', '.jsx', '.py'].includes(extension)) {
    const decoded = bytes.toString('utf8');
    if (!decoded.includes('\uFFFD') && !decoded.includes('\u0000')) {
      if (extension === '.json') {
        try { JSON.parse(decoded); return 'application/json'; } catch { throw new Error('Invalid JSON attachment'); }
      }
      if (extension === '.jsonl') {
        const valid = decoded.split(/\r?\n/).filter(Boolean).every((line) => {
          try { JSON.parse(line); return true; } catch { return false; }
        });
        if (!valid) throw new Error('Invalid JSONL attachment');
        return 'application/x-ndjson';
      }
      return extension === '.csv' ? 'text/csv' : extension === '.md' ? 'text/markdown' : 'text/plain';
    }
  }
  return 'application/octet-stream';
}

export function validateChatAttachment(input: AttachmentValidationInput): ValidatedAttachment {
  const originalName = input.name;
  const fileName = sanitizeAttachmentName(originalName);
  const extension = path.extname(fileName).toLowerCase();
  const allowedMimes = ALLOWED[extension];
  if (!allowedMimes) throw new Error(`Unsupported attachment extension: ${extension || 'none'}`);
  if (input.bytes.length === 0) throw new Error('Attachment is empty');
  if (input.bytes.length > MAX_CHAT_ATTACHMENT_BYTES) throw new Error('Attachment exceeds the 20 MB limit');
  if (!allowedMimes.includes(input.declaredMime)) throw new Error('Declared MIME does not match the file extension');
  const detectedMime = detectMime(input.bytes, extension);
  const compatible =
    allowedMimes.includes(detectedMime) ||
    (allowedMimes.includes('text/plain') && detectedMime.startsWith('text/')) ||
    (extension === '.jsonl' && detectedMime === 'application/x-ndjson');
  if (!compatible) throw new Error(`MIME spoofing detected: content is ${detectedMime}`);
  const category: ValidatedAttachment['category'] =
    detectedMime.startsWith('image/') ? 'image' :
    detectedMime.startsWith('video/') ? 'video' :
    detectedMime === 'application/pdf' ? 'pdf' : 'text';
  const text = category === 'text' ? input.bytes.toString('utf8') : undefined;
  return {
    fileName,
    originalName,
    extension,
    declaredMime: input.declaredMime,
    detectedMime,
    size: input.bytes.length,
    contentHash: createHash('sha256').update(input.bytes).digest('hex'),
    category,
    textPreview: text?.slice(0, 64 * 1024),
    chunkCount: text ? Math.max(1, Math.ceil(text.length / (64 * 1024))) : 0,
  };
}

export interface ProviderCapabilityProfile {
  providerId: string;
  streaming: boolean | 'UNKNOWN';
  tools: boolean | 'UNKNOWN';
  attachments: {
    text: boolean | 'UNKNOWN';
    image: boolean | 'UNKNOWN';
    video: boolean | 'UNKNOWN';
    pdf: boolean | 'UNKNOWN';
  };
}

export function getProviderCapabilityProfile(providerId: string): ProviderCapabilityProfile {
  const openAiCompatible = ['ollama-cloud', 'openrouter', 'openai', 'openai-thinking', 'gemini', 'groq', 'cerebras', 'glm', 'kimi', 'legal-ai'];
  if (!openAiCompatible.includes(providerId)) {
    return { providerId, streaming: 'UNKNOWN', tools: 'UNKNOWN', attachments: { text: 'UNKNOWN', image: 'UNKNOWN', video: 'UNKNOWN', pdf: 'UNKNOWN' } };
  }
  // The current CompletionRequest carries string messages only. Text extraction is
  // supported; binary multimodal transport is intentionally not invented.
  return { providerId, streaming: false, tools: true, attachments: { text: true, image: false, video: false, pdf: false } };
}

export function assertAttachmentsSupported(
  profile: ProviderCapabilityProfile,
  categories: ValidatedAttachment['category'][],
): void {
  for (const category of categories) {
    const support = profile.attachments[category];
    if (support !== true) throw new Error(`Provider ${profile.providerId} does not verify ${category} attachments (${String(support)})`);
  }
}
