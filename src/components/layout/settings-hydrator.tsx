"use client";

import { useUiStore } from "@/lib/store";
import { useEffect } from "react";

export function SettingsHydrator() {
  const hydrateFromSettings = useUiStore((s) => s.hydrateFromSettings);
  const setNeonIntensity = useUiStore((s) => s.setNeonIntensity);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        const s = d.settings;
        if (!s) return;
        hydrateFromSettings({
          enable3d: s.enable3d,
          reduceMotion: s.reduceMotion,
          compactMode: s.compactMode,
          voiceEnabled: s.voiceEnabled,
          autoSpeak: s.autoSpeak,
        });
        setNeonIntensity(s.neonIntensity ?? 70);
      })
      .catch(() => void 0);
  }, [hydrateFromSettings, setNeonIntensity]);

  // Apply neon intensity to CSS variable
  const neonIntensity = useUiStore((s) => s.neonIntensity);
  const reduceMotion = useUiStore((s) => s.reduceMotion);
  const compactMode = useUiStore((s) => s.compactMode);

  useEffect(() => {
    document.documentElement.style.setProperty("--holo-intensity", String(neonIntensity / 100));
  }, [neonIntensity]);

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    document.documentElement.classList.toggle("compact", compactMode);
  }, [compactMode]);

  return null;
}
