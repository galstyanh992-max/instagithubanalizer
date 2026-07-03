// AI Jarwisyan — Security scan service

import type { RepoMetadata, SecurityInfo } from "@/lib/types";

export const securityService = {
  scanSecurity(meta: RepoMetadata, readme: string): SecurityInfo {
    const notes: string[] = [];
    const checks: string[] = [];

    if (meta.archived) {
      notes.push("Repository is archived — no longer maintained. Look for active forks.");
      checks.push("Find a maintained fork before adopting.");
    }
    if (meta.disabled) {
      notes.push("Repository is disabled on GitHub.");
      checks.push("Do not depend on this repo.");
    }
    if (!meta.license || meta.license === "unknown" || meta.license === "none") {
      notes.push("No license file — default copyright applies.");
      checks.push("Clarify license before integration.");
    }

    // README suspicious patterns
    const lowerReadme = (readme || "").toLowerCase();
    const curlBash = /curl\s+[^\s|]+\s*\|\s*(sh|bash|zsh)/i;
    if (curlBash.test(lowerReadme)) {
      notes.push("README contains 'curl | bash' install pattern — inspect the script before running.");
      checks.push("Inspect the install script URL before executing.");
    }
    if (/wget\s+[^\s|]+\s*\|\s*(sh|bash)/i.test(lowerReadme)) {
      notes.push("README contains 'wget | bash' install pattern.");
      checks.push("Inspect the downloaded script before executing.");
    }

    // Suspicious install scripts in package.json-likely content
    if (meta.hasPackageJson && /postinstall|preinstall/i.test(lowerReadme)) {
      notes.push("package.json contains install hooks (postinstall/preinstall) — inspect them.");
      checks.push("Read package.json install hooks before npm install.");
    }

    // Docker privileged mode
    if (/\bprivileged\s*:\s*true\b/i.test(lowerReadme)) {
      notes.push("Docker privileged mode mentioned — grants host-level access.");
      checks.push("Avoid running with --privileged unless absolutely necessary.");
    }

    // Hardcoded secrets patterns
    const secretPattern = /(api[_-]?key|secret|password|token)\s*[:=]\s*['"][A-Za-z0-9]{20,}['"]/i;
    if (secretPattern.test(readme || "")) {
      notes.push("Possible hardcoded secret in README — verify it is an example only.");
      checks.push("Confirm any visible tokens are placeholders, not real secrets.");
    }

    if (meta.openIssues > 500) {
      notes.push(`High open-issue count (${meta.openIssues}) — may indicate maintenance issues.`);
      checks.push("Scan recent issues for security reports.");
    }

    if (notes.length === 0) {
      notes.push("No obvious red flags detected in metadata and README.");
    }
    if (checks.length === 0) {
      checks.push("Read the top 10 most-recent commits for unexpected changes.");
    }

    const hasRisk = notes.some((n) => /privileged|hardcoded|curl\s*\|\s*(sh|bash)|disabled/i.test(n));
    const hasReview = notes.some((n) => /install hook|high open-issue|no license/i.test(n));
    const status: SecurityInfo["status"] = hasRisk ? "RISK" : hasReview ? "REVIEW" : "SAFE";

    return { status, notes };
  },
};
