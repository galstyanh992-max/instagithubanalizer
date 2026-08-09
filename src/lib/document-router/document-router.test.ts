import { describe, expect, it, vi } from 'vitest';
import { DocumentRouter } from './index';
import type { DocumentEngineAdapter } from './types';

function adapter(id: 'opendataloader' | 'docling', succeeds: boolean): DocumentEngineAdapter {
  return {
    id,
    supports: () => true,
    available: async () => ({ available: true, version: 'test', reason: null }),
    convert: vi.fn(async () => { if (!succeeds) throw new Error('conversion failed'); }),
  };
}

describe('DocumentRouter', () => {
  it('выбирает OpenDataLoader для PDF', async () => {
    const primary = adapter('opendataloader', true);
    const fallback = adapter('docling', true);
    const result = await new DocumentRouter([primary, fallback]).convert('.jarvis/smoke/documents/sample.pdf');
    expect(result).toMatchObject({ ok: true, engine: 'opendataloader', fallbackUsed: false });
    expect(primary.convert).toHaveBeenCalledOnce();
    expect(fallback.convert).not.toHaveBeenCalled();
  });

  it('реально переключается на Docling после ошибки первичного движка', async () => {
    const primary = adapter('opendataloader', false);
    const fallback = adapter('docling', true);
    const result = await new DocumentRouter([primary, fallback]).convert('.jarvis/smoke/documents/sample.pdf');
    expect(result).toMatchObject({ ok: true, engine: 'docling', fallbackUsed: true });
    expect(result.warnings[0]).toContain('conversion failed');
  });
});
