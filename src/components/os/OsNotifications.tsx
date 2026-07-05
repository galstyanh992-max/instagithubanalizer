import { Bell, ShieldAlert, GitCommit, Rocket } from "lucide-react";

export function OsNotifications() {
  const notifications = [
    { text: "Merge conflict in layout.tsx", type: "error", icon: ShieldAlert },
    { text: "Deploy to Vercel completed", type: "success", icon: Rocket },
    { text: "Commit 'feat: OS redesign' pushed", type: "info", icon: GitCommit },
  ];

  return (
    <div className="border border-cyan-400/20 bg-zinc-950/80 rounded-lg p-3 space-y-3 shadow-[0_0_15px_rgba(34,211,238,0.05)] backdrop-blur-md">
      <div className="flex items-center justify-between text-cyan-400 font-mono text-[10px] uppercase tracking-widest border-b border-cyan-400/20 pb-2">
        <div className="flex items-center gap-2">
          <Bell className="h-3 w-3" />
          System Events
        </div>
        <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
      </div>

      <div className="space-y-1.5">
        {notifications.map((n, i) => {
          const Icon = n.icon;
          const color = n.type === 'error' ? 'text-red-400' : n.type === 'success' ? 'text-lime-400' : 'text-cyan-400';
          const bg = n.type === 'error' ? 'bg-red-500/10 border-red-500/20' : n.type === 'success' ? 'bg-lime-500/10 border-lime-500/20' : 'bg-cyan-500/10 border-cyan-500/20';
          return (
            <div key={i} className={`flex items-start gap-2 px-2 py-1.5 rounded border ${bg}`}>
              <Icon className={`h-3 w-3 mt-0.5 ${color}`} />
              <span className={`text-[10px] ${color}`}>{n.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
