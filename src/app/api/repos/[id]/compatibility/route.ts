// POST /api/repos/:id/compatibility — runs compatibility check against current PC profile.

import { db } from "@/lib/db";
import { ok, err, safe, parseParams } from "@/lib/api";
import { compatibilityService } from "@/services/compatibility.service";
import type { RepoMetadata, MyPcProfile } from "@/lib/types";

export const POST = safe(async (_req: Request, ctx) => {
  const { id } = await parseParams(ctx);
  const repo = await db.repository.findUnique({ where: { id } });
  if (!repo) return err("Repository not found", 404);

  // Load PC profile from settings
  let s = await db.setting.findUnique({ where: { id: "singleton" } });
  if (!s) {
    s = await db.setting.create({ data: { id: "singleton" } });
  }
  const pcProfile: Partial<MyPcProfile> = {
    profileName: s.pcProfileName,
    os: s.os,
    systemType: s.pcSystemType,
    cpu: s.cpu,
    cpuCoresHint: s.pcCpuNotes,
    ramGb: Number(s.ram),
    gpu: s.gpu,
    vramGb: Number(s.vram),
    storageTotalGb: s.pcStorageTotalGb,
    storageUsedGb: s.pcStorageUsedGb,
    storageFreeGb: s.freeDiskGb,
    dockerAvailable: s.dockerAvailable,
    pythonVersion: s.pythonVersion || null,
    nodeVersion: s.nodeVersion || null,
    gitAvailable: s.gitAvailable,
    cudaAvailable: s.cudaAvailable,
    cudaNotes: s.pcCudaNotes,
    rocmAvailable: s.pcRocmAvailable,
  };

  const meta: RepoMetadata = {
    owner: repo.owner,
    name: repo.name,
    fullName: repo.fullName,
    githubUrl: repo.githubUrl,
    description: repo.description,
    stars: repo.stars,
    forks: repo.forks,
    watchers: repo.watchers,
    openIssues: repo.openIssues,
    license: repo.license,
    primaryLanguage: repo.primaryLanguage,
    topics: safeParseArr(repo.topics),
    createdAtGithub: repo.createdAtGithub?.toISOString() ?? null,
    updatedAtGithub: repo.updatedAtGithub?.toISOString() ?? null,
    pushedAtGithub: repo.pushedAtGithub?.toISOString() ?? null,
    archived: repo.archived,
    disabled: repo.disabled,
    defaultBranch: repo.defaultBranch,
    readmeText: repo.readmeText,
    hasDocker: repo.hasDocker,
    hasDockerCompose: repo.hasDockerCompose,
    hasPackageJson: repo.hasPackageJson,
    hasRequirements: repo.hasRequirements,
    hasPyproject: repo.hasPyproject,
    hasEnvExample: repo.hasEnvExample,
  };

  const compatibility = compatibilityService.check({
    meta,
    pcProfile,
    gpuRequired: repo.gpuRequired,
    difficulty: repo.difficulty as "LOW" | "MEDIUM" | "HIGH",
  });

  return ok({ compatibility, repoId: id });
});

function safeParseArr(s: string | null | undefined): string[] {
  if (!s) return [];
  try { return JSON.parse(s) as string[]; } catch { return []; }
}
