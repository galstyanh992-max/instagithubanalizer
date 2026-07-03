// AI Jarwisyan — GitHub alternatives finder
// Searches GitHub for CPU-only / no-CUDA / lightweight alternatives.
// Falls back to suggested search queries if GITHUB_TOKEN is not configured.

import { env, isGitHubConfigured } from "@/lib/env";
import { GITHUB_ALTERNATIVE_QUERY_TEMPLATES } from "@/lib/constants";
import type {
  GithubAlternative,
  GithubAlternativesResult,
  RepoMetadata,
  MyPcProfile,
} from "@/lib/types";

const API = "https://api.github.com";

function authHeaders(): HeadersInit {
  const h: HeadersInit = { Accept: "application/vnd.github+json" };
  if (isGitHubConfigured()) {
    h.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  }
  return h;
}

function derivePurpose(meta: RepoMetadata): string {
  // Take description keywords; fall back to name
  const text = (meta.description || meta.name).toLowerCase();
  const stop = new Set([
    "the", "a", "an", "for", "and", "with", "to", "of", "in", "on", "is", "this", "that", "by",
    "ai", "llm", "gpt", "open", "source", "free", "based", "using",
  ]);
  const tokens = text
    .split(/\W+/)
    .filter((t) => t.length > 3 && !stop.has(t))
    .slice(0, 4);
  return tokens.length > 0 ? tokens.join(" ") : meta.name;
}

interface GitHubSearchItem {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  license: { spdx_id: string | null; key: string | null } | null;
}

export const githubAlternativesService = {
  async find(
    meta: RepoMetadata,
    _pc: Partial<MyPcProfile> | undefined
  ): Promise<GithubAlternativesResult> {
    const purpose = derivePurpose(meta);
    const fallbackQueries = GITHUB_ALTERNATIVE_QUERY_TEMPLATES.map((tpl) =>
      tpl.replace("{purpose}", purpose)
    );

    if (!isGitHubConfigured()) {
      return {
        alternatives: [],
        fallbackQueries,
        liveSearchPerformed: false,
        note:
          "GITHUB_TOKEN is not configured. Live GitHub alternatives search was not performed. Use the suggested queries below in GitHub search.",
      };
    }

    // Try the most relevant queries (CPU only, no CUDA, lightweight).
    const primaryQueries = [
      `${purpose} cpu only`,
      `${purpose} no cuda`,
      `${purpose} lightweight`,
      `${purpose} ollama`,
    ];

    const seen = new Set<string>();
    const alternatives: GithubAlternative[] = [];

    for (const q of primaryQueries) {
      if (alternatives.length >= 8) break;
      try {
        const url = `${API}/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=10`;
        const res = await fetch(url, { headers: authHeaders() });
        if (!res.ok) continue;
        const data = (await res.json()) as { items?: GitHubSearchItem[] };
        for (const item of data.items ?? []) {
          if (item.full_name.toLowerCase() === meta.fullName.toLowerCase()) continue;
          if (seen.has(item.full_name.toLowerCase())) continue;
          seen.add(item.full_name.toLowerCase());

          // Heuristic compatibility score for my PC: prefer CPU-friendly signals
          const lowerDesc = (item.description ?? "").toLowerCase();
          const cpuFriendly = /cpu|lightweight|no\s+gpu|offline|local/i.test(lowerDesc);
          const ollamaFriendly = /ollama|llama\.cpp|gguf|ggml/i.test(lowerDesc);
          let estScore = 50;
          if (cpuFriendly) estScore += 20;
          if (ollamaFriendly) estScore += 15;
          if (item.stargazers_count > 1000) estScore += 10;
          if (item.license?.spdx_id && ["MIT", "Apache-2.0", "BSD"].includes(item.license.spdx_id)) {
            estScore += 5;
          }
          estScore = Math.max(0, Math.min(100, estScore));

          alternatives.push({
            fullName: item.full_name,
            githubUrl: item.html_url,
            description: item.description ?? "",
            stars: item.stargazers_count,
            language: item.language ?? "Unknown",
            license: item.license?.spdx_id ?? item.license?.key ?? "unknown",
            whyBetterForMyPc: cpuFriendly
              ? "Documented CPU-only / lightweight mode — works without NVIDIA CUDA."
              : ollamaFriendly
                ? "Ollama / llama.cpp compatible — can run via Ollama Cloud fallback."
                : "More popular alternative worth evaluating.",
            tradeoffs: [
              `Stars: ${item.stargazers_count}`,
              `Language: ${item.language ?? "Unknown"}`,
              `License: ${item.license?.spdx_id ?? "unknown"}`,
            ],
            estimatedCompatibilityScore: estScore,
          });
        }
      } catch {
        // continue to next query
      }
    }

    alternatives.sort((a, b) => b.estimatedCompatibilityScore - a.estimatedCompatibilityScore);

    return {
      alternatives: alternatives.slice(0, 5),
      fallbackQueries,
      liveSearchPerformed: true,
      note: alternatives.length > 0
        ? "Live GitHub search performed. Verify each candidate manually before adoption."
        : "Live GitHub search performed but no candidates surfaced. Use the fallback queries below in GitHub search.",
    };
  },
};
