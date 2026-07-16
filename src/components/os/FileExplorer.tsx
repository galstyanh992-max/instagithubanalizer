"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Folder, FolderOpen, File as FileIcon, FileCode, FileText, FileJson,
  ChevronRight, Home, ArrowLeft, RefreshCw, Loader2, AlertTriangle, Download,
  FileImage,
} from "lucide-react";

type Entry = {
  name: string;
  path: string;
  relPath: string;
  isDirectory: boolean;
  isSymlink: boolean;
  size: number;
  mtime: number | null;
};

type FileContent = {
  path: string;
  relPath: string;
  size: number;
  mtime: number;
  kind: "text" | "image" | "binary";
  mime?: string;
  content?: string;
  dataUrl?: string;
  downloadUrl?: string;
};

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["ts", "tsx", "js", "jsx", "json", "py", "rb", "go", "rs", "java", "c", "cpp", "cs", "php", "sh", "ps1"].includes(ext)) {
    return <FileCode className="h-4 w-4 text-sky-400 shrink-0" />;
  }
  if (["md", "mdx", "txt", "log"].includes(ext)) {
    return <FileText className="h-4 w-4 text-zinc-400 shrink-0" />;
  }
  if (ext === "json") {
    return <FileJson className="h-4 w-4 text-amber-400 shrink-0" />;
  }
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "avif", "svg"].includes(ext)) {
    return <FileImage className="h-4 w-4 text-fuchsia-400 shrink-0" />;
  }
  return <FileIcon className="h-4 w-4 text-zinc-500 shrink-0" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(ms: number | null): string {
  if (!ms) return "";
  return new Date(ms).toLocaleString("ru-RU");
}

