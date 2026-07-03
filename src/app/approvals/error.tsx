"use client";
import { useEffect } from "react";
export default function Error({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="p-8 space-y-4 border border-red-500/20 bg-red-950/10 rounded-xl m-8">
      <h2 className="text-xl text-red-500 font-bold">Ошибка загрузки подтверждений</h2>
      <button onClick={() => reset()} className="px-4 py-2 border border-red-500/50 text-red-400 rounded hover:bg-red-950/50 transition">Попробовать снова</button>
    </div>
  );
}
