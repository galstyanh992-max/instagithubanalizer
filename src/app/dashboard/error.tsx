"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[dashboard] error:", error);
  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-6 text-center">
        <h2 className="font-mono text-lg text-red-200">Не удалось открыть панель</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Произошла ошибка при загрузке панели. Попробуйте снова или проверьте настройки.
        </p>
        {error?.message && (
          <p className="mt-2 text-[10px] text-zinc-600">{error.message}</p>
        )}
        <Button onClick={reset} className="mt-4">
          Попробовать снова
        </Button>
      </div>
    </div>
  );
}
