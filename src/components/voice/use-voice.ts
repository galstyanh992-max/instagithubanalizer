'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseVoiceOptions {
  autoSpeak?: boolean
}

interface UseVoiceReturn {
  supported: boolean
  listening: boolean
  transcript: string
  aiResponse: string
  level: number
  start: () => void
  stop: () => void
  reset: () => void
  speak: (text: string) => void
  stopSpeaking: () => void
  speaking: boolean
}

// Minimal types for Web Speech API (TS lib doesn't include them)
interface SpeechRecognitionResultLike {
  0: { transcript: string; confidence: number }
  isFinal: boolean
}
interface SpeechRecognitionEventLike {
  results: { length: number; [index: number]: SpeechRecognitionResultLike }
  resultIndex: number
}
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: unknown) => void) | null
  onend: (() => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

export function useVoice(opts: UseVoiceOptions = {}): UseVoiceReturn {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [level, setLevel] = useState(0)
  const [speaking, setSpeaking] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor
      webkitSpeechRecognition?: SpeechRecognitionCtor
    }
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (Ctor) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSupported(true)
      const rec = new Ctor()
      rec.lang = 'ru-RU'
      rec.continuous = false
      rec.interimResults = true
      rec.onresult = (e) => {
        let final = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          final += e.results[i][0].transcript
        }
        setTranscript(final)
      }
      rec.onerror = () => setListening(false)
      rec.onend = () => setListening(false)
      recognitionRef.current = rec
    }
  }, [])

  // Fake level animation while listening
  useEffect(() => {
    if (!listening) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLevel(0)
      return
    }
    const id = setInterval(() => {
      setLevel(Math.random() * 0.7 + 0.3)
    }, 120)
    return () => clearInterval(id)
  }, [listening])

  const start = useCallback(() => {
    if (!recognitionRef.current) return
    try {
      recognitionRef.current.start()
      setListening(true)
      setTranscript('')
    } catch {
      /* already started */
    }
  }, [])

  const stop = useCallback(() => {
    if (!recognitionRef.current) return
    try {
      recognitionRef.current.stop()
    } catch {
      /* noop */
    }
    setListening(false)
  }, [])

  const reset = useCallback(() => {
    setTranscript('')
    setAiResponse('')
  }, [])

  const speak = useCallback((text: string) => {
    if (opts.autoSpeak === false) return
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ru-RU'
    u.rate = 1
    u.pitch = 1
    u.onstart = () => setSpeaking(true)
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(u)
  }, [opts.autoSpeak])

  const stopSpeaking = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  return {
    supported,
    listening,
    transcript,
    aiResponse,
    level,
    start,
    stop,
    reset,
    speak,
    stopSpeaking,
    speaking,
  }
}
