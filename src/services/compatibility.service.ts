// AI Jarwisyan — Compatibility service (AMD-aware, Ollama Cloud fallback ONLY)
//
// Per policy:
// - Only "ollama_cloud" is allowed as cloud fallback.
// - CUDA-only repos get low compatibility (my GPU is AMD Radeon RX 580).
// - 8 GB VRAM limits modern LLM / diffusion / video workloads.
// - 64 GB RAM is strong for RAG / OCR / PDF / Docker workloads.
// - Windows 11 may need WSL2/Docker for Linux-first repos.

import {
  MY_PC_PROFILE,
  CLOUD_PROVIDER_POLICY,
  PRICING_NOTE,
} from "@/lib/constants";
import type {
  RepoMetadata,
  CompatibilityResult,
  MyPcProfile,
  RunMode,
  EstimatedLocalPerformance,
} from "@/lib/types";

export interface CompatibilityInput {
  meta: RepoMetadata;
  pcProfile?: Partial<MyPcProfile>;
  /** AI-provided gpuRequired flag (if known) */
  gpuRequired?: boolean;
  /** AI-provided difficulty (LOW/MEDIUM/HIGH) */
  difficulty?: "LOW" | "MEDIUM" | "HIGH";
  /** Whether AI flagged this as CUDA-only */
  cudaOnly?: boolean;
  /** Whether AI flagged this as NVIDIA-only */
  nvidiaOnly?: boolean;
  /** Required VRAM (GB) — from AI analysis if known */
  requiredVramGb?: number;
  /** Required RAM (GB) — from AI analysis if known */
  requiredRamGb?: number;
}

function mergePcProfile(overrides?: Partial<MyPcProfile>): MyPcProfile {
  return { ...MY_PC_PROFILE, ...(overrides ?? {}) };
}

function detectCudaRequirement(meta: RepoMetadata, input: CompatibilityInput): boolean {
  const haystack = (
    meta.description +
    " " +
    meta.readmeText.slice(0, 4000) +
    " " +
    meta.topics.join(" ")
  ).toLowerCase();
  const cudaPatterns = [
    /\bcuda\b/,
    /\bcudnn\b/,
    /\bnccl\b/,
    /\btensorrt\b/,
    /\bnvidia\s+gpu\b/,
    /\bngc\s+nvidia\b/,
    /\bcuda\s+toolkit\b/,
    /\bnvidia-docker\b/,
  ];
  if (input.cudaOnly) return true;
  if (input.gpuRequired) {
    // Check if README explicitly mentions AMD / ROCm / DirectML — if so, not CUDA-only.
    if (/amd|radeon|rocm|directml|opencl/i.test(haystack)) {
      return /cuda/.test(haystack); // CUDA explicit mention still wins
    }
    // Default: GPU-required + no AMD mention = treat as CUDA risk
    return true;
  }
  return cudaPatterns.some((re) => re.test(haystack));
}

function detectNvidiaOnly(meta: RepoMetadata): boolean {
  const haystack = (meta.description + " " + meta.readmeText.slice(0, 2000)).toLowerCase();
  return /nvidia[\s-]only|requires\s+nvidia|nvidia\s+gpu\s+required/.test(haystack);
}

function detectLinuxOnly(meta: RepoMetadata): boolean {
  const haystack = (meta.description + " " + meta.readmeText.slice(0, 2000)).toLowerCase();
  // If README mentions Linux install but no Windows/Docker/WSL2 notes
  const mentionsLinux = /linux|ubuntu|debian|fedora/i.test(haystack);
  const mentionsWindows = /windows|wsl|wsl2/i.test(haystack);
  const mentionsDocker = meta.hasDocker || meta.hasDockerCompose || /docker/i.test(haystack);
  return mentionsLinux && !mentionsWindows && !mentionsDocker;
}

function detectOllamaCompatible(meta: RepoMetadata): boolean {
  const haystack = (meta.description + " " + meta.readmeText.slice(0, 4000) + " " + meta.topics.join(" ")).toLowerCase();
  return /\bollama\b|ollama\s+compatible|llama\.cpp|gguf|ggml/i.test(haystack);
}

function detectCpuOnly(meta: RepoMetadata): boolean {
  const haystack = (meta.description + " " + meta.readmeText.slice(0, 2000)).toLowerCase();
  return /cpu[\s-]only|cpu[\s-]mode|cpu[\s-]inference|runs\s+on\s+cpu|no\s+gpu\s+required/i.test(haystack);
}

