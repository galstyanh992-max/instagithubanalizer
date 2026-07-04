"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import { HolographicPanel } from "@/components/futuristic/holographic-panel";

type Task = {
  id: string;
  title: string;
  completed: boolean;
};

export function TaskListSidebar() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.tasks) {
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title: newTask }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.task) {
        setTasks([data.task, ...tasks]);
        setNewTask("");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const toggleTask = async (id: string, completed: boolean) => {
    // Optimistic UI update
    setTasks(tasks.map((t) => (t.id === id ? { ...t, completed } : t)));
    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        body: JSON.stringify({ id, completed }),
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error(error);
      fetchTasks(); // revert on fail
    }
  };

  return (
    <HolographicPanel accent="cyan" className="p-4 flex flex-col h-full max-h-[600px]">
      <h2 className="cyber-panel-header mb-4">Дела (To-Do)</h2>
      
      <form onSubmit={addTask} className="flex gap-2 mb-4">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Новая задача..."
          className="flex-1 bg-zinc-900/50 border border-cyan-400/30 rounded px-3 py-1.5 text-sm text-cyan-50 outline-none focus:border-cyan-400/80 transition-colors"
        />
        <button
          type="submit"
          className="bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 rounded p-1.5 transition-colors border border-cyan-500/30"
        >
          <Plus className="w-5 h-5" />
        </button>
      </form>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {loading ? (
          <div className="text-center text-xs text-cyan-500/50 py-4">Загрузка...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center text-xs text-cyan-500/50 py-4">Нет активных задач.</div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-start gap-3 p-2 rounded border transition-colors ${
                task.completed
                  ? "bg-zinc-900/30 border-transparent opacity-60"
                  : "bg-zinc-900/60 border-cyan-400/20 hover:border-cyan-400/40"
              }`}
            >
              <button
                onClick={() => toggleTask(task.id, !task.completed)}
                className="mt-0.5 shrink-0 text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {task.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
              </button>
              <span className={`text-sm ${task.completed ? "line-through text-zinc-500" : "text-zinc-200"}`}>
                {task.title}
              </span>
            </div>
          ))
        )}
      </div>
    </HolographicPanel>
  );
}
