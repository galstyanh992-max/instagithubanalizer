// GET/PATCH /api/settings/pc-profile — read/update the My PC profile (stored on the Setting singleton).

import { db } from "@/lib/db";
import { ok, err, safe, parseJson } from "@/lib/api";
import { pcProfileSchema } from "@/lib/validators";
import { MY_PC_PROFILE } from "@/lib/constants";
import type { MyPcProfile } from "@/lib/types";

export const GET = safe(async () => {
  let s = await db.setting.findUnique({ where: { id: "singleton" } });
  if (!s) {
    s = await db.setting.create({ data: { id: "singleton" } });
  }
  const profile: MyPcProfile = {
    profileName: s.pcProfileName || MY_PC_PROFILE.profileName,
    os: s.os || MY_PC_PROFILE.os,
    systemType: s.pcSystemType || MY_PC_PROFILE.systemType,
    cpu: s.cpu || MY_PC_PROFILE.cpu,
    cpuCoresHint: s.pcCpuNotes || MY_PC_PROFILE.cpuCoresHint,
    ramGb: Number(s.ram) || MY_PC_PROFILE.ramGb,
    gpu: s.gpu || MY_PC_PROFILE.gpu,
    vramGb: Number(s.vram) || MY_PC_PROFILE.vramGb,
    storageTotalGb: s.pcStorageTotalGb || MY_PC_PROFILE.storageTotalGb,
    storageUsedGb: s.pcStorageUsedGb || MY_PC_PROFILE.storageUsedGb,
    storageFreeGb: s.freeDiskGb || MY_PC_PROFILE.storageFreeGb,
    dockerAvailable: s.dockerAvailable,
    pythonVersion: s.pythonVersion || null,
    nodeVersion: s.nodeVersion || null,
    gitAvailable: s.gitAvailable,
    cudaAvailable: s.cudaAvailable,
    cudaNotes: s.pcCudaNotes || MY_PC_PROFILE.cudaNotes,
    rocmAvailable: s.pcRocmAvailable,
    preferredRunMode: s.pcPreferredRunMode || MY_PC_PROFILE.preferredRunMode,
    fallbackRunMode: s.pcFallbackRunMode || MY_PC_PROFILE.fallbackRunMode,
  };
  return ok({ pcProfile: profile });
});

export const PATCH = safe(async (req: Request) => {
  const body = await parseJson(req);
  const parsed = pcProfileSchema.safeParse(body);
  if (!parsed.success) {
    return err("Invalid PC profile input", 400, { issues: parsed.error.flatten() });
  }
  const p = parsed.data;
  const data: Record<string, unknown> = {};
  if (p.profileName !== undefined) data.pcProfileName = p.profileName;
  if (p.os !== undefined) data.os = p.os;
  if (p.systemType !== undefined) data.pcSystemType = p.systemType;
  if (p.cpu !== undefined) data.cpu = p.cpu;
  if (p.cpuCoresHint !== undefined) data.pcCpuNotes = p.cpuCoresHint;
  if (p.ramGb !== undefined) data.ram = String(p.ramGb);
  if (p.gpu !== undefined) data.gpu = p.gpu;
  if (p.vramGb !== undefined) data.vram = String(p.vramGb);
  if (p.storageTotalGb !== undefined) data.pcStorageTotalGb = p.storageTotalGb;
  if (p.storageUsedGb !== undefined) data.pcStorageUsedGb = p.storageUsedGb;
  if (p.storageFreeGb !== undefined) data.freeDiskGb = p.storageFreeGb;
  if (p.dockerAvailable !== undefined) data.dockerAvailable = p.dockerAvailable;
  if (p.pythonVersion !== undefined) data.pythonVersion = p.pythonVersion ?? "";
  if (p.nodeVersion !== undefined) data.nodeVersion = p.nodeVersion ?? "";
  if (p.gitAvailable !== undefined) data.gitAvailable = p.gitAvailable;
  if (p.cudaAvailable !== undefined) data.cudaAvailable = p.cudaAvailable;
  if (p.cudaNotes !== undefined) data.pcCudaNotes = p.cudaNotes;
  if (p.rocmAvailable !== undefined) data.pcRocmAvailable = p.rocmAvailable;
  if (p.preferredRunMode !== undefined) data.pcPreferredRunMode = p.preferredRunMode;
  if (p.fallbackRunMode !== undefined) data.pcFallbackRunMode = p.fallbackRunMode;

  let s = await db.setting.findUnique({ where: { id: "singleton" } });
  if (!s) {
    s = await db.setting.create({ data: { id: "singleton", ...data } });
  } else {
    s = await db.setting.update({ where: { id: "singleton" }, data });
  }
  return ok({ ok: true, pcProfileId: s.id });
});
