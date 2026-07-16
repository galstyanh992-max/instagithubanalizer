"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Download, Maximize2, Loader2, RotateCcw, RotateCw } from "lucide-react";

interface MediaPlayerProps {
  url: string;
  mimeType: string;
  type: "audio" | "video";
}

export function MediaPlayer({ url, mimeType, type }: MediaPlayerProps) {
  const mediaRef = useRef<HTMLMediaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isVideo = type === "video";

  const togglePlay = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    if (media.paused) {
      void media.play();
    } else {
      media.pause();
    }
  }, []);

  const skip = useCallback((seconds: number) => {
    const media = mediaRef.current;
    if (!media) return;
    media.currentTime = Math.min(Math.max(0, media.currentTime + seconds), duration);
  }, [duration]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const media = mediaRef.current;
    if (!media || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    media.currentTime = pct * duration;
  }, [duration]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    setMuted(v === 0);
    if (mediaRef.current) {
      mediaRef.current.volume = v;
      mediaRef.current.muted = v === 0;
    }
  }, []);

  const toggleMute = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    const newMuted = !muted;
    setMuted(newMuted);
    media.muted = newMuted;
    if (!newMuted && volume === 0) {
      setVolume(0.5);
      media.volume = 0.5;
    }
  }, [muted, volume]);

  const requestFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen?.();
    }
  }, []);

  const handleDownload = useCallback(() => {
    const a = document.createElement("a");
    a.href = `/api/files/storage?url=${encodeURIComponent(url)}`;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [url]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const onLoadedMetadata = () => {
      setDuration(media.duration || 0);
      setLoading(false);
    };
    const onTimeUpdate = () => setCurrentTime(media.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onError = () => {
      setError("Не удалось загрузить медиа. Попробуйте скачать файл.");
      setLoading(false);
    };

    media.addEventListener("loadedmetadata", onLoadedMetadata);
    media.addEventListener("timeupdate", onTimeUpdate);
    media.addEventListener("play", onPlay);
    media.addEventListener("pause", onPause);
    media.addEventListener("waiting", onWaiting);
    media.addEventListener("canplay", onCanPlay);
    media.addEventListener("error", onError);

    return () => {
      media.removeEventListener("loadedmetadata", onLoadedMetadata);
      media.removeEventListener("timeupdate", onTimeUpdate);
      media.removeEventListener("play", onPlay);
      media.removeEventListener("pause", onPause);
      media.removeEventListener("waiting", onWaiting);
      media.removeEventListener("canplay", onCanPlay);
      media.removeEventListener("error", onError);
    };
  }, []);

  const fmt = (s: number) => {
    if (!isFinite(s) || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`relative w-full mt-2 rounded-xl overflow-hidden border border-zinc-700/60 bg-black/50 ${
        isVideo ? "max-h-64" : ""
      }`}
    >
      {isVideo ? (
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          src={url}
          className="w-full max-h-64 bg-black"
          onClick={togglePlay}
          preload="metadata"
        />
      ) : (
        <div className="relative p-3 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80">
          <audio ref={mediaRef as React.RefObject<HTMLAudioElement>} src={url} preload="metadata" className="hidden" />
          {/* Visualizer placeholder when not playing */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 text-zinc-950 shadow-[0_0_15px_rgba(34,211,238,0.5)] hover:shadow-[0_0_20px_rgba(34,211,238,0.8)] transition-all active:scale-95"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : playing ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {playing && (
                  <div className="flex items-end gap-0.5 h-6">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className="w-1 bg-cyan-400 rounded-full animate-pulse"
                        style={{
                          height: `${20 + Math.sin((Date.now() / 200) + i) * 50}%`,
                          animation: `pulse 0.${3 + i * 2}s ease-in-out infinite alternate`,
                          animationDelay: `${i * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
                <div className="text-[10px] font-mono text-cyan-300/80 truncate">{mimeType}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video play overlay */}
      {isVideo && !playing && !loading && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
        >
          <span className="flex items-center justify-center w-14 h-14 rounded-full bg-cyan-500/90 text-zinc-950 shadow-[0_0_20px_rgba(34,211,238,0.6)]">
            <Play className="h-6 w-6 ml-1" />
          </span>
        </button>
      )}

      {loading && isVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-950/40 text-red-200 text-[10px] font-mono px-4 text-center">
          {error}
        </div>
      )}

      {/* Controls bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-black/60 border-t border-zinc-700/60 text-zinc-200">
        {!isVideo && (
          <button
            type="button"
            onClick={togglePlay}
            className="shrink-0 text-cyan-300 hover:text-cyan-100"
            title={playing ? "Пауза" : "Воспроизвести"}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
        )}
        {isVideo && (
          <button
            type="button"
            onClick={togglePlay}
            className="shrink-0 text-cyan-300 hover:text-cyan-100"
            title={playing ? "Пауза" : "Воспроизвести"}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
        )}

        <button
          type="button"
          onClick={() => skip(-10)}
          className="shrink-0 text-zinc-400 hover:text-cyan-300"
          title="Назад 10с"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>

        {/* Progress bar */}
        <div
          className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden cursor-pointer group/progress relative"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-[width] duration-100"
            style={{ width: `${progressPct}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.8)] opacity-0 group-hover/progress:opacity-100 transition-opacity"
            style={{ left: `calc(${progressPct}% - 6px)` }}
          />
        </div>

        <button
          type="button"
          onClick={() => skip(10)}
          className="shrink-0 text-zinc-400 hover:text-cyan-300"
          title="Вперёд 10с"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>

        <span className="text-[10px] font-mono text-zinc-400 tabular-nums shrink-0">
          {fmt(currentTime)} / {fmt(duration)}
        </span>

        {/* Volume */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={toggleMute}
            className="text-zinc-400 hover:text-cyan-300"
            title={muted ? "Включить звук" : "Выключить звук"}
          >
            {muted || volume === 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-12 h-1 accent-cyan-400 cursor-pointer hidden sm:block"
          />
        </div>

        {isVideo && (
          <button
            type="button"
            onClick={requestFullscreen}
            className="shrink-0 text-zinc-400 hover:text-cyan-300"
            title="Полный экран"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={handleDownload}
          className="shrink-0 text-zinc-400 hover:text-cyan-300"
          title="Скачать"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}