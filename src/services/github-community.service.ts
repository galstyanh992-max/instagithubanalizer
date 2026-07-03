// AI Jarwisyan — GitHub Community Analyzer
// Анализирует issues и releases через GitHub API

import { env, isGitHubConfigured } from "@/lib/env";

const API = "https://api.github.com";

function authHeaders(): HeadersInit {
  const h: HeadersInit = { Accept: "application/vnd.github+json" };
  if (isGitHubConfigured()) h.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  return h;
}

export const githubCommunityService = {
  async getRecentIssues(owner: string, repo: string) {
    if (!isGitHubConfigured()) {
      return { issues: [], fallback: true, note: "GITHUB_TOKEN не настроен — live данные недоступны" };
    }
    try {
      const res = await fetch(`${API}/repos/${owner}/${repo}/issues?state=open&per_page=10&sort=created`, { headers: authHeaders() });
      if (!res.ok) return { issues: [], fallback: true, note: `GitHub API error ${res.status}` };
      const data = await res.json() as Array<{ title: string; state: string; created_at: string; comments: number; labels: Array<{ name: string }> }>;
      return { issues: data, fallback: false, note: "" };
    } catch {
      return { issues: [], fallback: true, note: "Ошибка получения issues" };
    }
  },

  async getRecentReleases(owner: string, repo: string) {
    if (!isGitHubConfigured()) {
      return { releases: [], fallback: true, note: "GITHUB_TOKEN не настроен" };
    }
    try {
      const res = await fetch(`${API}/repos/${owner}/${repo}/releases?per_page=5`, { headers: authHeaders() });
      if (!res.ok) return { releases: [], fallback: true, note: `GitHub API error ${res.status}` };
      const data = await res.json() as Array<{ tag_name: string; name: string; body: string; published_at: string; prerelease: boolean }>;
      return { releases: data, fallback: false, note: "" };
    } catch {
      return { releases: [], fallback: true, note: "Ошибка получения releases" };
    }
  },

  async summarizeCommunitySignals(repo: { owner: string; name: string; openIssues: number; stars: number }) {
    const [issuesResult, releasesResult] = await Promise.all([
      this.getRecentIssues(repo.owner, repo.name),
      this.getRecentReleases(repo.owner, repo.name),
    ]);

    const openClosedRatio = repo.stars > 0 ? repo.openIssues / repo.stars : 0;
    const commonComplaints = (issuesResult.issues as Array<{ title: string }>).slice(0, 5).map((i) => i.title);

    return {
      recentIssues: issuesResult,
      recentReleases: releasesResult,
      openClosedRatio: Math.round(openClosedRatio * 100) / 100,
      commonComplaints,
      maintenanceSignal: releasesResult.fallback ? "unknown" : releasesResult.releases.length > 0 ? "active" : "stale",
      note: issuesResult.fallback && releasesResult.fallback ? "GITHUB_TOKEN не настроен — данные сообщества недоступны" : "",
    };
  },
};
