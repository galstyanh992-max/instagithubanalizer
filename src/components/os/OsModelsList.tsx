import { Brain, CheckCircle2, AlertCircle, Clock, XCircle } from "lucide-react";

export function OsModelsList() {
  const models = [
    { name: "Claude 3.5 Sonnet", status: "online" },
    { name: "Gemini 1.5 Pro", status: "online" },
    { name: "GPT-4o", status: "busy" },
    { name: "Codex", status: "offline" },
    { name: "GLM 5.2", status: "online" },
    { name: "Qwen 2.5", status: "waiting" },
    { name: "Llama 3.1 70B", status: "online" },
    { name: "Local Models", status: "offline" },
  ];

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case "online": return <CheckCircle2 className="h-3 w-3 text-lime-400" />;
      case "busy": return <AlertCircle className="h-3 w-3 text-amber-400" />;
      case "waiting": return <Clock className="h-3 w-3 text-cyan-400" />;
      case "offline": return <XCircle className="h-3 w-3 text-red-500/50" />;
      default: return null;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "online": return "text-lime-400";
      case "busy": return "text-amber-400";
      case "waiting": return "text-cyan-400";
      case "offline": return "text-red-500/50";
      default: return "text-zinc-500";
    }
  };

  return (
    <div className="border border-cyan-400/20 bg-zinc-950/80 rounded-lg p-3 space-y-3 shadow-[0_0_15px_rgba(34,211,238,0.05)] backdrop-blur-md">
      <div className="flex items-center justify-between text-cyan-400 font-mono text-[10px] uppercase tracking-widest border-b border-cyan-400/20 pb-2">
        <div className="flex items-center gap-2">
          <Brain className="h-3 w-3" />
          Neural Models
        </div>
        <span className="text-zinc-500">8/8</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {models.map((m, i) => (
          <div key={i} className="flex items-center justify-between p-1.5 rounded bg-zinc-900/50 border border-cyan-400/5">
            <span className={`text-[9px] font-mono truncate ${m.status === "offline" ? "text-zinc-600" : "text-cyan-100"}`}>
              {m.name}
            </span>
            <div className="flex items-center gap-1">
              <span className={`text-[8px] uppercase tracking-wider hidden sm:block ${statusColor(m.status)}`}>
                {m.status}
              </span>
              <StatusIcon status={m.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
