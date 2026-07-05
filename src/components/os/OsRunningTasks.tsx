import { Cog } from "lucide-react";

export function OsRunningTasks() {
  const tasks = [
    { name: "Building dependencies", agent: "Terminal", time: "12s ago" },
    { name: "Analyzing page.tsx", agent: "Planner", time: "45s ago" },
    { name: "Fetching repos", agent: "GitHub", time: "1m ago" },
  ];

  return (
    <div className="border border-cyan-400/20 bg-zinc-950/80 rounded-lg p-3 space-y-3 shadow-[0_0_15px_rgba(34,211,238,0.05)] backdrop-blur-md">
      <div className="flex items-center justify-between text-cyan-400 font-mono text-[10px] uppercase tracking-widest border-b border-cyan-400/20 pb-2">
        <div className="flex items-center gap-2">
          <Cog className="h-3 w-3 animate-spin-slow" />
          Running Tasks
        </div>
      </div>

      <div className="space-y-1.5">
        {tasks.map((t, i) => (
          <div key={i} className="flex flex-col gap-1 px-2 py-1.5 rounded bg-zinc-900/50 border border-cyan-400/5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-300">{t.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono text-cyan-500">@{t.agent}</span>
              <span className="text-[8px] text-zinc-600">{t.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
