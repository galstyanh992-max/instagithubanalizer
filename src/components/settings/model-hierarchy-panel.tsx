"use client";

import { useEffect, useState } from "react";
import { HolographicPanel } from "@/components/futuristic/holographic-panel";
import { CheckCircle2, XCircle, Crown, Code2, Wrench, Palette, ShieldCheck, Search, Globe, Brain, Scale, Film } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoleStatus {
  role: string;
  description: string;
  providerId: string;
  providerName: string;
  model: string;
  available: boolean;
  configured: boolean;
}

const ROLE_META: Record<string, { icon: typeof Crown; accent: string; emoji: string }> = {
  orchestrator: { icon: Crown, accent: "text-fuchsia-300", emoji: "👑" },
  senior_dev: { icon: Code2, accent: "text-cyan-300", emoji: "💻" },
  second_dev: { icon: Wrench, accent: "text-blue-300", emoji: "🔧" },
  designer: { icon: Palette, accent: "text-pink-300", emoji: "🎨" },
  design_critic: { icon: ShieldCheck, accent: "text-amber-300", emoji: "🛡️" },
  research: { icon: Search, accent: "text-violet-300", emoji: "🔍" },
  browser: { icon: Globe, accent: "text-sky-300", emoji: "🌐" },
  memory: { icon: Brain, accent: "text-lime-300", emoji: "🧠" },
  legal: { icon: Scale, accent: "text-emerald-300", emoji: "⚖️" },
  media: { icon: Film, accent: "text-rose-300", emoji: "🎬" },
};

function RoleCard({ status }: { status: RoleStatus }) {
  const meta = ROLE_META[status.role] ?? ROLE_META.orchestrator;
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        "glass-panel-subtle rounded-lg p-3 transition",
        status.configured ? "border-cyan-400/20" : "border-zinc-700/30 opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.03] border border-white/[0.06]", meta.accent)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{meta.emoji}</span>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-100">
                {status.role.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="text-[10px] text-zinc-500 truncate">{status.description}</div>
          </div>
        </div>
        {status.configured ? (
          <CheckCircle2 className="h-4 w-4 text-lime-400 shrink-0" />
        ) : (
          <XCircle className="h-4 w-4 text-zinc-600 shrink-0" />
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
        <span className="font-mono text-cyan-200/80 truncate">{status.providerName}</span>
        <span className="font-mono text-zinc-500 truncate">{status.model || '—'}</span>
      </div>
    </div>
  );
}

export function ModelHierarchyPanel() {
  const [roles, setRoles] = useState<RoleStatus[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/jarvis/hierarchy")
      .then((r) => r.json())
      .then((d) => setRoles(d.roles ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !roles) {
    return (
      <HolographicPanel accent="magenta" className="p-5">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </HolographicPanel>
    );
  }

  return (
    <HolographicPanel accent="magenta" className="space-y-4 p-5">
      <div>
        <h3 className="font-mono text-sm uppercase text-fuchsia-300">Model Hierarchy</h3>
        <p className="text-xs text-zinc-400 mt-1">
          Multi-model architecture — each role uses a specialized model. Configure keys in <code className="text-cyan-300">.env.local</code>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {roles.map((r) => (
          <RoleCard key={r.role} status={r} />
        ))}
      </div>

      <div className="mt-3 rounded-lg border border-fuchsia-400/20 bg-fuchsia-400/[0.04] p-3 text-[11px] text-zinc-400">
        <div className="font-mono text-fuchsia-300 mb-1">Design Critic Loop</div>
        Designer (GLM 5.2) generates → Critic (GPT-5.5) audits → Designer improves. POST <code className="text-cyan-300">/api/jarvis/design-critic</code> with <code>{`{ brief, context?, maxRounds }`}</code>.
      </div>
    </HolographicPanel>
  );
}