export const compatibilityService = {
  check(input: CompatibilityInput): CompatibilityResult {
    const { meta } = input;
    const pc = mergePcProfile(input.pcProfile);

    const bottlenecks: string[] = [];
    const missingDeps: string[] = [];
    const hardwareRisks: string[] = [];
    const softwareRisks: string[] = [];

    const cudaRequired = detectCudaRequirement(meta, input);
    const nvidiaOnly = detectNvidiaOnly(meta);
    const linuxOnly = detectLinuxOnly(meta);
    const ollamaCompatible = detectOllamaCompatible(meta);
    const cpuOnlyAvailable = detectCpuOnly(meta);

    const requiredVram = input.requiredVramGb ?? (cudaRequired ? 8 : 0);
    const requiredRam = input.requiredRamGb ?? 0;
    const isGpuWorkload = cudaRequired || Boolean(input.gpuRequired);

    // ---------- Hardware checks ----------
    if (cudaRequired && !pc.cudaAvailable) {
      bottlenecks.push("Repository requires NVIDIA CUDA, but my GPU is AMD Radeon RX 580 (no CUDA).");
      hardwareRisks.push("CUDA-only: cannot use NVIDIA acceleration.");
    }
    if (nvidiaOnly) {
      bottlenecks.push("Repository explicitly requires NVIDIA GPU.");
      hardwareRisks.push("NVIDIA-only repository.");
    }
    if (isGpuWorkload && pc.vramGb < requiredVram) {
      bottlenecks.push(`My VRAM ${pc.vramGb} GB may be insufficient (estimated required: ${requiredVram} GB).`);
      hardwareRisks.push(`VRAM bottleneck: ${pc.vramGb}/${requiredVram} GB.`);
    }
    if (isGpuWorkload && pc.vramGb <= 8 && requiredVram > 8) {
      bottlenecks.push("8 GB VRAM limits modern LLM / diffusion / video AI workloads.");
    }
    if (requiredRam > 0 && pc.ramGb < requiredRam) {
      bottlenecks.push(`My RAM ${pc.ramGb} GB may be insufficient (estimated required: ${requiredRam} GB).`);
    }
    if (pc.storageFreeGb > 0 && pc.storageFreeGb < 10) {
      bottlenecks.push(`Only ${pc.storageFreeGb} GB free disk — models may not fit.`);
    }

    // ---------- Software checks ----------
    if (linuxOnly && !pc.dockerAvailable && !/windows/i.test(pc.os)) {
      bottlenecks.push("Repository is Linux-first; needs Docker or WSL2 on Windows.");
    }
    if (linuxOnly && /windows/i.test(pc.os) && !pc.dockerAvailable) {
      bottlenecks.push("Windows host without Docker — Linux-first repo may fail to install natively.");
      softwareRisks.push("Linux-only repo without Docker on Windows.");
    }
    if ((meta.hasPyproject || meta.hasRequirements) && !pc.pythonVersion) {
      missingDeps.push("Python version not configured in Settings.");
    }
    if (meta.hasPackageJson && !pc.nodeVersion) {
      missingDeps.push("Node.js version not configured in Settings.");
    }
    if ((meta.hasDocker || meta.hasDockerCompose) && pc.dockerAvailable === false) {
      bottlenecks.push("Docker not available on this machine — Docker install path is blocked.");
    }
    if (pc.dockerAvailable === null && (meta.hasDocker || meta.hasDockerCompose)) {
      missingDeps.push("Docker availability not configured in Settings — please verify.");
    }
    if (pc.gitAvailable === null) {
      missingDeps.push("Git availability not configured in Settings.");
    }

    // ---------- Scoring ----------
    let score = 50;
    // Positive factors
    if (!cudaRequired) score += 15;
    if (cpuOnlyAvailable) score += 15;
    if (meta.hasDocker && pc.dockerAvailable) score += 12;
    if (meta.hasDocker && pc.dockerAvailable === null) score += 6; // possible
    if (ollamaCompatible) score += 10;
    if (pc.ramGb >= 32) score += 8;
    if (pc.ramGb >= 64) score += 4; // strong for RAG/OCR/PDF
    if (pc.storageFreeGb >= 50) score += 5;
    if (meta.hasEnvExample) score += 4;
    if (!isGpuWorkload) score += 6;
    // Negative factors
    if (cudaRequired && !pc.cudaAvailable) score -= 25;
    if (nvidiaOnly) score -= 15;
    if (isGpuWorkload && pc.vramGb < requiredVram) score -= 15;
    if (isGpuWorkload && requiredVram > 8) score -= 10;
    if (linuxOnly && /windows/i.test(pc.os) && !pc.dockerAvailable) score -= 10;
    if (bottlenecks.length > 3) score -= 8;
    if (missingDeps.length > 2) score -= 5;
    score = Math.max(0, Math.min(100, score));

    // ---------- Recommended run mode ----------
    let recommendedRunMode: RunMode;
    if (cpuOnlyAvailable && !cudaRequired) {
      recommendedRunMode = "local_cpu_only";
    } else if (meta.hasDocker && pc.dockerAvailable) {
      recommendedRunMode = "local_docker";
    } else if (ollamaCompatible) {
      recommendedRunMode = "local"; // could fall back to ollama_cloud
    } else if (!cudaRequired && bottlenecks.length === 0) {
      recommendedRunMode = "local";
    } else if (isGpuWorkload && (cudaRequired || pc.vramGb < requiredVram)) {
      // GPU workload that my PC can't handle → Ollama Cloud fallback
      recommendedRunMode = "ollama_cloud";
    } else if (bottlenecks.length > 2) {
      // Many bottlenecks — try Ollama Cloud if applicable, else skip
      recommendedRunMode = ollamaCompatible ? "ollama_cloud" : "skip_local";
    } else {
      recommendedRunMode = "local";
    }

    // ---------- Can run locally ----------
    const canRunLocally =
      (!cudaRequired || cpuOnlyAvailable || (ollamaCompatible && !nvidiaOnly)) &&
      bottlenecks.filter((b) => /CUDA|NVIDIA|VRAM|Linux-first/i.test(b)).length === 0;

    // ---------- Estimated performance ----------
    let estimatedLocalPerformance: EstimatedLocalPerformance;
    if (!canRunLocally) {
      estimatedLocalPerformance = "NOT_RECOMMENDED";
    } else if (cpuOnlyAvailable && !isGpuWorkload) {
      estimatedLocalPerformance = pc.ramGb >= 32 ? "OK" : "SLOW";
    } else if (cudaRequired && !pc.cudaAvailable && cpuOnlyAvailable) {
      // CPU fallback for CUDA repo
      estimatedLocalPerformance = "VERY_SLOW";
    } else if (isGpuWorkload && pc.vramGb < requiredVram) {
      estimatedLocalPerformance = "VERY_SLOW";
    } else if (bottlenecks.length > 0) {
      estimatedLocalPerformance = "SLOW";
    } else {
      estimatedLocalPerformance = "FAST";
    }

    // ---------- Explanation ----------
    const explanationParts: string[] = [];
    if (canRunLocally) {
      explanationParts.push(
        `Your PC (${pc.cpu}, ${pc.ramGb} GB RAM, ${pc.gpu} ${pc.vramGb} GB VRAM) appears compatible.`
      );
    } else {
      explanationParts.push(
        `Your PC cannot run this repo locally. Main reason: ${bottlenecks[0] ?? "unspecified hardware/software mismatch."}`
      );
    }
    if (cudaRequired && !pc.cudaAvailable) {
      explanationParts.push(
        "Repository requires NVIDIA CUDA but your GPU is AMD Radeon RX 580 2048SP — CUDA is unavailable."
      );
    }
    if (cpuOnlyAvailable) {
      explanationParts.push("Repository supports a CPU-only mode (slower but works without GPU).");
    }
    if (meta.hasDocker && pc.dockerAvailable) {
      explanationParts.push("Docker is available — recommended install path.");
    }
    if (linuxOnly && /windows/i.test(pc.os)) {
      explanationParts.push("Repository is Linux-first; use WSL2 or Docker on Windows.");
    }
    if (recommendedRunMode === "ollama_cloud") {
      explanationParts.push(
        "Local run not viable — falling back to Ollama Cloud (the only allowed cloud provider)."
      );
    }
    if (recommendedRunMode === "skip_local") {
      explanationParts.push(
        "Local run not viable and Ollama Cloud is not a suitable fallback for this use case. No other cloud providers are allowed by policy."
      );
    }
    explanationParts.push(
      `Cloud provider policy: only "${CLOUD_PROVIDER_POLICY.allowedProviders[0]}" is allowed.`
    );

    return {
      canRunLocally,
      compatibilityScore: score,
      recommendedRunMode,
      bottlenecks,
      missingDependencies: missingDeps,
      missingDeps: missingDeps,
      hardwareRisks,
      softwareRisks,
      providerPolicy: {
        allowedProviders: CLOUD_PROVIDER_POLICY.allowedProviders,
        selectedProvider: "ollama_cloud",
        otherProvidersDisabled: true,
      },
      estimatedLocalPerformance,
      explanation: explanationParts.join(" "),
    };
  },

  /** Legacy method signature kept for callers that pass PcSpecs. */
  checkCompatibility(
    meta: RepoMetadata,
    _specs: unknown
  ): Pick<CompatibilityResult, "canRunLocally" | "compatibilityScore" | "bottlenecks" | "missingDeps" | "recommendedRunMode" | "explanation"> {
    const r = this.check({ meta });
    return {
      canRunLocally: r.canRunLocally,
      compatibilityScore: r.compatibilityScore,
      bottlenecks: r.bottlenecks,
      missingDeps: r.missingDependencies,
      recommendedRunMode: r.recommendedRunMode,
      explanation: r.explanation,
    };
  },
};

export const PRICING_DISCLAIMER = PRICING_NOTE;
