"use client";

import { useState } from "react";
import { useJarvisStore, type ArchivedFile } from "./jarvis-store";
import { MediaPlayer } from "./media-player";
import { Button } from "@/components/ui/button";
import { Download, Trash2, FileAudio, FileImage, FileVideo, FileText, ChevronDown, ChevronUp, Play } from "lucide-react";

function FileIcon({ mimeType }: { mimeType?: string }) {
  if (mimeType?.startsWith("image/")) return <FileImage className="h-4 w-4 text-cyan-300" />;
  if (mimeType?.startsWith("video/")) return <FileVideo className="h-4 w-4 text-purple-300" />;
  if (mimeType?.startsWith("audio/")) return <FileAudio className="h-4 w-4 text-amber-300" />;
  return <FileText className="h-4 w-4 text-zinc-400" />;
}

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

async function downloadFile(file: ArchivedFile) {
  try {
    const res = await fetch(`/api/files/storage?url=${encodeURIComponent(file.url)}`);
    if (!res.ok) throw new Error("download failed");
    const blob = await res.blob();
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = file.url.split("/").pop() ?? "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("[archive] download failed:", e);
    window.open(file.url, "_blank");
  }
}

export function JarvisArchiveList() {
  const files = useJarvisStore((s) => s.archivedFiles);
  const deleteFile = useJarvisStore((s) => s.deleteArchivedFile);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleDelete = async (file: ArchivedFile) => {
    if (!confirm("Удалить файл из архива и из хранилища?")) return;
    try {
      const res = await fetch(`/api/files/storage?url=${encodeURIComponent(file.url)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete failed");
    } catch (e) {
      console.error("[archive] delete failed:", e);
    } finally {
      deleteFile(file.id);
    }
  };

  if (files.length === 0) {
    return (
      <div className="text-[10px] text-zinc-500 font-mono text-center py-6">
        Архив пуст
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((file) => {
        const isMedia = file.mimeType?.startsWith("audio/") || file.mimeType?.startsWith("video/");
        const isImage = file.mimeType?.startsWith("image/");
        const expanded = expandedId === file.id;
        return (
          <div
            key={file.id}
            className="rounded bg-zinc-900/50 border border-cyan-400/10 shadow-[inset_0_1px_rgba(255,255,255,0.05)] group"
          >
            <div className="flex items-center justify-between p-2">
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : file.id)}
                className="flex items-center gap-2 min-w-0 flex-1 text-left"
              >
                {isImage && file.url ? (
                  <img src={file.url} alt={file.prompt || "file"} className="h-8 w-8 rounded object-cover border border-zinc-700" />
                ) : (
                  <FileIcon mimeType={file.mimeType} />
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] text-zinc-300 font-mono truncate">
                    {file.prompt || file.url.split("/").pop() || "Файл"}
                  </span>
                  <span className="text-[8px] text-zinc-600">
                    {formatDate(file.createdAt)} · {file.mimeType}
                  </span>
                </div>
              </button>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isMedia && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/20"
                    onClick={() => setExpandedId(expanded ? null : file.id)}
                    title={expanded ? "Свернуть" : "Воспроизвести"}
                  >
                    {expanded ? <ChevronUp className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/20"
                  onClick={() => void downloadFile(file)}
                >
                  <Download className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-red-400 hover:text-red-200 hover:bg-red-500/20"
                  onClick={() => void handleDelete(file)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {expanded && isMedia && (
              <div className="px-2 pb-2">
                <MediaPlayer
                  url={file.url}
                  mimeType={file.mimeType ?? "audio/mpeg"}
                  type={(file.mimeType ?? "").startsWith("video/") ? "video" : "audio"}
                />
              </div>
            )}
            {expanded && isImage && (
              <div className="px-2 pb-2">
                <img src={file.url} alt={file.prompt || "file"} className="w-full rounded border border-zinc-700 max-h-64 object-contain bg-black/30" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
