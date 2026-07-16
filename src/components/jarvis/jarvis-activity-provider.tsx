"use client";

import { createContext, useContext, ReactNode } from "react";
import { useJarvisActivity, JarvisActivityState } from "./use-jarvis-activity";

interface JarvisActivityContextValue {
  active: boolean;
  state: JarvisActivityState;
}

const JarvisActivityContext = createContext<JarvisActivityContextValue>({
  active: false,
  state: "idle",
});

export function useJarvisActivityContext(): JarvisActivityContextValue {
  return useContext(JarvisActivityContext);
}

export function JarvisActivityProvider({ children }: { children: ReactNode }) {
  const activity = useJarvisActivity();
  return (
    <JarvisActivityContext.Provider value={activity}>
      {children}
    </JarvisActivityContext.Provider>
  );
}
