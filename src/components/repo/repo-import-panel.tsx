"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Github, FileJson, Loader2, ArrowRight, X, CheckCircle2,
  AlertTriangle, Sparkles, Cpu, Cloud, Lightbulb, UploadCloud,
} from "lucide-react";
import { HolographicPanel } from "@/components/futuristic/holographic-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type ImportMode = "url" | "json";

type JobStatus = "pending" | "analyzing" | "done" | "error";

type Job = {
  id: string;
  ref: string; // "owner/repo" or URL
  status: JobStatus;
  repositoryId?: string;
  verdict?: string;
  finalPriorityScore?: number;
  error?: string;
};

/**
 * Parse a Git URL or "owner/repo" shorthand into "owner/repo".
 * Supports:
 *   - https://github.com/owner/repo
 *   - https://github.com/owner/repo.git
 *   - git@github.com:owner/repo.git
 *   - owner/repo
 */
function parseRepoRef(input: string): string | null {
  const s = input.trim();
  if (!s) return null;

  // SSH: git@github.com:owner/repo.git
  const ssh = s.match(/^git@github\.com:([^/]+)\/([^/]+?)(\.git)?$/);
  if (ssh) return `${ssh[1]}/${ssh[2]}`;

  // HTTPS: https://github.com/owner/repo(.git)?
  const https = s.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(\.git)?(?:\/.*)?$/);
  if (https) return `${https[1]}/${https[2]}`;

  // owner/repo shorthand
  const shorthand = s.match(/^([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)$/);
  if (shorthand) return `${shorthand[1]}/${shorthand[2]}`;

  return null;
}

/**
 * Parse JSON or JSONL content into a list of repo refs.
 * Supports:
 *   - JSON array of strings: ["owner/repo", "https://github.com/owner/repo"]
 *   - JSON array of objects: [{ "fullName": "owner/repo" }, { "url": "..." }]
 *   - JSONL: one JSON object per line, each with fullName/url/repo fields
 *   - Plain text: one ref per line
 */
function parseJsonContent(content: string): string[] {
  const refs: string[] = [];
  const trimmed = content.trim();

  if (!trimmed) return refs;

  // Try JSONL first (one object per line)
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim());
  const looksLikeJsonl = lines.every((l) => {
    try {
      JSON.parse(l.trim());
      return true;
    } catch {
      return false;
    }
  });

  if (looksLikeJsonl && lines.length > 1) {
    for (const line of lines) {
      try {
        const obj = JSON.parse(line.trim());
        const ref =
          obj.fullName ?? obj.full_name ?? obj.repo ?? obj.repository ??
          obj.url ?? obj.github_url ?? obj.githubUrl ?? (typeof obj === "string" ? obj : null);
        if (typeof ref === "string") {
          const parsed = parseRepoRef(ref);
          if (parsed) refs.push(parsed);
        }
      } catch {}
    }
    return refs;
  }

  // Try single JSON
  try {
    const data = JSON.parse(trimmed);
    if (Array.isArray(data)) {
      for (const item of data) {
        if (typeof item === "string") {
          const parsed = parseRepoRef(item);
          if (parsed) refs.push(parsed);
        } else if (item && typeof item === "object") {
          const ref =
            item.fullName ?? item.full_name ?? item.repo ?? item.repository ??
            item.url ?? item.github_url ?? item.githubUrl;
          if (typeof ref === "string") {
            const parsed = parseRepoRef(ref);
            if (parsed) refs.push(parsed);
          }
        }
      }
    } else if (data && typeof data === "object") {
      const ref =
        data.fullName ?? data.full_name ?? data.repo ?? data.repository ??
        data.url ?? data.github_url ?? data.githubUrl;
      if (typeof ref === "string") {
        const parsed = parseRepoRef(ref);
        if (parsed) refs.push(parsed);
      }
    }
    return refs;
  } catch {}

  // Fallback: plain text, one ref per line
  for (const line of lines) {
    const parsed = parseRepoRef(line.trim());
    if (parsed) refs.push(parsed);
  }
  return refs;
}