export function FileExplorer() {
  const [root, setRoot] = useState<string>("");
  const [current, setCurrent] = useState<string>("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<FileContent | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const loadDir = useCallback(async (path?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = path
        ? `/api/files/list?path=${encodeURIComponent(path)}`
        : `/api/files/list`;
      const res = await fetch(url);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setRoot(data.root);
      setCurrent(data.current);
      setEntries(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load error");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFile = useCallback(async (path: string) => {
    setFileLoading(true);
    setFileError(null);
    setSelectedFile(null);
    try {
      const res = await fetch(`/api/files/read?path=${encodeURIComponent(path)}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setSelectedFile(data);
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "read error");
    } finally {
      setFileLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDir();
  }, [loadDir]);

  const breadcrumbs = (() => {
    if (!current || !root) return [];
    const rel = current.slice(root.length).replace(/^[\\/]+/, "").split(/[\\/]/).filter(Boolean);
    const crumbs: { name: string; path: string }[] = [{ name: "root", path: "" }];
    let acc = "";
    for (const part of rel) {
      acc = acc ? `${acc}/${part}` : part;
      crumbs.push({ name: part, path: acc });
    }
    return crumbs;
  })();

  const goUp = () => {
    if (!current || current === root) return;
    const parent = current.split(/[\\/]/).slice(0, -1).join("/") || root;
    void loadDir(parent);
  };

  return (
    <div className="w-full h-[70vh] lg:h-[75vh] bg-zinc-950/95 border-t border-cyan-400/30 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto h-full flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800/80">
          <button
            type="button"
            onClick={goUp}
            disabled={!current || current === root || loading}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            aria-label="Up"
            title="Up"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void loadDir(current)}
            disabled={loading}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800/80 disabled:opacity-40 transition-all"
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => void loadDir()}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800/80 transition-all"
            aria-label="Home"
            title="Workspace root"
          >
            <Home className="h-4 w-4" />
          </button>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 flex-1 overflow-x-auto custom-scrollbar text-[12px] font-mono">
            {breadcrumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1 shrink-0">
                {i > 0 && <ChevronRight className="h-3 w-3 text-zinc-600" />}
                <button
                  type="button"
                  onClick={() => void loadDir(c.path || undefined)}
                  className="text-cyan-300/80 hover:text-cyan-200 hover:underline transition-colors"
                >
                  {c.name}
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Body: tree + preview */}
        <div className="flex-1 flex min-h-0">
          {/* File list */}
          <div className="w-1/2 lg:w-2/5 border-r border-zinc-800/80 overflow-y-auto custom-scrollbar">
            {loading && (
              <div className="flex items-center gap-2 px-4 py-3 text-cyan-400/80 text-[12px]">
                <Loader2 className="h-3 w-3 animate-spin" /> загрузка…
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 text-red-400 text-[12px]">
                <AlertTriangle className="h-3 w-3" /> {error}
              </div>
            )}
            {!loading && !error && entries.length === 0 && (
              <div className="px-4 py-3 text-zinc-500 text-[12px] italic">пусто</div>
            )}
            <ul className="py-1">
              {entries.map((e) => {
                const active = selectedFile?.path === e.path;
                return (
                  <li key={e.path}>
                    <button
                      type="button"
                      onClick={() =>
                        e.isDirectory ? void loadDir(e.relPath) : void loadFile(e.relPath)
                      }
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12px] font-mono transition-colors ${
                        active
                          ? "bg-cyan-500/10 text-cyan-200 border-l-2 border-cyan-400"
                          : "text-zinc-300 hover:bg-zinc-800/60 border-l-2 border-transparent"
                      }`}
                      title={e.path}
                    >
                      {e.isDirectory ? (
                        <FolderOpen className="h-4 w-4 text-amber-400 shrink-0" />
                      ) : (
                        fileIcon(e.name)
                      )}
                      <span className="truncate flex-1">{e.name}</span>
                      {e.isDirectory ? (
                        <ChevronRight className="h-3 w-3 text-zinc-600 shrink-0" />
                      ) : (
                        <span className="text-zinc-600 text-[10px] shrink-0">
                          {formatSize(e.size)}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Preview pane */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {fileLoading && (
              <div className="flex items-center gap-2 px-4 py-3 text-cyan-400/80 text-[12px]">
                <Loader2 className="h-3 w-3 animate-spin" /> чтение…
              </div>
            )}
            {fileError && (
              <div className="flex items-center gap-2 px-4 py-3 text-red-400 text-[12px]">
                <AlertTriangle className="h-3 w-3" /> {fileError}
              </div>
            )}
            {!fileLoading && !fileError && !selectedFile && (
              <div className="flex-1 flex items-center justify-center text-zinc-600 text-[12px] italic">
                выберите файл для предпросмотра
              </div>
            )}
            {selectedFile && !fileLoading && !fileError && (
              <>
                <div className="px-4 py-2 border-b border-zinc-800/80 text-[11px] font-mono text-zinc-400 flex items-center justify-between gap-2">
                  <span className="truncate" title={selectedFile.path}>
                    {selectedFile.relPath}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-zinc-600">
                      {formatSize(selectedFile.size)} · {formatTime(selectedFile.mtime)}
                    </span>
                    {selectedFile.kind === "binary" && selectedFile.downloadUrl && (
                      <a
                        href={`${selectedFile.downloadUrl}&download=1`}
                        className="flex items-center gap-1 text-cyan-300 hover:text-cyan-200 transition-colors"
                        title="Скачать"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span className="text-[10px]">скачать</span>
                      </a>
                    )}
                  </div>
                </div>

                {selectedFile.kind === "text" && selectedFile.content !== undefined && (
                  <pre className="flex-1 overflow-auto custom-scrollbar px-4 py-3 text-[12px] font-mono text-zinc-200 whitespace-pre-wrap break-all leading-relaxed">
                    {selectedFile.content}
                  </pre>
                )}

                {selectedFile.kind === "image" && selectedFile.dataUrl && (
                  <div className="flex-1 overflow-auto custom-scrollbar flex items-center justify-center p-4 bg-[repeating-conic-gradient(#18181b_0%_25%,#0a0a0a_0%_50%)] bg-[length:16px_16px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedFile.dataUrl}
                      alt={selectedFile.relPath}
                      className="max-w-full max-h-full object-contain shadow-2xl rounded"
                    />
                  </div>
                )}

                {selectedFile.kind === "binary" && (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-400 p-6">
                    <FileIcon className="h-12 w-12 text-zinc-600" />
                    <div className="text-[12px] text-center">
                      <div className="text-zinc-300 font-mono">{selectedFile.mime ?? "binary"}</div>
                      <div className="text-zinc-500 mt-1">Предпросмотр недоступен для этого типа файла.</div>
                    </div>
                    {selectedFile.downloadUrl && (
                      <a
                        href={`${selectedFile.downloadUrl}&download=1`}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/30 transition-all text-[12px]"
                      >
                        <Download className="h-4 w-4" />
                        Скачать файл
                      </a>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}