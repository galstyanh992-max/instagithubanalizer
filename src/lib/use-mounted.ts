"use client";

import { useSyncExternalStore } from "react";

/**
 * Возвращает true только после mount на клиенте.
 * Используется для предотвращения hydration mismatch:
 * - browser-only APIs (window, localStorage, navigator)
 * - live time / Date
 * - random values
 * - WebGL canvas
 *
 * Использует useSyncExternalStore для безопасного чтения без setState в effect.
 */
const emptySubscribe = () => () => {};
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,  // client snapshot
    () => false  // server snapshot
  );
}
