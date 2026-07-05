import { useOsTimeline } from "@/lib/os-mock-data";
import { ArrowDown, Terminal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function OsTimeline() {
  const events = useOsTimeline();

  return (
    <div className="w-full max-w-md mx-auto mt-8 flex flex-col items-center">
      <div className="flex items-center gap-2 text-cyan-400 font-mono text-[10px] uppercase tracking-widest mb-4 opacity-70">
        <Terminal className="h-3 w-3" />
        System Event Stream
      </div>
      
      <div className="flex flex-col items-center w-full relative">
        <div className="absolute top-0 bottom-0 w-px bg-gradient-to-b from-cyan-400/0 via-cyan-400/20 to-cyan-400/0" />
        
        <AnimatePresence mode="popLayout">
          {events.map((ev, i) => (
            <motion.div
              key={ev.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="flex flex-col items-center z-10 w-full mb-3"
            >
              <div className={`px-4 py-1.5 rounded-full border bg-zinc-950/90 text-[10px] font-mono shadow-[0_0_15px_rgba(34,211,238,0.1)] backdrop-blur-md flex items-center gap-2 ${ev.type === 'warn' ? 'border-amber-400/30 text-amber-300' : 'border-cyan-400/30 text-cyan-300'}`}>
                <span className="opacity-50 text-[8px]">{ev.time}</span>
                {ev.text}
              </div>
              {i < events.length - 1 && (
                <ArrowDown className="h-3 w-3 text-cyan-400/30 mt-3" />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
