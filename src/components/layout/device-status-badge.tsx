"use client";

import { useEffect, useRef, useState } from "react";
import type { DeviceStatusView } from "@/app/api/devices/status/route";
import { useJarvisRealtime } from "@/hooks/use-jarvis-realtime";

// Real HOME-PC status, computed server-side from the daemon's last
// heartbeat (see /api/devices/status). Replaces a previously hardcoded
// "ONLINE" badge in the topbar — a device that has never sent a heartbeat,
// or whose daemon has died, must not show as online.
const POLL_MS = 20_000;

const STATUS_STYLE: Record<DeviceStatusView["status"] | "loading" | "error", { label: string; dot: string; text: string }> = {
  ONLINE: { label: "ONLINE", dot: "bg-[#a3e635] shadow-[0_0_8px_#a3e635] animate-pulse", text: "text-[#a3e635] text-glow-lime" },
  OFFLINE: { label: "OFFLINE", dot: "bg-red-500 shadow-[0_0_8px_#ef4444]", text: "text-red-400" },
  DISABLED: { label: "DISABLED", dot: "bg-cyan-800", text: "text-cyan-700" },
  loading: { label: "…", dot: "bg-cyan-800", text: "text-cyan-700" },
  error: { label: "UNKNOWN", dot: "bg-cyan-800", text: "text-cyan-700" },
};

export function DeviceStatusBadge() {
  const [devices, setDevices] = useState<DeviceStatusView[] | null>(null);
  const [failed, setFailed] = useState(false);
  // Exposes the in-effect poll() to the Realtime hook below without
  // resubscribing the channel on every render.
  const pollRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/devices/status", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (!cancelled) {
          setDevices(data.devices ?? []);
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    }
    pollRef.current = () => void poll();
    void poll();
    // Realtime (below) fires an immediate poll() the moment a heartbeat
    // lands, but this interval is NOT removed: it is the fallback that
    // keeps the badge correct (e.g. flipping to OFFLINE once STALE_MS has
    // elapsed with no new heartbeat) even if the Realtime channel drops.
    const id = setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Immediate refetch on a live "device.status" broadcast (see
  // src/lib/jarvis/realtime/broadcast.ts) — purely an early trigger for the
  // same poll() above, never a source of state on its own.
  useJarvisRealtime({
    events: ["device.status"],
    onEvent: () => pollRef.current(),
  });

  // No registered device yet, or the status call failed: show a neutral
  // state rather than a fabricated ONLINE/OFFLINE.
  const primary = devices?.[0];
  const key: keyof typeof STATUS_STYLE = failed ? "error" : devices === null ? "loading" : primary ? primary.status : "error";
  const style = STATUS_STYLE[key];
  const name = primary?.name ?? "HOME-PC";

  return (
    <div className="flex items-center gap-2" title={primary?.lastHeartbeatAt ? `Последний heartbeat: ${primary.lastHeartbeatAt}` : undefined}>
      <span className="text-cyan-700">{name}</span>
      <span className={style.text}>{style.label}</span>
      <div className={cn("w-1.5 h-1.5 rounded-full", style.dot)}></div>
    </div>
  );
}

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}
