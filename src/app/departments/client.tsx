"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export function DepartmentClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    key: "",
    description: "",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create department");
      }

      setForm({ name: "", key: "", description: "" });
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mb-6 space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
      <h3 className="text-sm font-semibold">Добавить новый департамент</h3>
      {error && <div className="text-xs text-red-400 bg-red-400/10 p-2 rounded">{error}</div>}
      
      <div className="grid gap-3 sm:grid-cols-2">
        <Input 
          placeholder="Название (напр. Research Team)" 
          value={form.name} 
          onChange={e => setForm({...form, name: e.target.value})} 
          required 
          className="bg-zinc-950 border-zinc-800"
        />
        <Input 
          placeholder="Key (напр. research_dept)" 
          value={form.key} 
          onChange={e => setForm({...form, key: e.target.value})} 
          required 
          className="bg-zinc-950 border-zinc-800"
        />
      </div>
      <Input 
        placeholder="Описание" 
        value={form.description} 
        onChange={e => setForm({...form, description: e.target.value})} 
        className="bg-zinc-950 border-zinc-800"
      />
      <Button type="submit" disabled={loading} className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-500 text-white">
        {loading ? "Создание..." : "Создать департамент"}
      </Button>
    </form>
  );
}
