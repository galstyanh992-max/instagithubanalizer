import { HardDrive, Share2 } from "lucide-react";

export function OsMemoryTree() {
  const nodes = [
    { name: "Context Window", usage: "94.2k / 200k", color: "text-cyan-400" },
    { name: "RAG Retrieval", usage: "Active", color: "text-lime-400" },
    { name: "Embeddings", usage: "12.4M vectors", color: "text-purple-400" },
    { name: "Knowledge Graph", status: "Syncing", color: "text-amber-400" },
    { name: "Fast Cache", usage: "842 MB", color: "text-cyan-200" },
    { name: "Vector DB", usage: "Connected", color: "text-lime-400" },
  ];

  return (
    <div className="border border-cyan-400/20 bg-zinc-950/80 rounded-lg p-3 space-y-3 shadow-[0_0_15px_rgba(34,211,238,0.05)] backdrop-blur-md">
      <div className="flex items-center justify-between text-cyan-400 font-mono text-[10px] uppercase tracking-widest border-b border-cyan-400/20 pb-2">
        <div className="flex items-center gap-2">
          <HardDrive className="h-3 w-3" />
          Memory Architecture
        </div>
        <Share2 className="h-3 w-3 text-cyan-400/50" />
      </div>

      <div className="grid grid-cols-1 gap-1.5">
        {nodes.map((n, i) => (
          <div key={i} className="flex items-center justify-between px-2 py-1.5 bg-zinc-900/40 rounded border border-cyan-400/5">
            <div className="flex items-center gap-2">
              <div className={`h-1.5 w-1.5 rounded-full ${n.color.replace('text-', 'bg-')}`} />
              <span className="text-[10px] font-mono text-zinc-300">{n.name}</span>
            </div>
            <span className={`text-[9px] font-mono ${n.color}`}>
              {n.usage || n.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
