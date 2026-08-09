// AI Jarwisyan — API helpers

import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function err(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function safe<T extends (...args: never[]) => Promise<unknown>>(
  fn: T
): (req: Request, ctx?: { params: Promise<Record<string, string>> }) => Promise<Response> {
  return async (req, ctx) => {
    try {
      // @ts-expect-error dynamic
      return (await fn(req, ctx)) as Response;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[api] error:", msg);
      const status = msg.includes("not found")
        ? 404
        : msg.includes("too large")
          ? 413
        : msg.includes("rate limit")
          ? 429
          : msg.includes("forbidden")
            ? 403
            : 500;
      return err(status >= 500 ? "Внутренняя ошибка сервера" : msg, status);
    }
  };
}

export async function parseJson<T = unknown>(req: Request): Promise<T> {
  const maxBytes = 1_048_576;
  const declaredLength = Number(req.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error('request body too large');
  }
  if (!req.body) return {} as T;

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new Error('request body too large');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder().decode(bytes);
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export async function parseParams(
  ctx: { params: Promise<Record<string, string>> } | undefined
): Promise<Record<string, string>> {
  if (!ctx) return {};
  return await ctx.params;
}
