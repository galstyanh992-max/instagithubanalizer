import { describe, expect, it } from 'vitest';
import {
  assertAttachmentsSupported,
  getProviderCapabilityProfile,
  normalizeAttachmentError,
  sanitizeAttachmentName,
  validateChatAttachment,
} from './attachment-policy';

describe('chat attachment policy', () => {
  it('sanitizes traversal names', () => {
    expect(sanitizeAttachmentName('..\\..\\secret.txt')).toBe('secret.txt');
  });

  it('accepts text and detects duplicates by stable hash', () => {
    const one = validateChatAttachment({ name: 'notes.md', declaredMime: 'text/markdown', bytes: Buffer.from('# Notes') });
    const two = validateChatAttachment({ name: 'copy.md', declaredMime: 'text/markdown', bytes: Buffer.from('# Notes') });
    expect(one.category).toBe('text');
    expect(one.contentHash).toBe(two.contentHash);
  });

  it('rejects MIME spoofing', () => {
    expect(() => validateChatAttachment({
      name: 'fake.png',
      declaredMime: 'image/png',
      bytes: Buffer.from('not an image'),
    })).toThrow(/MIME spoofing/);
  });

  it('rejects oversized files', () => {
    expect(() => validateChatAttachment({
      name: 'large.txt',
      declaredMime: 'text/plain',
      bytes: Buffer.alloc(20 * 1024 * 1024 + 1, 65),
    })).toThrow(/20 MB/);
  });

  it('rejects unverified binary capability while allowing extracted text', () => {
    const profile = getProviderCapabilityProfile('ollama-cloud');
    expect(() => assertAttachmentsSupported(profile, ['image'])).toThrow(/does not verify/);
    expect(() => assertAttachmentsSupported(profile, ['text'])).not.toThrow();
  });

  it('does not expose internal database errors or local paths', () => {
    const normalized = normalizeAttachmentError(
      new Error('Prisma failed at D:\\private\\workspace\\route.ts: table missing'),
    );
    expect(normalized).toEqual({ message: 'Attachment upload failed', status: 500 });
    expect(normalized.message).not.toContain('D:\\');
  });
});
