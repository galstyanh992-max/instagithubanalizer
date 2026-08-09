"use client";

import { Cpu, HardDrive, Network, Settings, Activity, Thermometer, Wind, Fingerprint } from "lucide-react";
import { useEffect, useState } from "react";

function TechBar({ label, value, max = 100, color = "bg-cyan-500", detail }: { label: string, value: number, max?: number, color?: string, detail?: string }) {
  const percent = Math.min(100, (value / max) * 100);
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between items-center text-[10px] font-mono tracking-widest text-cyan-600 uppercase">
        <span className="flex items-center gap-2">
          {label === 'CPU' && <Settings className="w-3 h-3 text-cyan-400" />}
          {label === 'GPU' && <Cpu className="w-3 h-3 text-cyan-400" />}
          {label === 'RAM' && <HardDrive className="w-3 h-3 text-[#a3e635]" />}
          {label === 'VRAM' && <Activity className="w-3 h-3 text-orange-400" />}
          {label}
        </span>
        <div className="flex gap-4">
          <span className="text-cyan-100">{value.toFixed(0)}%</span>
          {detail && <span className="text-cyan-700 w-16 text-right">{detail}</span>}
        </div>
      </div>
      <div className="h-1 w-full bg-cyan-950/50 flex">
        <div 
          className={`h-full ${color} transition-all duration-500 relative`} 
          style={{ width: `${percent}%` }}
        >
          {/* Glowing dot at the end */}
          <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white shadow-[0_0_8px_#fff]`}></div>
        </div>
      </div>
    </div>
  );
}

function MiniGraph({ color, up }: { color: string, up: boolean }) {
  return (
    <div className="w-full h-8 flex items-end justify-between gap-[2px] mt-2 opacity-70">
      {[...Array(15)].map((_, i) => {
        const h = Math.random() * 100;
        return (
          <div key={i} className={`w-full ${color}`} style={{ height: `${up ? h : 100 - h}%` }}></div>
        )
      })}
    </div>
  )
}

export function OsSystemStatus() {
  const [activeModelName, setActiveModelName] = useState("Gemini 1.5");
  
  return (
    <div className="flex flex-col gap-4 h-full">
      
      {/* СИСТЕМНЫЙ МОНИТОР */}
      <div className="sci-fi-panel sci-fi-panel-chamfer-tr p-4 relative">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full border border-cyan-400 flex items-center justify-center">
            <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-cyan-500">Системный монитор</span>
        </div>
        
        <div className="flex flex-col gap-4">
          <TechBar label="CPU" value={18} detail="3.2 GHz" color="bg-cyan-500" />
          <TechBar label="GPU" value={32} detail="62 °C" color="bg-cyan-500" />
          <TechBar label="RAM" value={41} detail="13.2 / 32 GB" color="bg-[#a3e635]" />
          <TechBar label="VRAM" value={48} detail="8.2 / 16 GB" color="bg-orange-500" />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="flex flex-col gap-1">
            <span className="text-[8px] uppercase text-cyan-700 tracking-widest">Температура</span>
            <div className="flex items-center gap-2 text-cyan-100 font-mono text-sm">
              <Thermometer className="w-4 h-4 text-orange-400" />
              42 °C
            </div>
            <span className="text-[8px] text-[#a3e635] uppercase">Норма</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[8px] uppercase text-cyan-700 tracking-widest">Скорость Вент.</span>
            <div className="flex items-center gap-2 text-cyan-100 font-mono text-sm">
              <Wind className="w-4 h-4 text-cyan-400" />
              1200 RPM
            </div>
            <span className="text-[8px] text-cyan-600 uppercase">Тихо</span>
          </div>
        </div>
      </div>

      {/* СЕТЬ */}
      <div className="sci-fi-panel p-4 relative glow-border">
        <div className="flex items-center gap-2 mb-4">
          <Network className="w-3 h-3 text-cyan-500" />
          <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-cyan-500">Сеть</span>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-cyan-100 font-mono text-sm">
              <span className="text-cyan-500">↓</span> 1.2 <span className="text-cyan-700 text-[10px]">Гбит/с</span>
            </div>
            <MiniGraph color="bg-cyan-500" up={false} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-orange-400 font-mono text-sm">
              <span className="text-orange-400">↑</span> 0.9 <span className="text-cyan-700 text-[10px]">Гбит/с</span>
            </div>
            <MiniGraph color="bg-orange-400" up={true} />
          </div>
        </div>
      </div>

      {/* АКТИВНЫЕ МОДЕЛИ */}
      <div className="sci-fi-panel sci-fi-panel-chamfer-tl-br p-4 flex-1 flex flex-col relative">
        <div className="flex items-center gap-2 mb-4">
          <Fingerprint className="w-3 h-3 text-cyan-500" />
          <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-cyan-500">Активные модели и сервисы</span>
        </div>
        <div className="flex flex-col gap-2 font-mono text-[9px] tracking-widest flex-1 overflow-y-auto custom-scrollbar">
          {[
            { n: 'Claude 3.5', s: 'ONLINE', c: 'text-[#a3e635]' },
            { n: 'GPT-4o', s: 'ACTIVE', c: 'text-cyan-400' },
            { n: 'Gemini 1.5', s: 'ONLINE', c: 'text-[#a3e635]' },
            { n: 'GEM.AI 2', s: 'STANDBY', c: 'text-orange-400' },
            { n: 'Llama 3.1 70B', s: 'ONLINE', c: 'text-[#a3e635]' },
            { n: 'Qwen 2.5', s: 'STANDBY', c: 'text-orange-400' },
            { n: 'Собственная модель', s: 'ONLINE', c: 'text-[#a3e635]' },
            { n: 'Визуальный модуль v2.1', s: 'ACTIVE', c: 'text-cyan-400' },
            { n: 'Аналитический модуль', s: 'ONLINE', c: 'text-[#a3e635]' }
          ].map(m => (
            <div key={m.n} className="flex items-center justify-between py-1 border-b border-cyan-900/30">
              <div className="flex items-center gap-2">
                <Settings className="w-2 h-2 text-cyan-700" />
                <span className="text-cyan-100">{m.n}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={`${m.c} uppercase`}>{m.s}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${m.c.replace('text-', 'bg-')} shadow-[0_0_5px]`}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
}
