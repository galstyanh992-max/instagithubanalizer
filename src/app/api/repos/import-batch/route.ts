import { NextResponse } from "next/server";
import { parseJson } from "@/lib/api";
import { parseStorageUrl, downloadFromStorage } from "@/lib/supabase-server";
import { env } from "@/lib/env";
import {
  createRepositoryImportBatch,
  getRepositoryImportBatches,
  startRepositoryImportBatch,
} from "@/services/repository-import.service";

export const runtime = "nodejs";
const MAX_IMPORT_FILE_BYTES = 8 * 1024 * 1024;
const MAX_IMPORT_REFS = 1_000;

export async function GET(req: Request) {
  const batchId = new URL(req.url).searchParams.get("batchId") ?? undefined;
  try {
    return NextResponse.json({ batches: await getRepositoryImportBatches(batchId) });
  } catch (error) {
    return NextResponse.json(
      { error: `Не удалось получить состояние импорта: ${error instanceof Error ? error.message : "неизвестная ошибка"}` },
      { status: 500 },
    );
  }
}

/**
 * Parse a Git URL or "owner/repo" shorthand into "owner/repo".
 */
function parseRepoRef(input: string): string | null {
  const s = input.trim();
  if (!s) return null;

  const ssh = s.match(/^git@github\.com:([^/]+)\/([^/]+?)(\.git)?$/);
  if (ssh) return `${ssh[1]}/${ssh[2]}`;

  const https = s.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(\.git)?(?:\/.*)?$/);
  if (https) return `${https[1]}/${https[2]}`;

  const shorthand = s.match(/^([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)$/);
  if (shorthand) return `${shorthand[1]}/${shorthand[2]}`;

  return null;
}

/**
 * Parse JSON or JSONL content into a list of repo refs.
 */
function parseJsonContent(content: string): string[] {
  const refs: string[] = [];
  const trimmed = content.trim();
  if (!trimmed) return refs;

  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim());
  const looksLikeJsonl = lines.every((l) => {
    try {
      JSON.parse(l.trim());
      return true;
    } catch {
      return false;
    }
  });

  if (looksLikeJsonl && lines.length > 1) {
    for (const line of lines) {
      try {
        const obj = JSON.parse(line.trim());
        const ref =
          obj.fullName ?? obj.full_name ?? obj.repo ?? obj.repository ??
          obj.url ?? obj.github_url ?? obj.githubUrl ??
          (typeof obj === "string" ? obj : null);
        if (typeof ref === "string") {
          const parsed = parseRepoRef(ref);
          if (parsed) refs.push(parsed);
        }
      } catch {}
    }
    return refs;
  }

  try {
    const data = JSON.parse(trimmed);
    if (Array.isArray(data)) {
      for (const item of data) {
        if (typeof item === "string") {
          const parsed = parseRepoRef(item);
          if (parsed) refs.push(parsed);
        } else if (item && typeof item === "object") {
          const ref =
            item.fullName ?? item.full_name ?? item.repo ?? item.repository ??
            item.url ?? item.github_url ?? item.githubUrl;
          if (typeof ref === "string") {
            const parsed = parseRepoRef(ref);
            if (parsed) refs.push(parsed);
          }
        }
      }
    } else if (data && typeof data === "object") {
      const ref =
        data.fullName ?? data.full_name ?? data.repo ?? data.repository ??
        data.url ?? data.github_url ?? data.githubUrl;
      if (typeof ref === "string") {
        const parsed = parseRepoRef(ref);
        if (parsed) refs.push(parsed);
      }
    }
    return refs;
  } catch {}

  for (const line of lines) {
    const parsed = parseRepoRef(line.trim());
    if (parsed) refs.push(parsed);
  }
  return refs;
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    let storageUrl = "";
    let originalName = "";
    let text = "";
    let directRefs: string[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
      }
      if (!/\.(json|jsonl|txt)$/i.test(file.name)) {
        return NextResponse.json({ error: "Поддерживаются только .json, .jsonl и .txt" }, { status: 400 });
      }
      if (file.size > MAX_IMPORT_FILE_BYTES) {
        return NextResponse.json({ error: "Файл превышает лимит 8 МБ" }, { status: 413 });
      }
      text = await file.text();
      originalName = file.name.slice(0, 240);
      storageUrl = `local-import:${Date.now()}:${encodeURIComponent(originalName)}`;
    } else {
      const body = await parseJson<{ storageUrl?: unknown; originalName?: unknown; refs?: unknown }>(req);
      originalName = typeof body.originalName === "string" ? body.originalName.slice(0, 240) : "Импорт репозиториев";
      if (Array.isArray(body.refs)) {
        directRefs = body.refs.flatMap((value) => typeof value === "string" ? [value] : []);
        storageUrl = `direct-import:${Date.now()}`;
      } else if (typeof body.storageUrl === "string" && body.storageUrl) {
        storageUrl = body.storageUrl;
        const parsed = parseStorageUrl(storageUrl);
        const buffer = parsed
          ? await downloadFromStorage(parsed.key, parsed.bucket)
          : await downloadFromStorage(storageUrl, env.SUPABASE_STORAGE_BUCKET);
        if (buffer.byteLength > MAX_IMPORT_FILE_BYTES) {
          return NextResponse.json({ error: "Файл превышает лимит 8 МБ" }, { status: 413 });
        }
        text = buffer.toString("utf-8");
      } else {
        return NextResponse.json({ error: "Передайте файл, refs или storageUrl" }, { status: 400 });
      }
    }

    const parsedRefs = directRefs.length > 0
      ? directRefs.flatMap((value) => {
          const parsed = parseRepoRef(value);
          return parsed ? [parsed] : [];
        })
      : parseJsonContent(text);
    const refs = Array.from(new Set(parsedRefs));
    if (refs.length === 0) {
      return NextResponse.json({ error: "В файле не найдено корректных ссылок на репозитории" }, { status: 400 });
    }
    if (refs.length > MAX_IMPORT_REFS) {
      return NextResponse.json({ error: `В одном импорте допускается не более ${MAX_IMPORT_REFS} репозиториев` }, { status: 413 });
    }

    const batch = await createRepositoryImportBatch({ storageUrl, originalName, refs });
    startRepositoryImportBatch(batch.id);
    return NextResponse.json(
      { batchId: batch.id, total: batch.total, status: batch.status },
      { status: 202 },
    );
  } catch (error) {
    console.error("[import-batch] error:", error);
    return NextResponse.json(
      { error: `Импорт не запущен: ${error instanceof Error ? error.message : "неизвестная ошибка"}` },
      { status: 500 },
    );
  }
}
