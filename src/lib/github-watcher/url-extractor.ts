import type { GitHubRepoCandidate, GitHubWatcherSourceType } from "./types";

const RE = /(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)(?:[/?#].*)?(?=$|[\s)\],.])/gi;

export function extractGitHubCandidates(text: string, source: GitHubWatcherSourceType = "manual_text"): GitHubRepoCandidate[] {
  const t = text || "";
  const seen = new Set<string>();
  const out: GitHubRepoCandidate[] = [];
  const now = new Date().toISOString();
  let m: RegExpExecArray | null;
  RE.lastIndex = 0;
  while ((m = RE.exec(t))) {
    const owner = m[1];
    let repo = m[2].replace(/\.git$/, "");
    if (!owner || !repo) continue;
    if (["orgs", "topics", "search", "sponsors", "marketplace", "settings"].includes(owner.toLowerCase())) continue;
    const normalizedName = `${owner}/${repo}`.toLowerCase();
    if (seen.has(normalizedName)) continue;
    seen.add(normalizedName);
    out.push({
      url: `https://github.com/${owner}/${repo}`,
      owner, repo, normalizedName,
      discoveredFrom: source,
      discoveredAt: now,
    });
  }
  return out;
}
