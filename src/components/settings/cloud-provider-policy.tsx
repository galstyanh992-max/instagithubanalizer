"use client";

import { useEffect, useState } from "react";
import { HolographicPanel } from "@/components/futuristic/holographic-panel";
import { Lock, Cloud, ShieldCheck, AlertTriangle, ExternalLink } from "lucide-react";

interface PolicyData {
  providerPolicy: {
    allowedProviders: readonly ["ollama_cloud"];
    selectedProvider: "ollama_cloud";
    otherProvidersDisabled: true;
    note: string;
  };
  providerInfo: {
    id: string;
    name: string;
    type: string;
    pricingStatus: string;
    pricingNote: string;
  };
  pricing: {
    provider: string;
    providerName: string;
    status: string;
    note: string;
    checkedAt: string | null;
  };
}

export function CloudProviderPolicy() {
  const [data, setData] = useState<PolicyData | null>(null);

  useEffect(() => {
    fetch("/api/settings/cloud-provider-policy")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => void 0);
  }, []);

  if (!data) return <div className="text-cyan-300 text-sm">Loading...</div>;

  return (
    <HolographicPanel accent="magenta" className="space-y-4 p-5">
      <div className="flex items-center gap-2 text-fuchsia-300">
        <Cloud className="h-4 w-4" />
        <h2 className="font-mono text-xs uppercase tracking-wider">Cloud Provider Policy</h2>
      </div>

      {/* Locked provider card */}
      <div className="rounded-lg border-2 border-fuchsia-400/40 bg-fuchsia-500/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase text-fuchsia-300/80">Provider</div>
            <div className="font-mono text-lg text-fuchsia-100">{data.providerInfo.name}</div>
            <div className="text-[11px] text-zinc-400">{data.providerInfo.type}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-400/60 bg-fuchsia-500/15 px-2 py-1 text-[10px] font-mono text-fuchsia-200">
              <Lock className="h-3 w-3" /> LOCKED
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-lime-400/60 bg-lime-500/15 px-2 py-1 text-[10px] font-mono text-lime-200">
              <ShieldCheck className="h-3 w-3" /> ALLOWED
            </span>
          </div>
        </div>
      </div>

      {/* Notice */}
      <div className="rounded-md border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
        <AlertTriangle className="mr-1 inline h-3 w-3" />
        Only <b>Ollama Cloud</b> is enabled as the cloud fallback provider. Other cloud/GPU providers are
        disabled by policy. You cannot select another provider.
      </div>

      {/* Pricing notice */}
      <div className="rounded-md border border-cyan-400/20 bg-cyan-500/5 p-3 text-xs text-cyan-200">
        <div className="font-mono text-[10px] uppercase text-cyan-300">Pricing status</div>
        <div className="mt-1">{data.pricing.status}</div>
        <div className="mt-2 text-zinc-400">{data.pricing.note}</div>
        <div className="mt-2 text-[10px] text-zinc-500">Checked at: {data.pricing.checkedAt ?? "never — requires live check"}</div>
      </div>

      {/* Links */}
      <div className="flex flex-wrap gap-2">
        <a
          href="https://ollama.com/cloud"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-fuchsia-400/40 bg-fuchsia-500/10 px-3 py-1.5 text-xs text-fuchsia-200 hover:bg-fuchsia-500/20"
        >
          <ExternalLink className="h-3 w-3" /> ollama.com/cloud
        </a>
        <a
          href="https://ollama.com/pricing"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20"
        >
          <ExternalLink className="h-3 w-3" /> ollama.com/pricing
        </a>
      </div>

      {/* Disabled providers (informational only) */}
      <details className="rounded-md border border-zinc-700 bg-zinc-900/40 p-3 text-xs">
        <summary className="cursor-pointer text-zinc-400">Disabled providers (informational)</summary>
        <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-zinc-500 md:grid-cols-3">
          {["RunPod", "Vast.ai", "Lambda Cloud", "Paperspace", "Google Colab", "Kaggle", "AWS", "Google Cloud", "Azure", "HuggingFace Spaces", "Modal", "Replicate", "DigitalOcean", "Railway", "Render", "Fly.io"].map((p) => (
            <div key={p} className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500/60" />
              <span className="line-through">{p}</span>
            </div>
          ))}
        </div>
      </details>
    </HolographicPanel>
  );
}
