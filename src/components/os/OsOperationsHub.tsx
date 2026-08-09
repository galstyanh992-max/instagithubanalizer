"use client";

import { useJarvisStore } from "@/components/jarvis/jarvis-store";
import { Activity, ShieldCheck, Brain, Network, ChevronRight } from "lucide-react";

export function OsOperationsHub() {
  return (
    <div className="flex flex-col gap-4 h-full">
      
      {/* ПРОЕКТЫ И ВЕРХНИЕ ВКЛАДКИ */}
      <div className="sci-fi-panel sci-fi-panel-chamfer-tl-br flex-1 flex flex-col p-4 relative">
        {/* Tabs */}
        <div className="flex items-center gap-4 mb-6 border-b border-cyan-500/20 pb-2">
          {['ПРОЕКТЫ', 'ЗАДАЧИ', 'АГЕНТЫ', 'ЧАТЫ', 'ФАЙЛЫ', 'МУЗЫКА'].map((tab, i) => (
            <button key={tab} className={`text-[9px] font-bold tracking-[0.2em] transition-all ${
              i === 0 
                ? 'text-cyan-400 text-glow' 
                : 'text-cyan-700 hover:text-cyan-400'
            }`}>
              {tab}
            </button>
          ))}
          {/* Active Tab indicator */}
          <div className="absolute top-[28px] left-4 w-12 h-[2px] bg-cyan-400 shadow-[0_0_8px_#00f0ff]"></div>
        </div>

        {/* List of projects */}
        <div className="flex flex-col gap-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
          
          <div className="flex gap-4 items-center bg-cyan-950/10 p-3 rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-all cursor-pointer">
            <div className="w-10 h-10 rounded-full border border-cyan-500/50 flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-cyan-100 font-bold tracking-wider text-sm">JARVIS AI Core</span>
              <span className="text-cyan-700 text-[8px] uppercase tracking-widest">Разработка ядра ИИ нового поколения</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-cyan-600 text-[7px] uppercase">Прогресс</span>
                <div className="flex-1 h-[2px] bg-cyan-950"><div className="w-[78%] h-full bg-cyan-400 shadow-[0_0_5px_#00f0ff]"></div></div>
                <span className="text-cyan-100 text-[9px] font-bold">78%</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4 items-center bg-cyan-950/10 p-3 rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-all cursor-pointer">
            <div className="w-10 h-10 rounded-full border border-orange-500/50 flex items-center justify-center shrink-0">
              <div className="w-3 h-3 rounded-sm border-2 border-orange-400"></div>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-cyan-100 font-bold tracking-wider text-sm">Mark VII Development</span>
              <span className="text-cyan-700 text-[8px] uppercase tracking-widest">Разработка и тестирование систем</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-cyan-600 text-[7px] uppercase">Прогресс</span>
                <div className="flex-1 h-[2px] bg-cyan-950"><div className="w-[63%] h-full bg-orange-400 shadow-[0_0_5px_#f97316]"></div></div>
                <span className="text-cyan-100 text-[9px] font-bold">63%</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4 items-center bg-cyan-950/10 p-3 rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-all cursor-pointer">
            <div className="w-10 h-10 rounded-full border border-cyan-500/50 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-cyan-100 font-bold tracking-wider text-sm">Neural Interface</span>
              <span className="text-cyan-700 text-[8px] uppercase tracking-widest">Интерфейс мозг-компьютер</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-cyan-600 text-[7px] uppercase">Прогресс</span>
                <div className="flex-1 h-[2px] bg-cyan-950"><div className="w-[41%] h-full bg-cyan-400 shadow-[0_0_5px_#00f0ff]"></div></div>
                <span className="text-cyan-100 text-[9px] font-bold">41%</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4 items-center bg-cyan-950/10 p-3 rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-all cursor-pointer">
            <div className="w-10 h-10 rounded-full border border-cyan-500/50 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-cyan-100 font-bold tracking-wider text-sm">Stark Network Security</span>
              <span className="text-cyan-700 text-[8px] uppercase tracking-widest">Сетевая безопасность и защита</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-cyan-600 text-[7px] uppercase">Прогресс</span>
                <div className="flex-1 h-[2px] bg-cyan-950"><div className="w-[92%] h-full bg-cyan-400 shadow-[0_0_5px_#00f0ff]"></div></div>
                <span className="text-cyan-100 text-[9px] font-bold">92%</span>
              </div>
            </div>
          </div>

        </div>

        <div className="border-t border-cyan-500/20 pt-3 mt-2 flex items-center justify-between cursor-pointer group">
          <span className="text-cyan-700 text-[8px] uppercase tracking-widest group-hover:text-cyan-400 transition-colors">Показать все проекты</span>
          <ChevronRight className="w-3 h-3 text-cyan-700 group-hover:text-cyan-400" />
        </div>
      </div>

      {/* АКТИВНОСТЬ СИСТЕМЫ */}
      <div className="sci-fi-panel sci-fi-panel-chamfer-tr p-4 relative h-64 shrink-0 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <Network className="w-3 h-3 text-cyan-500" />
          <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-cyan-500">Активность системы</span>
        </div>
        <div className="flex flex-col gap-2 font-mono text-[9px] tracking-widest flex-1 overflow-y-auto custom-scrollbar">
          {[
            { a: 'Синхронизация с облаком', t: '05:06:12', c: 'text-cyan-400' },
            { a: 'Проверка целостности системы', t: '05:05:48', c: 'text-cyan-400' },
            { a: 'Оптимизация нейросети', t: '05:05:21', c: 'text-orange-400' },
            { a: 'Проверка систем безопасности', t: '05:04:58', c: 'text-[#a3e635]' },
            { a: 'Обновление моделей ИИ', t: '05:04:33', c: 'text-cyan-400' },
            { a: 'Резервное копирование данных', t: '05:04:10', c: 'text-cyan-400' }
          ].map((log, i) => (
            <div key={i} className="flex items-center justify-between py-1 border-b border-cyan-900/20">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${log.c.replace('text-', 'bg-')} shadow-[0_0_5px]`}></div>
                <span className="text-cyan-100">{log.a}</span>
              </div>
              <span className="text-cyan-700">{log.t}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-cyan-500/20 pt-3 mt-2 flex items-center justify-between cursor-pointer group">
          <span className="text-cyan-700 text-[8px] uppercase tracking-widest group-hover:text-cyan-400 transition-colors">Показать всю активность</span>
          <ChevronRight className="w-3 h-3 text-cyan-700 group-hover:text-cyan-400" />
        </div>
      </div>

    </div>
  );
}
