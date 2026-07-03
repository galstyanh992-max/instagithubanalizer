export default function GlobalLoading() {
  return (
    <div className="cosmic-page-shell flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-pulse rounded-full border-2 border-cyan-400/30 border-t-cyan-400" style={{ animation: "spin 1s linear infinite" }} />
        <p className="mt-4 text-xs text-zinc-500 font-mono uppercase tracking-widest">Загрузка...</p>
      </div>
    </div>
  );
}
