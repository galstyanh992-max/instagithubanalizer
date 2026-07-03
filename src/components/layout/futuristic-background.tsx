"use client";

import { useUiStore } from "@/lib/store";
import { useMounted } from "@/lib/use-mounted";
import ThreeBackground from "@/components/three/three-background";

export function FuturisticBackground() {
  const enable3d = useUiStore((s) => s.enable3d);
  const mounted = useMounted();

  if (!mounted || !enable3d) {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 holo-grid-bg opacity-30"
      />
    );
  }
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <ThreeBackground />
    </div>
  );
}
