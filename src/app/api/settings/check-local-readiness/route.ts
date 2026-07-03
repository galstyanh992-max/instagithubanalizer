// POST /api/settings/check-local-readiness — checks if local PC profile is fully configured.

import { db } from "@/lib/db";
import { ok, safe } from "@/lib/api";
import { MY_PC_PROFILE } from "@/lib/constants";

export const POST = safe(async () => {
  let s = await db.setting.findUnique({ where: { id: "singleton" } });
  if (!s) {
    s = await db.setting.create({ data: { id: "singleton" } });
  }
  const missing: string[] = [];
  if (s.dockerAvailable === false || s.dockerAvailable === null) {
    missing.push("dockerAvailable — please verify Docker installation status");
  }
  if (!s.pythonVersion) missing.push("pythonVersion — please fill in Settings");
  if (!s.nodeVersion) missing.push("nodeVersion — please fill in Settings");
  if (s.gitAvailable === null) missing.push("gitAvailable — please fill in Settings");
  if (s.pcRocmAvailable === null && !s.cudaAvailable) {
    missing.push("pcRocmAvailable — please verify ROCm status (or set to false if unavailable)");
  }
  const ready = missing.length === 0;
  return ok({
    ready,
    missing,
    profileSummary: {
      os: s.os || MY_PC_PROFILE.os,
      cpu: s.cpu || MY_PC_PROFILE.cpu,
      ramGb: Number(s.ram) || MY_PC_PROFILE.ramGb,
      gpu: s.gpu || MY_PC_PROFILE.gpu,
      vramGb: Number(s.vram) || MY_PC_PROFILE.vramGb,
      cudaAvailable: s.cudaAvailable,
    },
    recommendations: ready
      ? ["PC profile is complete. Compatibility scoring will be accurate."]
      : [
          "Open /settings and fill in the missing fields.",
          "If Docker is not installed, install Docker Desktop on Windows.",
          "If Python/Node are not installed, install them and verify versions.",
        ],
  });
});
