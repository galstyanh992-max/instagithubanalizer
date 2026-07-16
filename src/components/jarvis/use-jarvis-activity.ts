"use client";

import { useEffect, useState } from "react";

export type JarvisActivityState =
  | "idle"
  | "thinking"
  | "processing"
  | "speaking"
  | "error"
  | "critical"
  | "offline";

interface JarvisWindowState {
  loading?: boolean;
  result?: { ok?: boolean; error?: string } | null;
}

function getJarvisState(): JarvisWindowState {
  if (typeof window === "undefined") return {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const state = (window as any).__jarvisActivity;
  if (state && typeof state === "object") {
    return state as JarvisWindowState;
  }
  return {};
}

export function setJarvisActivityState(loading: boolean, result: JarvisWindowState["result"]) {
  if (typeof window === "undefined") return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__jarvisActivity = { loading, result };
  window.dispatchEvent(new CustomEvent("jarvis-activity"));
}

export function useJarvisActivity(): { active: boolean; state: JarvisActivityState } {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener("jarvis-activity", handler);
    return () => window.removeEventListener("jarvis-activity", handler);
  }, []);

  const { loading, result } = getJarvisState();

  if (loading) {
    return { active: true, state: "processing" };
  }

  if (result?.error) {
    return { active: false, state: "error" };
  }

  return { active: false, state: "idle" };
}
