import { useOsMetrics } from "@/lib/os-mock-data";
import { Cpu, HardDrive, Network, Thermometer, Database } from "lucide-react";

export function OsSystemStatus() {
  const metrics = useOsMetrics();

  const Bar = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-mono">
        <span className="text-zinc-500">{label}</span>
        <span className="text-cyan-100">{value.toFixed(1)}%</span>
      </div>
      <div className="h-1 w-full bg-zinc-900 rounded overflow-hidden">
        <div className={`h-full ${color} transition-all duration-300 ease-out`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );

  return (
    <div className="border border-cyan-400/20 bg-zinc-950/80 rounded-lg p-3 space-y-4 shadow-[0_0_15px_rgba(34,211,238,0.05)] backdrop-blur-md">
      <div className="flex items-center gap-2 text-cyan-400 font-mono text-[10px] uppercase tracking-widest border-b border-cyan-400/20 pb-2">
        <Database className="h-3 w-3" />
        System Core
      </div>
      
      <div className="space-y-3">
        <Bar label="CPU" value={metrics.cpu} color="bg-cyan-400" />
        <Bar label="GPU" value={metrics.gpu} color="bg-purple-400" />
        <Bar label="RAM" value={(metrics.ram / 64) * 100} color="bg-lime-400" />
        <Bar label="VRAM" value={(metrics.vram / 24) * 100} color="bg-amber-400" />
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-cyan-400/10">
        <div className="flex items-center gap-2">
          <Thermometer className="h-3 w-3 text-red-400" />
          <div className="text-[10px] font-mono text-zinc-300">{metrics.temp.toFixed(1)}°C</div>
        </div>
        <div className="flex items-center gap-2">
          <HardDrive className="h-3 w-3 text-zinc-400" />
          <div className="text-[10px] font-mono text-zinc-300">42%</div>
        </div>
        <div className="flex items-center gap-2 col-span-2">
          <Network className="h-3 w-3 text-cyan-400" />
          <div className="text-[10px] font-mono text-zinc-400 flex justify-between w-full">
            <span>↓ {metrics.networkIn.toFixed(1)} MB/s</span>
            <span>↑ {metrics.networkOut.toFixed(1)} MB/s</span>
          </div>
        </div>
      </div>
    </div>
  );
}
