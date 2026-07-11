import { Mic, Paperclip, Camera, Globe, TerminalSquare, MonitorUp, Send } from "lucide-react";
import { useState } from "react";

export function OsConsole() {
  const [input, setInput] = useState("");

  return (
    <div className="w-full bg-gradient-to-b from-zinc-950/90 to-zinc-950/95 border-t border-cyan-400/30 p-4 pt-6 backdrop-blur-xl relative z-20 shadow-[0_-10px_30px_rgba(34,211,238,0.05),inset_0_1px_1px_rgba(255,255,255,0.05)]">
      <div className="max-w-6xl mx-auto flex flex-col gap-4">
        {/* Buttons Row */}
        <div className="flex flex-wrap items-center gap-3">
          <button className="group flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-b from-cyan-500/20 to-cyan-500/5 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 transition-all active:translate-y-0.5 shadow-[inset_0_1px_rgba(255,255,255,0.2),inset_0_-2px_rgba(0,0,0,0.4),0_4px_10px_rgba(0,0,0,0.5)] hover:shadow-[inset_0_1px_rgba(255,255,255,0.3),inset_0_-2px_rgba(0,0,0,0.2),0_0_15px_rgba(34,211,238,0.4)] text-[10px] font-mono uppercase tracking-wider">
            <Mic className="h-3 w-3 drop-shadow-[0_0_5px_currentColor] group-hover:animate-pulse" /> Voice
          </button>
          {[
            { icon: Paperclip, label: "Attach" },
            { icon: Camera, label: "Camera" },
            { icon: Globe, label: "Browser" },
            { icon: TerminalSquare, label: "Terminal" },
            { icon: MonitorUp, label: "Share" },
          ].map((btn, i) => (
            <button key={i} className="group flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-b from-zinc-800/80 to-zinc-900/80 border border-zinc-700/50 text-zinc-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-all active:translate-y-0.5 shadow-[inset_0_1px_rgba(255,255,255,0.1),inset_0_-2px_rgba(0,0,0,0.4),0_4px_10px_rgba(0,0,0,0.5)] hover:shadow-[inset_0_1px_rgba(255,255,255,0.2),inset_0_-2px_rgba(0,0,0,0.2),0_0_15px_rgba(34,211,238,0.2)] text-[10px] font-mono uppercase tracking-wider">
              <btn.icon className="h-3 w-3 group-hover:drop-shadow-[0_0_5px_currentColor] transition-all" /> {btn.label}
            </button>
          ))}
        </div>

        {/* Input Row */}
        <div className="relative w-full group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur opacity-30 group-hover:opacity-100 transition duration-500 group-hover:duration-200"></div>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Awaiting command..."
            className="relative w-full bg-zinc-900/90 border border-cyan-400/40 rounded-xl pl-5 pr-14 py-4 text-cyan-50 font-mono text-sm focus:outline-none focus:border-cyan-300 focus:shadow-[inset_0_2px_10px_rgba(0,0,0,0.5),0_0_20px_rgba(34,211,238,0.3)] transition-all placeholder:text-zinc-500 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]"
          />
          <button className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all shadow-[inset_0_1px_rgba(255,255,255,0.2),inset_0_-2px_rgba(0,0,0,0.4)] active:translate-y-[calc(-50%+2px)] active:shadow-none ${input.trim() ? 'bg-gradient-to-br from-cyan-400 to-cyan-600 text-zinc-950 hover:shadow-[0_0_15px_rgba(34,211,238,0.6)] border-cyan-300' : 'bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-500 border border-zinc-700'}`}>
            <Send className="h-4 w-4 drop-shadow-sm" />
          </button>
        </div>
      </div>
    </div>
  );
}
