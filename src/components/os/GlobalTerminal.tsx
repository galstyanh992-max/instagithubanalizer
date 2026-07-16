"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TerminalSquare } from "lucide-react";
import { useUiStore } from "@/lib/store";
import { TerminalPanel } from "@/components/os/TerminalPanel";

/**
 * Global Terminal overlay — slides up from the bottom of the viewport.
 * Toggled by the Terminal button in the MacDock (via Zustand `terminalOpen`).
 * Rendered once in the root layout so it is available on every route.
 */
export function GlobalTerminal() {
  const open = useUiStore((s) => s.terminalOpen);
  const setOpen = useUiStore((s) => s.setTerminalOpen);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Click-away backdrop (transparent, only catches clicks) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          {/* Terminal panel */}
          <motion.div
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 300, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-50"
            role="dialog"
            aria-label="Terminal"
            aria-modal="true"
          >
            {/* Header bar */}
            <div className="max-w-6xl mx-auto px-4 pt-2">
              <div className="flex items-center justify-between px-3 py-2 rounded-t-xl bg-zinc-950/90 border border-b-0 border-cyan-400/30 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-cyan-300 text-[11px] font-mono uppercase tracking-wider">
                  <TerminalSquare className="h-3.5 w-3.5 drop-shadow-[0_0_5px_currentColor]" />
                  Terminal
                </div>
                <button
                  type="button"
                  aria-label="Close terminal"
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800/80 transition-all active:translate-y-0.5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body — real terminal panel */}
            <TerminalPanel />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}