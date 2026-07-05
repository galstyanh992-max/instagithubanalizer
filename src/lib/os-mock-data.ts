"use client";

import { useState, useEffect } from "react";

export function useOsMetrics() {
  const [metrics, setMetrics] = useState({
    cpu: 12,
    gpu: 4,
    vram: 2.1,
    ram: 18.4,
    temp: 45,
    networkIn: 1.2,
    networkOut: 0.3,
    latency: 140,
    queue: 0,
    tokenUsage: 145020,
    cost: 0.14
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => {
        // Base jitter
        const jitter = (max: number) => (Math.random() * max) - (max / 2);
        
        let newCpu = prev.cpu + jitter(10);
        if (newCpu < 2) newCpu = 2 + Math.random() * 5;
        if (newCpu > 98) newCpu = 90 + Math.random() * 8;

        let newGpu = prev.gpu + jitter(15);
        if (newGpu < 0) newGpu = Math.random() * 5;
        if (newGpu > 100) newGpu = 95 + Math.random() * 5;

        // RAM/VRAM change slowly
        const newRam = prev.ram + jitter(0.5);
        const newVram = prev.vram + jitter(0.2);

        // Temp follows CPU roughly
        const targetTemp = 40 + (newCpu * 0.4);
        const newTemp = prev.temp + (targetTemp - prev.temp) * 0.1 + jitter(2);

        // Network spikes
        const isSpike = Math.random() > 0.8;
        const newNetIn = isSpike ? Math.random() * 25 : Math.random() * 3;
        const newNetOut = isSpike ? Math.random() * 10 : Math.random() * 1;

        // Latency
        let newLat = prev.latency + jitter(20);
        if (newLat < 40) newLat = 40 + Math.random() * 20;

        return {
          cpu: newCpu,
          gpu: newGpu,
          vram: Math.max(0.5, Math.min(24, newVram)),
          ram: Math.max(8, Math.min(64, newRam)),
          temp: Math.max(30, Math.min(95, newTemp)),
          networkIn: newNetIn,
          networkOut: newNetOut,
          latency: newLat,
          queue: Math.random() > 0.9 ? prev.queue + 1 : (Math.random() > 0.5 ? Math.max(0, prev.queue - 1) : prev.queue),
          tokenUsage: prev.tokenUsage + Math.floor(Math.random() * 150),
          cost: prev.cost + 0.0001
        };
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return metrics;
}

export function useOsTimeline() {
  const [events, setEvents] = useState([
    { id: 1, text: "System Initialized", time: new Date().toLocaleTimeString(), type: "info" }
  ]);

  useEffect(() => {
    const possibleEvents = [
      "Planner analyzing request",
      "Architect mapping dependencies",
      "Developer drafting code",
      "Context retrieved from RAG",
      "Security audit passed",
      "QA running unit tests",
      "Database connection refreshed",
      "GitHub polling active",
      "Memory garbage collection",
      "Model latency spike detected"
    ];

    let counter = 2;
    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        const text = possibleEvents[Math.floor(Math.random() * possibleEvents.length)];
        setEvents(prev => {
          const updated = [...prev, { id: counter++, text, time: new Date().toLocaleTimeString(), type: text.includes("spike") ? "warn" : "info" }];
          if (updated.length > 8) return updated.slice(updated.length - 8);
          return updated;
        });
      }
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  return events;
}
