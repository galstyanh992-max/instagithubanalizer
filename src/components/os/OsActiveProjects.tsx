import { FolderKanban, CheckCircle2 } from "lucide-react";

export function OsActiveProjects() {
  const projects = [
    { name: "ДЖАРВИС AI Core", progress: 85, status: "deploying" },
    { name: "Next.js Admin Template", progress: 100, status: "completed" },
    { name: "Supabase Migration", progress: 45, status: "syncing" },
  ];

  return (
    <div className="border border-cyan-400/20 bg-zinc-950/80 rounded-lg p-3 space-y-3 shadow-[0_0_15px_rgba(34,211,238,0.05)] backdrop-blur-md">
      <div className="flex items-center justify-between text-cyan-400 font-mono text-[10px] uppercase tracking-widest border-b border-cyan-400/20 pb-2">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-3 w-3" />
          Active Projects
        </div>
      </div>

      <div className="space-y-2">
        {projects.map((p, i) => (
          <div key={i} className="flex flex-col gap-1 p-2 rounded bg-zinc-900/50 border border-cyan-400/5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-cyan-100">{p.name}</span>
              <span className={`text-[8px] uppercase tracking-wider ${p.progress === 100 ? 'text-lime-400' : 'text-cyan-400'}`}>
                {p.status}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <div className="h-0.5 flex-1 bg-zinc-800 rounded mr-3 overflow-hidden">
                <div className={`h-full ${p.progress === 100 ? 'bg-lime-400' : 'bg-cyan-400'}`} style={{ width: `${p.progress}%` }} />
              </div>
              <span className="text-[9px] font-mono text-zinc-500">{p.progress}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
