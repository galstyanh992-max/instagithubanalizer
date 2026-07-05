import { Users, Activity } from "lucide-react";
import { useEffect, useState } from "react";

export function OsAgentsRoster() {
  const [agents, setAgents] = useState([
    { name: "Planner", task: "Analyzing requirements", progress: 85, status: "active" },
    { name: "Architect", task: "Mapping dependencies", progress: 40, status: "active" },
    { name: "Developer", task: "Awaiting blueprint", progress: 0, status: "waiting" },
    { name: "QA", task: "Idle", progress: 0, status: "idle" },
    { name: "Security", task: "Scanning deps", progress: 95, status: "active" },
    { name: "Browser", task: "Idle", progress: 0, status: "idle" },
    { name: "Terminal", task: "Running build", progress: 60, status: "active" },
    { name: "Database", task: "Optimizing queries", progress: 15, status: "active" },
    { name: "Designer", task: "Idle", progress: 0, status: "idle" },
    { name: "Research", task: "Searching docs", progress: 50, status: "active" },
  ]);

  // Simulate progress
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents(prev => prev.map(a => {
        if (a.status === "active") {
          let newProg = a.progress + Math.random() * 5;
          if (newProg >= 100) {
            newProg = 100;
            return { ...a, progress: 100, status: "idle", task: "Idle" };
          }
          return { ...a, progress: newProg };
        }
        if (a.status === "idle" && Math.random() > 0.95) {
          return { ...a, status: "active", progress: 0, task: "Starting new task..." };
        }
        return a;
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="border border-cyan-400/20 bg-zinc-950/80 rounded-lg p-3 space-y-3 shadow-[0_0_15px_rgba(34,211,238,0.05)] backdrop-blur-md">
      <div className="flex items-center justify-between text-cyan-400 font-mono text-[10px] uppercase tracking-widest border-b border-cyan-400/20 pb-2">
        <div className="flex items-center gap-2">
          <Users className="h-3 w-3" />
          Active Agents
        </div>
        <Activity className="h-3 w-3 text-cyan-400/50" />
      </div>

      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
        {agents.map((agent, i) => (
          <div key={i} className="flex flex-col gap-1.5 p-2 rounded bg-zinc-900/50 border border-cyan-400/5">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-mono font-bold ${agent.status === 'active' ? 'text-cyan-200' : 'text-zinc-500'}`}>
                {agent.name}
              </span>
              <span className={`text-[9px] uppercase tracking-wider ${agent.status === 'active' ? 'text-lime-400' : agent.status === 'waiting' ? 'text-amber-400' : 'text-zinc-600'}`}>
                {agent.status}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-zinc-400 truncate max-w-[140px]">{agent.task}</span>
              {agent.status === "active" && (
                <span className="text-[9px] font-mono text-cyan-400">{agent.progress.toFixed(0)}%</span>
              )}
            </div>

            {agent.status === "active" && (
              <div className="h-0.5 w-full bg-zinc-800 rounded overflow-hidden">
                <div className="h-full bg-cyan-400 transition-all duration-500" style={{ width: `${agent.progress}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
