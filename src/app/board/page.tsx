"use client";

import { useEffect, useState } from "react";
import {
  DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors,
  useDroppable, useDraggable,
} from "@dnd-kit/core";
import { HolographicPanel } from "@/components/futuristic/holographic-panel";
import { VerdictBadge } from "@/components/futuristic/neon-badge";
import { toast } from "sonner";
import { VERDICT_META } from "@/lib/constants";
import type { Verdict } from "@/lib/types";
import { Star, GripVertical } from "lucide-react";
import Link from "next/link";

interface BoardRepo {
  id: string;
  fullName: string;
  description: string;
  finalPriorityScore: number;
  stars: number;
  verdict: string;
  primaryLanguage: string;
}

interface Column {
  verdict: Verdict;
  repos: BoardRepo[];
}

function DraggableRepo({ repo }: { repo: BoardRepo }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: repo.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50, opacity: 0.85 }
    : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={`cursor-grab ${isDragging ? "ring-2 ring-cyan-400" : ""}`}>
      <HolographicPanel accent="cyan" className="p-3 mb-2">
        <div className="flex items-start gap-2">
          <GripVertical className="mt-0.5 h-3 w-3 text-zinc-500" />
          <div className="min-w-0 flex-1">
            <Link href={`/repos/${repo.id}`} className="block truncate font-mono text-xs text-cyan-200 hover:underline" onClick={(e) => e.stopPropagation()}>
              {repo.fullName}
            </Link>
            <div className="mt-1 line-clamp-1 text-[10px] text-zinc-500">{repo.description}</div>
            <div className="mt-1 flex items-center justify-between">
              <span className="flex items-center gap-1 text-[10px] text-zinc-500"><Star className="h-2.5 w-2.5" />{repo.stars}</span>
              <span className="font-mono text-xs text-cyan-300">{repo.finalPriorityScore}</span>
            </div>
          </div>
        </div>
      </HolographicPanel>
    </div>
  );
}

function DroppableColumn({ column }: { column: Column }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.verdict });
  const meta = VERDICT_META[column.verdict];
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-2 rounded-xl border-2 border-dashed p-3 transition ${
        isOver ? "border-cyan-400 bg-cyan-500/10" : "border-zinc-700/50"
      }`}
    >
      <div className="flex items-center justify-between">
        <VerdictBadge verdict={column.verdict} size="md" />
        <span className="text-xs text-zinc-500">{column.repos.length}</span>
      </div>
      <div className="text-[10px] text-zinc-500">{meta.description}</div>
      <div className="space-y-1">
        {column.repos.length === 0 && (
          <div className="rounded-md border border-zinc-800 p-4 text-center text-[10px] text-zinc-600">Drop repos here</div>
        )}
        {column.repos.map((r) => (
          <DraggableRepo key={r.id} repo={r} />
        ))}
      </div>
    </div>
  );
}

export default function BoardPage() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/board");
      const d = await res.json();
      setColumns(d.columns);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const repoId = String(active.id);
    const newVerdict = String(over.id) as Verdict;
    // optimistic update
    setColumns((prev) => {
      const next = prev.map((c) => ({
        ...c,
        repos: c.repos.filter((r) => r.id !== repoId),
      }));
      const moving = prev.flatMap((c) => c.repos).find((r) => r.id === repoId);
      if (moving) {
        const col = next.find((c) => c.verdict === newVerdict);
        col?.repos.unshift(moving);
      }
      return next;
    });
    try {
      const res = await fetch("/api/board/move", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoId, verdict: newVerdict }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Moved to ${newVerdict}`);
    } catch {
      toast.error("Move failed");
      load();
    }
  }

  if (loading) return <div className="text-cyan-300">Loading board...</div>;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div>
        <h1 className="font-mono text-2xl font-bold neon-text">KANBAN BOARD</h1>
        <p className="text-xs text-zinc-500">Drag cards between verdict columns. Changes persist automatically.</p>
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {columns.map((c) => <DroppableColumn key={c.verdict} column={c} />)}
        </div>
      </DndContext>
    </div>
  );
}
