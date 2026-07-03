"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[app] global error:", error);
  return (
    <div className="cosmic-page-shell flex items-center justify-center p-6">
      <div className="signal-console max-w-md p-8 text-center">
        <h2 className="font-mono text-lg text-cyan-200">Раздел временно недоступен</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Произошла ошибка загрузки. Попробуйте снова.
        </p>
        {error?.message && (
          <p className="mt-2 text-[10px] text-zinc-600">{error.message}</p>
        )}
        <Button onClick={reset} className="mt-4">
          Повторить
        </Button>
      </div>
    </div>
  );
}
