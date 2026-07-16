import { NextResponse } from "next/server";
import { parseStorageUrl, downloadFromStorage } from "@/lib/supabase-server";
import { analyzeRepoPipeline } from "@/lib/pipeline";
import { env } from "@/lib/env";

export const runtime = "nodejs";

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
    const { storageUrl } = await req.json();
    if (!storageUrl || typeof storageUrl !== "string") {
      return NextResponse.json({ error: "storageUrl is required" }, { status: 400 });
    }

    const parsed = parseStorageUrl(storageUrl);
    const buffer = parsed
      ? await downloadFromStorage(parsed.key, parsed.bucket)
      : await downloadFromStorage(storageUrl, env.SUPABASE_STORAGE_BUCKET);
    const text = buffer.toString("utf-8");
    const refs = Array.from(new Set(parseJsonContent(text)));

    if (refs.length === 0) {
      return NextResponse.json({ error: "No valid repos found" }, { status: 400 });
    }

    const results: Array<
      | ({ ok: true; ref: string } & Awaited<ReturnType<typeof analyzeRepoPipeline>>)
      | { ok: false; ref: string; error: string }
    > = [];
    for (const ref of refs) {
      try {
        const result = await analyzeRepoPipeline(ref, { force: false });
        results.push({ ref, ok: true, ...result });
      } catch (e) {
        results.push({
          ref,
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return NextResponse.json({ refs, results, total: refs.length });
  } catch (error) {
    console.error("[import-batch] error:", error);
    return NextResponse.json(
      { error: `Import failed: ${error instanceof Error ? error.message : "unknown"}` },
      { status: 500 }
    );
  }
}
