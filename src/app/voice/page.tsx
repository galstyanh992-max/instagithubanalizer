"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HolographicPanel } from "@/components/futuristic/holographic-panel";
import { Button } from "@/components/ui/button";
import VoiceWaveform from "@/components/three/voice-waveform";
import { Mic, MicOff, Volume2, AlertTriangle, Sparkles, History } from "lucide-react";
import { JarwisyanAICore } from "@/components/three/JarwisyanAICore";

// Web Speech API typing
type SpeechRecognitionType = typeof window extends { SpeechRecognition: infer T }
  ? T
  : { new (): SpeechRecognitionLike };

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
}

const EXAMPLE_COMMANDS = [
  "Проанализируй репозиторий",
  "Покажи лучшие проекты для Agent OS",
  "Сравни docling и MegaParse",
  "Какие репозитории запустятся на моём ПК?",
  "Прочитай вердикт вслух",
  "Добавь репозиторий в избранное",
  "Создай план установки",
  "Покажи рискованные лицензии",
  "Подключи мой проект",
  "Создай план интеграции",
];

export default function VoicePage() {
  const router = useRouter();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [history, setHistory] = useState<Array<{ transcript: string; response: string; ts: string }>>([]);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const SR = (window as unknown as { SpeechRecognition?: SpeechRecognitionType; webkitSpeechRecognition?: SpeechRecognitionType }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionType }).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.lang = "ru-RU";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? "";
      setTranscript(text);
      handleCommand(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
  }, []);

  function startListening() {
    if (!recognitionRef.current) return;
    setTranscript("");
    setResponse("");
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      // already started
    }
  }
  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  async function handleCommand(text: string) {
    try {
      const res = await fetch("/api/voice/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setResponse(data.spokenResponse);
      setHistory((prev) => [{ transcript: text, response: data.spokenResponse, ts: new Date().toISOString() }, ...prev].slice(0, 20));

      // Speak
      const u = new SpeechSynthesisUtterance(data.spokenResponse);
      u.lang = "ru-RU";
      speechSynthesis.cancel();
      speechSynthesis.speak(u);

      // Navigate if action demands
      if (data.action === "navigate" && data.payload?.path) {
        setTimeout(() => router.push(data.payload.path), 1500);
      }
    } catch (e) {
      setResponse("Не удалось обработать команду: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-mono text-2xl font-bold neon-text">ГОЛОСОВОЙ ИНТЕРФЕЙС</h1>
        <p className="text-xs text-zinc-500">Общайтесь с ИИ Jarwisyan через браузерный Web Speech API</p>
      </div>

      {!supported && (
        <HolographicPanel accent="amber" className="flex items-center gap-3 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-300" />
          <div className="text-sm text-amber-100">
            Ваш браузер не поддерживает Web Speech API. Попробуйте Chrome или Edge.
            Ниже можно вводить команды вручную.
          </div>
        </HolographicPanel>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Ядро ИИ + waveform — без контейнера, парит на фоне */}
        <div className="relative flex flex-col items-center justify-center gap-4 p-4 sm:p-6 lg:col-span-1">
          <div className="w-full max-w-[240px] sm:max-w-[280px]">
            <JarwisyanAICore size="md" active={listening} compact />
          </div>
          <VoiceWaveform active={listening} />
          <div className="flex gap-2">
            <Button onClick={startListening} disabled={!supported || listening}>
              <Mic className="mr-1 h-4 w-4" /> СТАРТ
            </Button>
            <Button variant="outline" onClick={stopListening} disabled={!listening}>
              <MicOff className="mr-1 h-4 w-4" /> СТОП
            </Button>
          </div>
        </div>

        {/* Транскрипт и ответ */}
        <div className="space-y-4 lg:col-span-2">
          <HolographicPanel accent="magenta" className="p-4">
            <div className="text-[10px] uppercase text-zinc-500">Транскрипт</div>
            <div className="mt-2 min-h-12 rounded bg-zinc-900/60 p-2 text-sm text-cyan-200">
              {transcript || <span className="text-zinc-600">Слушаю...</span>}
            </div>
          </HolographicPanel>

          <HolographicPanel accent="lime" className="p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase text-zinc-500">
              <Volume2 className="h-3 w-3" /> Ответ ИИ
            </div>
            <div className="mt-2 min-h-12 rounded bg-zinc-900/60 p-2 text-sm text-lime-200">
              {response || <span className="text-zinc-600">Ожидаю команду...</span>}
            </div>
          </HolographicPanel>

          {/* Примеры команд */}
          <HolographicPanel accent="cyan" className="p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase text-zinc-500">
              <Sparkles className="h-3 w-3" /> Примеры команд
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {EXAMPLE_COMMANDS.map((c) => (
                <button
                  key={c}
                  onClick={() => { setTranscript(c); handleCommand(c); }}
                  className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-200 hover:bg-cyan-500/20"
                >
                  {c}
                </button>
              ))}
            </div>
          </HolographicPanel>
        </div>
      </div>

      {/* История */}
      <HolographicPanel accent="amber" className="p-4">
        <div className="flex items-center gap-2 text-[10px] uppercase text-zinc-500">
          <History className="h-3 w-3" /> История команд
        </div>
        <div className="mt-2 max-h-60 space-y-2 overflow-y-auto">
          {history.length === 0 && <div className="text-xs text-zinc-600">Команд пока нет</div>}
          {history.map((h, i) => (
            <div key={i} className="rounded border border-amber-400/20 bg-zinc-900/60 p-2 text-xs">
              <div className="text-cyan-200">{h.transcript}</div>
              <div className="mt-1 text-zinc-400">{h.response}</div>
              <div className="mt-1 text-[10px] text-zinc-600">{new Date(h.ts).toLocaleTimeString("ru-RU")}</div>
            </div>
          ))}
        </div>
      </HolographicPanel>
    </div>
  );
}
