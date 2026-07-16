"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  FolderKanban, Terminal, Globe, Folder,
  Database, ClipboardCheck, Bot, Code2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUiStore } from "@/lib/store";
import { useCallback } from "react";

// Custom social app icons as inline SVG components to avoid extra dependencies
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.447-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);
const TelegramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zm0 10.162a3.999 3.999 0 110-7.998 3.999 3.999 0 010 7.998zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1.01.03-1.51.14-1.57 1.08-3.05 2.47-4.01 1.28-.92 2.89-1.28 4.45-1.14.02.35.02.71.02 1.06-.01.04-.05.12-.09.12-1.19.11-2.31.74-3.01 1.69-.64.87-.92 1.98-.76 3.04.17 1.26.91 2.42 1.98 3.09 1.17.72 2.67.88 3.99.42.94-.33 1.75-.96 2.28-1.8.39-.58.62-1.26.68-1.95.05-.64.03-1.29.04-1.93V0h3.02c-.01 1.91-.02 3.83-.04 5.74z"/>
  </svg>
);

type DockAction =
  | { kind: "route"; href: string }
  | { kind: "external"; href: string }
  | { kind: "browser"; url: string; title: string }
  | { kind: "toast"; title: string; description: string }
  | { kind: "terminal" }
  | { kind: "files" };

type DockItem = {
  icon: typeof FolderKanban;
  label: string;
  color: string;
  action: DockAction;
  customIcon?: React.FC<{ className?: string }>;
};

export function MacDock() {
  const router = useRouter();
  const { toast } = useToast();
  const toggleTerminal = useUiStore((s) => s.toggleTerminal);
  const toggleFiles = useUiStore((s) => s.toggleFiles);

  const setMiniBrowserUrl = useUiStore((s) => s.setMiniBrowserUrl);

  const items: DockItem[] = [
    { icon: Terminal,      label: "Терминал",    color: "text-lime-400",   action: { kind: "terminal" } },
    { icon: Bot,           label: "Агенты",      color: "text-cyan-400",   action: { kind: "route", href: "/agents" } },
    { icon: Code2,         label: "Код",         color: "text-sky-400",    action: { kind: "browser", url: "https://vscode.dev", title: "VSCode" } },
    { icon: Globe,         label: "Веб",         color: "text-cyan-400",   action: { kind: "browser", url: "http://localhost:3000", title: "Browser" } },
    { icon: Folder,        label: "Файлы",       color: "text-amber-400",  action: { kind: "files" } },
    { icon: Database,      label: "Память",      color: "text-purple-400", action: { kind: "route", href: "/memory" } },
    { icon: FolderKanban,  label: "Проекты",     color: "text-blue-400",   action: { kind: "route", href: "/projects" } },
    { icon: ClipboardCheck,label: "Задачи",      color: "text-rose-400",   action: { kind: "toast", title: "Задачи", description: "Менеджер задач скоро будет доступен." } },
  ];

  const handleClick = useCallback((item: DockItem) => {
    const { action } = item;
    switch (action.kind) {
      case "route":
        router.push(action.href);
        break;
      case "external":
        window.open(action.href, "_blank", "noopener,noreferrer");
        break;
      case "browser":
        setMiniBrowserUrl(action.url, action.title);
        break;
      case "toast":
        toast({ title: action.title, description: action.description });
        break;
      case "terminal":
        toggleTerminal();
        break;
      case "files":
        toggleFiles();
        break;
    }
  }, [router, toast, toggleTerminal, toggleFiles]);

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 group">
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.5 }}
        className="flex items-start gap-2 p-2 rounded-2xl bg-surface-sunken/80 border border-surface-border backdrop-blur-xl shadow-panel transition-all hover:bg-surface-sunken"
      >
        {items.map((item, i) => {
          const Icon = item.customIcon ?? item.icon;
          return (
            <motion.div
              key={i}
              className="relative group/item flex flex-col items-center"
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              {/* Tooltip */}
              <div className="absolute -bottom-10 glass-panel-subtle text-cyan-50 text-[10px] px-2 py-1 rounded-md opacity-0 group-hover/item:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {item.label}
              </div>

              <button
                type="button"
                aria-label={item.label}
                onClick={() => handleClick(item)}
                className="h-11 w-11 sm:h-13 sm:w-13 rounded-xl bg-gradient-to-br from-[#0f141f] to-[#070a11] border border-surface-border-subtle hover:border-cyan-500/40 flex items-center justify-center transition-all duration-300 shadow-[inset_0_1px_rgba(255,255,255,0.08),inset_0_-2px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.5)] hover:shadow-[inset_0_1px_rgba(255,255,255,0.12),0_0_20px_rgba(34,211,238,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
              >
                <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${item.color} drop-shadow-[0_0_8px_currentColor] transition-transform group-hover/item:scale-110`} />
              </button>

              {/* Active dot indicator for first item */}
              {i === 0 && (
                <div className="h-1 w-1 rounded-full bg-cyan-400 mt-1 absolute -bottom-1.5 shadow-[0_0_6px_currentColor]" />
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
