import React from "react";

interface SciFiPanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  titleColor?: string;
  glowColor?: string;
  accent?: string;
  children: React.ReactNode;
}

export function SciFiPanel({ title, icon, children, className, ...props }: SciFiPanelProps) {
  return (
    <div className={`sci-fi-panel sci-fi-panel-chamfer-tl-br p-6 relative flex flex-col ${className || ''}`} {...props}>
      {(title || icon) && (
        <div className="flex items-center gap-3 mb-6 border-b border-cyan-500/20 pb-2">
          {icon && <div className="text-cyan-400">{icon}</div>}
          {title && <h3 className="text-[12px] font-bold tracking-[0.2em] text-cyan-400 uppercase">{title}</h3>}
        </div>
      )}
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}

export function SciFiBadge({ children, variant = 'default', label, value }: any) {
  const colors: Record<string, string> = {
    default: 'text-cyan-400 border-cyan-500/30',
    success: 'text-[#a3e635] border-[#a3e635]/30',
    warning: 'text-orange-400 border-orange-500/30',
    danger: 'text-red-400 border-red-500/30'
  };
  
  if (label || value) {
    return (
      <span className={`text-[9px] font-bold tracking-widest border px-2 py-1 rounded-full uppercase ${colors[variant]}`}>
        {label}: {value}
      </span>
    );
  }
  
  return (
    <span className={`text-[9px] font-bold tracking-widest border px-2 py-1 rounded-full uppercase ${colors[variant]}`}>
      {children}
    </span>
  );
}

export function SciFiRing({ score, label, value }: any) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-12 h-12 rounded-full border border-cyan-500/40 flex items-center justify-center relative sci-fi-box-glow">
         <div className="absolute inset-0 border-[3px] border-cyan-400 rounded-full border-r-transparent border-b-transparent rotate-45"></div>
         <span className="text-cyan-100 font-bold text-sm">{score || value || 0}</span>
      </div>
      {label && <span className="text-[8px] text-cyan-600 uppercase tracking-widest">{label}</span>}
    </div>
  );
}

export function SciFiStatCard({ title, value, icon, trend }: any) {
  return (
    <div className="sci-fi-panel p-4 flex flex-col gap-2 relative">
      <div className="flex items-center justify-between text-cyan-500">
        <span className="text-[10px] uppercase font-bold tracking-[0.2em]">{title}</span>
        {icon}
      </div>
      <div className="text-xl font-bold text-cyan-100 tracking-wider">{value}</div>
      {trend && <div className="text-[8px] text-cyan-700 tracking-widest uppercase">{trend}</div>}
    </div>
  );
}
