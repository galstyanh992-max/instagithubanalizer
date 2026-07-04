// AI Jarwisyan — Zustand client store

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  // 3D
  enable3d: boolean;
  reduceMotion: boolean;
  compactMode: boolean;
  neonIntensity: number;
  // Voice
  voiceEnabled: boolean;
  autoSpeak: boolean;
  // Compare selection
  compareIds: string[];
  // Sidebar
  sidebarCollapsed: boolean;
  // Fallback mode banner
  fallbackBannerDismissed: boolean;
  // Actions
  toggle3d: () => void;
  toggleReduceMotion: () => void;
  toggleCompact: () => void;
  setNeonIntensity: (v: number) => void;
  toggleVoice: () => void;
  toggleAutoSpeak: () => void;
  toggleSidebar: () => void;
  addCompare: (id: string) => void;
  removeCompare: (id: string) => void;
  clearCompare: () => void;
  dismissFallbackBanner: () => void;
  hydrateFromSettings: (s: Partial<UiState>) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      enable3d: true,
      reduceMotion: false,
      compactMode: false,
      neonIntensity: 70,
      voiceEnabled: true,
      autoSpeak: false,
      compareIds: [],
      sidebarCollapsed: false,
      fallbackBannerDismissed: false,

      toggle3d: () => set((s) => ({ enable3d: !s.enable3d })),
      toggleReduceMotion: () => set((s) => ({ reduceMotion: !s.reduceMotion })),
      toggleCompact: () => set((s) => ({ compactMode: !s.compactMode })),
      setNeonIntensity: (v) => set({ neonIntensity: v }),
      toggleVoice: () => set((s) => ({ voiceEnabled: !s.voiceEnabled })),
      toggleAutoSpeak: () => set((s) => ({ autoSpeak: !s.autoSpeak })),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      addCompare: (id) =>
        set((s) =>
          s.compareIds.includes(id) || s.compareIds.length >= 5
            ? s
            : { compareIds: [...s.compareIds, id] }
        ),
      removeCompare: (id) =>
        set((s) => ({ compareIds: s.compareIds.filter((x) => x !== id) })),
      clearCompare: () => set({ compareIds: [] }),
      dismissFallbackBanner: () => set({ fallbackBannerDismissed: true }),
      hydrateFromSettings: (s) => set(s),
    }),
    { name: "ai-jarwisyan-ui" }
  )
);
