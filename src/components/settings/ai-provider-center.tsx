"use client";

import { useEffect, useState } from "react";
import { HolographicPanel } from "@/components/futuristic/holographic-panel";
import { CheckCircle2, XCircle } from "lucide-react";
import type { ProviderStatus } from "@/services/ai-provider-router.service";

const StatusRow = ({ label, isConfigured, subtext }: { label: string, isConfigured: boolean, subtext?: string }) => (
  <div className="flex items-center justify-between rounded border border-cyan-400/20 bg-zinc-900/60 p-3">
    <div>
      <div className="text-sm font-medium text-zinc-200">{label}</div>
      {subtext && <div className="text-[10px] text-zinc-500">{subtext}</div>}
    </div>
    <div className="flex items-center gap-2">
      {isConfigured ? (
        <span className="flex items-center text-xs text-lime-400">
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Configured
        </span>
      ) : (
        <span className="flex items-center text-xs text-zinc-500">
          <XCircle className="mr-1 h-3.5 w-3.5" /> Missing
        </span>
      )}
    </div>
  </div>
);

export function AiProviderCenter() {
  const [data, setData] = useState<{
    ok: boolean;
    primaryProvider: string;
    heavyProvider: string;
    providers: ProviderStatus[];
    mockMode: boolean;
  } | null>(null);

  useEffect(() => {
    fetch("/api/providers/status")
      .then((res) => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  if (!data) return <div className="text-cyan-300">Loading AI Provider Status...</div>;

  const getProv = (name: string) => data.providers.find(p => p.name === name)?.configured ?? false;

  return (
    <HolographicPanel accent="cyan" className="space-y-4 p-5">
      <div>
        <h3 className="font-mono text-sm uppercase text-cyan-400">AI Provider Routing</h3>
        <p className="text-xs text-zinc-400 mt-1">Configure keys in .env.local. UI only shows status to prevent secret leaks.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Primary & Heavy</div>
          <StatusRow label="OLLAMA CLOUD" isConfigured={getProv("ollama-cloud")} subtext="Role: Primary Fast (Chat, UI)" />
          <StatusRow label="GLM 5.2" isConfigured={getProv("glm")} subtext="Role: Heavy Reasoning (Analysis, Patch)" />
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Fallback Providers</div>
          <StatusRow label="OpenRouter" isConfigured={getProv("openrouter")} />
          <StatusRow label="Gemini" isConfigured={getProv("gemini")} />
          <StatusRow label="OpenAI" isConfigured={getProv("openai")} />
          <StatusRow label="Groq" isConfigured={getProv("groq")} />
          <StatusRow label="Cerebras" isConfigured={getProv("cerebras")} />
        </div>
      </div>

      <div className="mt-4 border-t border-cyan-400/20 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-300">Mock Mode Fallback</span>
          <span className={`text-xs font-mono px-2 py-1 rounded ${data.mockMode ? "bg-amber-500/20 text-amber-300" : "bg-zinc-800 text-zinc-400"}`}>
            {data.mockMode ? "ACTIVE (NO REAL AI)" : "INACTIVE"}
          </span>
        </div>
      </div>
    </HolographicPanel>
  );
}