export function RepoImportPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<ImportMode>("url");
  const [urlInput, setUrlInput] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeRef = useCallback(
    async (ref: string): Promise<Job> => {
      const id = Math.random().toString(36).slice(2);
      setJobs((prev) => [
        ...prev,
        { id, ref, status: "analyzing" },
      ]);

      try {
        const res = await fetch("/api/repos/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName: ref }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error ?? d.message ?? `HTTP ${res.status}`);
        }
        const data = await res.json();
        const result = data.result ?? data;
        const job: Job = {
          id,
          ref,
          status: "done",
          repositoryId: result.repositoryId,
          verdict: result.verdict,
          finalPriorityScore: result.finalPriorityScore,
        };
        setJobs((prev) => prev.map((j) => (j.id === id ? job : j)));
        return job;
      } catch (e) {
        const job: Job = {
          id,
          ref,
          status: "error",
          error: e instanceof Error ? e.message : String(e),
        };
        setJobs((prev) => prev.map((j) => (j.id === id ? job : j)));
        return job;
      }
    },
    []
  );

  const handleUrlSubmit = async () => {
    const ref = parseRepoRef(urlInput);
    if (!ref) {
      toast.error("Неверный формат. Используйте: owner/repo, https://github.com/owner/repo, или git@github.com:owner/repo.git");
      return;
    }
    setUrlInput("");
    await analyzeRef(ref);
  };

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setBatchRunning(true);

    for (const file of Array.from(fileList)) {
      if (!/\.(json|jsonl|txt)$/i.test(file.name)) {
        toast.error(`${file.name}: только .json, .jsonl, .txt`);
        continue;
      }

      // Upload file to Supabase Storage first so it does not stay on the PC
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      const uploadRes = await fetch("/api/repos/import-upload", {
        method: "POST",
        body: uploadForm,
      });
      if (!uploadRes.ok) {
        const d = await uploadRes.json().catch(() => ({}));
        toast.error(`${file.name}: не удалось загрузить — ${d.error ?? uploadRes.status}`);
        continue;
      }
      const { url } = await uploadRes.json();

      // Read back from Supabase and run batch analysis on the server
      const batchRes = await fetch("/api/repos/import-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storageUrl: url }),
      });
      if (!batchRes.ok) {
        const d = await batchRes.json().catch(() => ({}));
        toast.error(`${file.name}: аудит не запустился — ${d.error ?? batchRes.status}`);
        continue;
      }
      const { results } = await batchRes.json();

      // Map server results to local job list
      for (const r of results) {
        const id = Math.random().toString(36).slice(2);
        if (r.ok) {
          setJobs((prev) => [
            ...prev,
            {
              id,
              ref: r.ref,
              status: "done",
              repositoryId: r.repositoryId,
              verdict: r.verdict,
              finalPriorityScore: r.finalPriorityScore,
            },
          ]);
        } else {
          setJobs((prev) => [
            ...prev,
            {
              id,
              ref: r.ref,
              status: "error",
              error: r.error,
            },
          ]);
        }
      }
    }

    setBatchRunning(false);
  }, []);

  const openRepo = (job: Job) => {
    if (job.repositoryId) router.push(`/repos/${job.repositoryId}`);
  };

  return (
    <HolographicPanel accent="cyan" className="p-4 space-y-4">
      {/* Mode tabs */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
            mode === "url"
              ? "bg-cyan-500/20 border border-cyan-400/50 text-cyan-200"
              : "bg-zinc-900/60 border border-zinc-700/50 text-zinc-400 hover:text-cyan-300"
          }`}
        >
          <Github className="h-3.5 w-3.5" /> GIT URL
        </button>
        <button
          type="button"
          onClick={() => setMode("json")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
            mode === "json"
              ? "bg-cyan-500/20 border border-cyan-400/50 text-cyan-200"
              : "bg-zinc-900/60 border border-zinc-700/50 text-zinc-400 hover:text-cyan-300"
          }`}
        >
          <FileJson className="h-3.5 w-3.5" /> JSON / JSONL
        </button>
      </div>

      {/* URL mode */}
      <AnimatePresence mode="wait">
        {mode === "url" && (
          <motion.div
            key="url"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleUrlSubmit();
                }}
                placeholder="owner/repo  ·  https://github.com/owner/repo  ·  git@github.com:owner/repo.git"
                className="bg-zinc-900/60 border-cyan-400/20 font-mono text-sm"
              />
              <Button
                type="button"
                onClick={() => void handleUrlSubmit()}
                disabled={!urlInput.trim()}
                className="shrink-0 bg-cyan-500/20 border border-cyan-400/50 text-cyan-100 hover:bg-cyan-500/30"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-zinc-500">
              Полный аудит: совместимость с ПК, варианты запуска (local/docker/VPS/Ollama Cloud), интеграция, польза для ДЖАРВИС.
            </p>
          </motion.div>
        )}

        {/* JSON mode */}
        {mode === "json" && (
          <motion.div
            key="json"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                void handleFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition cursor-pointer ${
                dragActive
                  ? "border-cyan-400 bg-cyan-500/10"
                  : "border-zinc-700 hover:border-cyan-400/60 hover:bg-cyan-500/5"
              }`}
            >
              <UploadCloud className="h-8 w-8 text-cyan-300" />
              <div className="text-center">
                <div className="font-mono text-xs text-cyan-200">ПЕРЕТАЩИ JSON / JSONL СЮДА</div>
                <div className="text-[10px] text-zinc-500">
                  .json массив, .jsonl по строкам, или .txt со списком URL
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".json,.jsonl,.txt"
                className="hidden"
                onChange={(e) => void handleFiles(e.target.files)}
              />
            </div>
            <p className="text-[10px] text-zinc-500">
              Форматы: <code className="text-cyan-400">[&quot;owner/repo&quot;]</code>,{" "}
              <code className="text-cyan-400">[&#123;&quot;fullName&quot;:&quot;owner/repo&quot;&#125;]</code>,{" "}
              JSONL по строкам, или plain text — один URL на строку.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Jobs list */}
      {jobs.length > 0 && (
        <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between text-[10px] uppercase text-zinc-500">
            <span>Аудит</span>
            <span>{jobs.filter((j) => j.status === "done").length}/{jobs.length} готово</span>
          </div>
          <AnimatePresence>
            {jobs.map((job) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className={`flex items-center gap-2 rounded-lg border p-2 text-xs ${
                  job.status === "done"
                    ? "border-lime-400/30 bg-lime-500/5"
                    : job.status === "error"
                    ? "border-red-400/30 bg-red-500/5"
                    : "border-cyan-400/30 bg-cyan-500/5"
                }`}
              >
                <div className="shrink-0">
                  {job.status === "analyzing" && <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" />}
                  {job.status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-lime-400" />}
                  {job.status === "error" && <AlertTriangle className="h-3.5 w-3.5 text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-mono text-cyan-200">{job.ref}</div>
                  {job.status === "done" && job.verdict && (
                    <div className="text-[10px] text-zinc-500">
                      вердикт: <span className="text-lime-300">{job.verdict}</span>
                      {typeof job.finalPriorityScore === "number" && (
                        <span className="ml-2">итог: {job.finalPriorityScore}</span>
                      )}
                    </div>
                  )}
                  {job.status === "error" && (
                    <div className="text-[10px] text-red-400 truncate">{job.error}</div>
                  )}
                </div>
                {job.status === "done" && job.repositoryId && (
                  <button
                    type="button"
                    onClick={() => openRepo(job)}
                    className="shrink-0 flex items-center gap-1 rounded border border-cyan-400/50 bg-cyan-500/15 px-2 py-1 text-[10px] text-cyan-100 hover:bg-cyan-500/25"
                  >
                    ОТКРЫТЬ <ArrowRight className="h-3 w-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setJobs((prev) => prev.filter((j) => j.id !== job.id))}
                  className="shrink-0 text-zinc-500 hover:text-red-400"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Feature hints */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-zinc-800/60">
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
          <Cpu className="h-3 w-3 text-cyan-400" /> Совместимость с ПК
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
          <Cloud className="h-3 w-3 text-cyan-400" /> VPS / Docker / Cloud
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
          <Lightbulb className="h-3 w-3 text-cyan-400" /> Польза для ДЖАРВИС
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
          <Sparkles className="h-3 w-3 text-cyan-400" /> Интеграция
        </div>
      </div>

      {batchRunning && (
        <div className="flex items-center gap-2 text-[11px] text-cyan-300">
          <Loader2 className="h-3 w-3 animate-spin" /> Пакетный аудит выполняется…
        </div>
      )}
    </HolographicPanel>
  );
}