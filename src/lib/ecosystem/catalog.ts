import { createHash } from "crypto";

export type CatalogDecision = "ADOPT" | "DUPLICATE" | "QUARANTINE" | "REJECT" | "MANUAL_REVIEW";
export interface RepositoryCatalogEntry { line: number; source: string; canonicalUrl: string; identity: string; decision: CatalogDecision; reason: string; }
export interface CatalogParseResult { entries: RepositoryCatalogEntry[]; invalidLines: number[]; duplicateGroups: Record<string, number[]>; }

const MAX_LINE_BYTES = 16_384;
const EXCLUDED_REPOSITORIES = new Set(['galstyanh992-max/instagithubanalizer']);
function canonicalize(value: string): { canonicalUrl: string; identity: string } | null {
  const trimmed = value.trim();
  const match = trimmed.match(/^(?:https?:\/\/github\.com\/|git@github\.com:)?([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/i);
  if (!match) return null;
  const identity = `${match[1].toLowerCase()}/${match[2].toLowerCase()}`;
  return { canonicalUrl: `https://github.com/${identity}`, identity };
}
function extract(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return null;
  const object = value as Record<string, unknown>;
  return [object.githubUrl, object.github_url, object.url, object.fullName, object.full_name, object.repo, object.repository].find((item): item is string => typeof item === "string") ?? null;
}

export function parseRepositoryCatalog(content: string): CatalogParseResult {
  const entries: RepositoryCatalogEntry[] = [];
  const invalidLines: number[] = [];
  const duplicateGroups: Record<string, number[]> = {};
  content.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    if (!raw.trim()) return;
    if (Buffer.byteLength(raw, "utf8") > MAX_LINE_BYTES) { invalidLines.push(line); return; }
    let candidate: string | null = raw.trim();
    if (raw.trim().startsWith("{")) {
      try { candidate = extract(JSON.parse(raw)); } catch { invalidLines.push(line); return; }
    }
    const canonical = candidate ? canonicalize(candidate) : null;
    if (!canonical) { invalidLines.push(line); return; }
    const existing = duplicateGroups[canonical.identity];
    const excluded = EXCLUDED_REPOSITORIES.has(canonical.identity);
    const decision: CatalogDecision = excluded ? "REJECT" : existing ? "DUPLICATE" : "MANUAL_REVIEW";
    const reason = excluded
      ? "explicitly excluded from the JARVIS external capability catalog"
      : existing ? "canonical repository identity already present" : "requires license, security, and compatibility review";
    const entry: RepositoryCatalogEntry = { line, source: candidate!, ...canonical, decision, reason };
    entries.push(entry);
    duplicateGroups[canonical.identity] = [...(existing ?? []), line];
  });
  return { entries, invalidLines, duplicateGroups: Object.fromEntries(Object.entries(duplicateGroups).filter(([, lines]) => lines.length > 1)) };
}

export function catalogFingerprint(content: string): string { return createHash("sha256").update(content).digest("hex"); }
