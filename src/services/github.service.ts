// AI Jarwisyan — GitHub service (server-side only)

import { env, isGitHubConfigured } from "@/lib/env";
import type { RepoMetadata, ExtractedCandidate } from "@/lib/types";

const API = "https://api.github.com";

function authHeaders(): HeadersInit {
  const h: HeadersInit = { Accept: "application/vnd.github+json" };
  if (isGitHubConfigured()) {
    h.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  }
  return h;
}

/** Parse various GitHub URL/text forms into owner/repo. Returns null if not found. */
export function parseGithubUrl(input: string): { owner: string; repo: string } | null {
  if (!input) return null;
  const cleaned = input.trim();

  // Full URL: https://github.com/owner/repo
  const urlMatch = cleaned.match(
    /github\.com\/([A-Za-z0-9][\w.-]{0,38}[A-Za-z0-9])\/([A-Za-z0-9_.-]{1,100})/i
  );
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/i, "") };
  }

  // Shorthand: owner/repo (allow owner === repo, e.g. "ollama/ollama", "cline/cline")
  const shortMatch = cleaned.match(
    /^([A-Za-z0-9][\w.-]{0,38}[A-Za-z0-9])\/([A-Za-z0-9_.-]{1,100})(?:\.git)?$/i
  );
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2].replace(/\.git$/i, "") };
  }

  return null;
}

/** Extract multiple GitHub candidates from free text (OCR output). */
export function extractCandidatesFromText(text: string): ExtractedCandidate[] {
  if (!text) return [];
  const found = new Map<string, { owner: string; repo: string }>();
  const urlRe = /github\.com\/([A-Za-z0-9][\w.-]{0,38}[A-Za-z0-9])\/([A-Za-z0-9_.-]{1,100})/gi;
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(text)) !== null) {
    const owner = m[1];
    const repo = m[2].replace(/\.git$/i, "").replace(/[)\].,;]+$/, "");
    found.set(`${owner}/${repo}`.toLowerCase(), { owner, repo });
  }
  const shortRe = /\b([A-Za-z0-9][\w.-]{0,38}[A-Za-z0-9])\/([A-Za-z0-9_.-]{1,100})\b/g;
  while ((m = shortRe.exec(text)) !== null) {
    const owner = m[1];
    const repo = m[2].replace(/\.git$/i, "").replace(/[)\].,;]+$/, "");
    if (owner.toLowerCase() === repo.toLowerCase()) continue;
    if (["user/repo", "owner/repo", "home/readme"].includes(`${owner}/${repo}`.toLowerCase())) continue;
    found.set(`${owner}/${repo}`.toLowerCase(), { owner, repo });
  }

  return Array.from(found.values()).map(({ owner, repo }) => {
    const fullName = `${owner}/${repo}`;
    return {
      rawText: text.slice(0, 200),
      candidateName: fullName,
      resolvedGithubUrl: `https://github.com/${fullName}`,
      owner,
      repo,
      confidenceScore: 0.85,
      needsManualReview: false,
    };
  });
}

export async function fetchRepoMetadata(
  owner: string,
  repo: string
): Promise<RepoMetadata> {
  const url = `${API}/repos/${owner}/${repo}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (res.status === 404) {
    throw new Error(`Repository ${owner}/${repo} not found`);
  }
  if (res.status === 403) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    if (remaining === "0") {
      throw new Error("GitHub API rate limit exceeded. Set GITHUB_TOKEN in .env.");
    }
    throw new Error(`GitHub API forbidden (403) for ${owner}/${repo}`);
  }
  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status} for ${owner}/${repo}`);
  }
  const data = await res.json();

  let readmeText = "";
  let hasDocker = false;
  let hasDockerCompose = false;
  let hasPackageJson = false;
  let hasRequirements = false;
  let hasPyproject = false;
  let hasEnvExample = false;
  try {
    const readmeRes = await fetch(
      `${API}/repos/${owner}/${repo}/readme`,
      { headers: { ...authHeaders(), Accept: "application/vnd.github.raw" } }
    );
    if (readmeRes.ok) {
      readmeText = await readmeRes.text();
    }
  } catch {
    // ignore
  }
  try {
    const treeRes = await fetch(
      `${API}/repos/${owner}/${repo}/contents`,
      { headers: authHeaders() }
    );
    if (treeRes.ok) {
      const files: Array<{ name: string; type: string }> = await treeRes.json();
      const names = files.map((f) => f.name.toLowerCase());
      hasDocker = names.includes("dockerfile");
      hasDockerCompose =
        names.includes("docker-compose.yml") ||
        names.includes("docker-compose.yaml") ||
        names.includes("compose.yml") ||
        names.includes("compose.yaml");
      hasPackageJson = names.includes("package.json");
      hasRequirements = names.includes("requirements.txt");
      hasPyproject = names.includes("pyproject.toml");
      hasEnvExample =
        names.includes(".env.example") || names.includes("env.example");
    }
  } catch {
    // ignore
  }

  return {
    owner: data.owner?.login ?? owner,
    name: data.name ?? repo,
    fullName: data.full_name ?? `${owner}/${repo}`,
    githubUrl: data.html_url ?? `https://github.com/${owner}/${repo}`,
    description: data.description ?? "",
    stars: data.stargazers_count ?? 0,
    forks: data.forks_count ?? 0,
    watchers: data.subscribers_count ?? data.watchers_count ?? 0,
    openIssues: data.open_issues_count ?? 0,
    license: data.license?.spdx_id?.toLowerCase() ?? data.license?.key ?? "unknown",
    primaryLanguage: data.language ?? "",
    topics: data.topics ?? [],
    createdAtGithub: data.created_at ?? null,
    updatedAtGithub: data.updated_at ?? null,
    pushedAtGithub: data.pushed_at ?? null,
    archived: Boolean(data.archived),
    disabled: Boolean(data.disabled),
    defaultBranch: data.default_branch ?? "main",
    readmeText,
    hasDocker,
    hasDockerCompose,
    hasPackageJson,
    hasRequirements,
    hasPyproject,
    hasEnvExample,
  };
}

/** Convenience: resolve from a candidate string. */
export async function resolveRepo(input: string): Promise<RepoMetadata> {
  const parsed = parseGithubUrl(input);
  if (!parsed) {
    throw new Error(`Cannot parse GitHub reference: ${input}`);
  }
  return fetchRepoMetadata(parsed.owner, parsed.repo);
}
