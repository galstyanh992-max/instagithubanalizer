"use client";

import { Network, Clock, Zap, ShieldCheck } from "lucide-react";

export function MacDock() {
  return (
    <footer className="flex-none h-16 border-t border-cyan-500/20 bg-[#020610]/80 backdrop-blur-md flex items-center justify-between px-8 z-50 text-[10px] font-mono tracking-widest text-cyan-700 relative font-rajdhani">
      
      {/* Left Block */}
      <div className="flex items-center gap-12">
        <div className="flex flex-col gap-1">
          <span className="text-[8px] uppercase font-bold tracking-widest">Энергопотребление</span>
          <div className="flex items-center gap-2">
            <span className="text-cyan-100 font-bold text-sm tracking-widest">850 W</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[8px] uppercase font-bold tracking-widest">Жесткие диски</span>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2"><span className="w-2">C:</span> <div className="w-16 h-1 bg-cyan-900"><div className="w-[68%] h-full bg-cyan-500 shadow-[0_0_5px_#00f0ff]"></div></div> 68%</div>
            <div className="flex items-center gap-2"><span className="w-2">D:</span> <div className="w-16 h-1 bg-cyan-900"><div className="w-[42%] h-full bg-cyan-500 shadow-[0_0_5px_#00f0ff]"></div></div> 42%</div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[8px] uppercase font-bold tracking-widest">Память</span>
          <span className="text-cyan-100 font-bold tracking-widest">13.2 / 32 GB</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[8px] uppercase font-bold tracking-widest">Нагрузка системы</span>
          <div className="flex items-center gap-2">
            <span className="text-cyan-100 font-bold">42%</span>
            <Network className="w-3 h-3 text-cyan-500" />
          </div>
        </div>
      </div>

      {/* Center Circular HUD */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-4 w-28 h-20 bg-[#02050A] rounded-t-full border-t border-cyan-500/30 flex flex-col items-center justify-center sci-fi-box-glow">
        <div className="w-12 h-12 rounded-full border border-cyan-500/40 flex items-center justify-center relative">
           <div className="absolute inset-0 border-[3px] border-cyan-400 rounded-full border-r-transparent border-b-transparent rotate-45"></div>
           <span className="text-cyan-100 font-bold text-sm">78%</span>
        </div>
        <span className="text-[7px] text-cyan-600 mt-1 uppercase font-bold tracking-widest">Системный ресурс</span>
      </div>

      {/* Right Block */}
      <div className="flex items-center gap-12">
        <div className="flex flex-col items-end gap-1">
          <span className="text-[8px] uppercase font-bold tracking-widest flex items-center gap-1"><Clock className="w-3 h-3"/> Аптайм системы</span>
          <span className="text-cyan-100 tracking-widest">15d 07:42:21</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[8px] uppercase font-bold tracking-widest flex items-center gap-1"><Zap className="w-3 h-3"/> Сетевая задержка</span>
          <span className="text-cyan-100 font-bold tracking-widest">24 мс</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[8px] uppercase font-bold tracking-widest flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Безопасность</span>
          <div className="flex items-center gap-2">
            <span className="text-[#a3e635] text-glow-lime">УРОВЕНЬ 5</span>
            <span className="text-cyan-700 text-[8px] tracking-widest">МАКСИМАЛЬНЫЙ</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[8px] uppercase font-bold tracking-widest">Дата и время</span>
          <span className="text-cyan-100 tracking-widest">20 МАЯ 2026</span>
        </div>
      </div>

    </footer>
  );
}
