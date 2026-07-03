"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HolographicPanel } from "@/components/futuristic/holographic-panel";
import { Tags, ArrowRight } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div>
        <h1 className="font-mono text-2xl font-bold neon-text">CATEGORIES</h1>
        <p className="text-xs text-zinc-500">Repos grouped by primary language</p>
      </div>
      {loading && <div className="text-cyan-300">Loading...</div>}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {categories.map((c) => (
          <Link key={c.id} href={`/repos?search=${encodeURIComponent(c.name)}`}>
            <HolographicPanel accent="cyan" className="p-5 transition hover:scale-[1.03]">
              <Tags className="h-6 w-6 text-cyan-300" />
              <div className="mt-2 font-mono text-sm text-cyan-200">{c.name}</div>
              <div className="mt-1 text-[10px] text-zinc-500">{c.count} repos</div>
              <div className="mt-3 flex items-center text-[10px] text-cyan-300">
                Browse <ArrowRight className="ml-1 h-3 w-3" />
              </div>
            </HolographicPanel>
          </Link>
        ))}
        {categories.length === 0 && !loading && (
          <HolographicPanel accent="amber" className="col-span-full p-12 text-center text-sm text-zinc-400">
            No categories yet. Analyze some repos first.
          </HolographicPanel>
        )}
      </div>
    </div>
  );
}
