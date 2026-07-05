import { Mic, Paperclip, Camera, Globe, TerminalSquare, MonitorUp, Send } from "lucide-react";
import { useState } from "react";

export function OsConsole() {
  const [input, setInput] = useState("");

  return (
    <div className="w-full bg-zinc-950/90 border-t border-cyan-400/20 p-4 backdrop-blur-xl relative z-20">
      <div className="max-w-6xl mx-auto flex flex-col gap-3">
        {/* Buttons Row */}
        <div className="flex flex-wrap items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-colors text-[10px] font-mono uppercase tracking-wider">
            <Mic className="h-3 w-3" /> Voice
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 hover:bg-zinc-800 transition-colors text-[10px] font-mono uppercase tracking-wider">
            <Paperclip className="h-3 w-3" /> Attach
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 hover:bg-zinc-800 transition-colors text-[10px] font-mono uppercase tracking-wider">
            <Camera className="h-3 w-3" /> Camera
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 hover:bg-zinc-800 transition-colors text-[10px] font-mono uppercase tracking-wider">
            <Globe className="h-3 w-3" /> Browser
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 hover:bg-zinc-800 transition-colors text-[10px] font-mono uppercase tracking-wider">
            <TerminalSquare className="h-3 w-3" /> Terminal
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 hover:bg-zinc-800 transition-colors text-[10px] font-mono uppercase tracking-wider">
            <MonitorUp className="h-3 w-3" /> Share
          </button>
        </div>

        {/* Input Row */}
        <div className="relative w-full">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Awaiting command..."
            className="w-full bg-zinc-900 border border-cyan-400/30 rounded-lg pl-4 pr-12 py-3 text-cyan-50 font-mono text-sm focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all placeholder:text-zinc-600"
          />
          <button className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors ${input.trim() ? 'bg-cyan-500 text-zinc-950 hover:bg-cyan-400' : 'bg-zinc-800 text-zinc-500'}`}>
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
