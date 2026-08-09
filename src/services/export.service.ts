// AI Jarwisyan — Export service

import type { Repository } from "@/generated/prisma";

type RepoWithRelations = Repository & {
  analyses?: { summary: string; finalRecommendation: string }[];
};

export const exportService = {
  exportJson(repos: RepoWithRelations[]): string {
    return JSON.stringify(
      repos.map((r) => ({
        fullName: r.fullName,
        githubUrl: r.githubUrl,
        description: r.description,
        stars: r.stars,
        forks: r.forks,
        license: r.license,
        primaryLanguage: r.primaryLanguage,
        verdict: r.verdict,
        scores: {
          usefulness: r.usefulnessScore,
          health: r.healthScore,
          compatibility: r.compatibilityScore,
          commercialRisk: r.commercialRiskScore,
          agentOs: r.agentOsScore,
          aiLegal: r.aiLegalScore,
          security: r.securityScore,
          cost: r.costScore,
          finalPriority: r.finalPriorityScore,
        },
        commercialUseStatus: r.commercialUseStatus,
        securityStatus: r.securityStatus,
        gpuRequired: r.gpuRequired,
        difficulty: r.difficulty,
        localRunPossible: r.localRunPossible,
        isWatchlisted: r.isWatchlisted,
        recommendation: r.analyses?.[0]?.finalRecommendation ?? "",
        lastCheckedAt: r.lastCheckedAt,
      })),
      null,
      2
    );
  },

  exportCsv(repos: RepoWithRelations[]): string {
    const headers = [
      "fullName",
      "githubUrl",
      "stars",
      "forks",
      "license",
      "primaryLanguage",
      "verdict",
      "usefulnessScore",
      "healthScore",
      "compatibilityScore",
      "commercialRiskScore",
      "agentOsScore",
      "aiLegalScore",
      "securityScore",
      "costScore",
      "finalPriorityScore",
      "commercialUseStatus",
      "securityStatus",
      "gpuRequired",
      "difficulty",
      "localRunPossible",
      "isWatchlisted",
    ];
    const escape = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = repos.map((r) =>
      [
        r.fullName,
        r.githubUrl,
        r.stars,
        r.forks,
        r.license,
        r.primaryLanguage,
        r.verdict,
        r.usefulnessScore,
        r.healthScore,
        r.compatibilityScore,
        r.commercialRiskScore,
        r.agentOsScore,
        r.aiLegalScore,
        r.securityScore,
        r.costScore,
        r.finalPriorityScore,
        r.commercialUseStatus,
        r.securityStatus,
        r.gpuRequired,
        r.difficulty,
        r.localRunPossible,
        r.isWatchlisted,
      ]
        .map(escape)
        .join(",")
    );
    return [headers.join(","), ...rows].join("\n");
  },

  exportMarkdown(repos: RepoWithRelations[]): string {
    const lines: string[] = [
      "# AI Jarwisyan — Repository Report",
      "",
      `Generated: ${new Date().toISOString()}`,
      "",
      `Total repos: ${repos.length}`,
      "",
      "## Summary Table",
      "",
      "| Repo | Stars | License | Verdict | Final Score |",
      "|------|-------|---------|---------|-------------|",
    ];
    for (const r of repos) {
      lines.push(
        `| [${r.fullName}](${r.githubUrl}) | ${r.stars} | ${r.license} | ${r.verdict} | ${r.finalPriorityScore} |`
      );
    }
    lines.push("");
    for (const r of repos) {
      lines.push(`## ${r.fullName}`, "");
      lines.push(`- **URL**: ${r.githubUrl}`);
      lines.push(`- **Stars**: ${r.stars} | Forks: ${r.forks}`);
      lines.push(`- **License**: ${r.license} (${r.commercialUseStatus})`);
      lines.push(`- **Language**: ${r.primaryLanguage}`);
      lines.push(`- **Verdict**: ${r.verdict}`);
      lines.push(`- **Final Priority Score**: ${r.finalPriorityScore}`);
      lines.push(`- **Description**: ${r.description || "(none)"}`);
      if (r.analyses?.[0]?.finalRecommendation) {
        lines.push("", `**Recommendation**: ${r.analyses[0].finalRecommendation}`);
      }
      lines.push("");
    }
    return lines.join("\n");
  },
};
