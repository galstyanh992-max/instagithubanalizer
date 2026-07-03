export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-zinc-800" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-900/60" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-64 animate-pulse rounded-xl bg-zinc-900/60" />
        <div className="h-64 animate-pulse rounded-xl bg-zinc-900/60 lg:col-span-2" />
      </div>
      <div className="text-center text-xs text-zinc-500">Загружаю панель...</div>
    </div>
  );
}
