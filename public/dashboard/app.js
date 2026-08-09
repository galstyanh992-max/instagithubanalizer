(() => {
  "use strict";
  const stage = document.getElementById("avatarStage");
  const status = document.getElementById("assistantStatus");
  const toast = document.getElementById("toast");
  const form = document.getElementById("commandForm");
  const input = document.getElementById("commandInput");
  const mic = document.getElementById("micButton");
  const toggle3d = document.getElementById("toggle3d");
  const modelState = document.getElementById("modelState");
  let state = "idle";
  let stateTimer;
  let toastTimer;
  let activeMode = "auto";
  let modelReady = false;
  let modelFailed = false;
  let threeEnabled = true;

  const labels = { idle: "ГОТОВА", talking: "ГОВОРИТ", smiling: "УЛЫБАЕТСЯ", laughing: "СМЕЁТСЯ", thinking: "ДУМАЕТ", sleeping: "СПИТ", sad: "ГРУСТИТ", surprised: "УДИВЛЕНА" };

  function showToast(text) {
    toast.textContent = text;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
  }

  function setState(next, options = {}) {
    const previous = state;
    state = next;
    stage.dataset.state = next;
    status.textContent = labels[next] || next.toUpperCase();
    clearTimeout(stateTimer);
    window.dispatchEvent(new CustomEvent("jarvis:avatar-state", { detail: { state: next, previousState: previous, source: options.source || "ui" } }));
    if (options.duration) stateTimer = setTimeout(() => setState(options.returnTo || "idle", { source: "timer" }), options.duration);
  }

  function applyAiEmotion(emotion, options = {}) {
    const durations = { smiling: 2800, laughing: 3200, thinking: 4200, sad: 3600, surprised: 2600, idle: 1200, talking: 5000 };
    if (!labels[emotion]) return;
    if (emotion === "blink") {
      window.dispatchEvent(new CustomEvent("jarvis:avatar-blink"));
      return;
    }
    setState(emotion, { source: "ai", duration: options.duration || durations[emotion] || 3000, returnTo: options.returnTo || "idle" });
  }

  function speak(text) {
    const content = String(text || "Команда принята.");
    const duration = Math.max(1800, Math.min(8000, content.length * 48));
    setState("talking", { source: "speech", duration });
    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(content);
      utterance.lang = "ru-RU";
      utterance.rate = .94;
      utterance.pitch = 1.03;
      utterance.onstart = () => window.dispatchEvent(new CustomEvent("jarvis:voice-pulse", { detail: { level: 1 } }));
      utterance.onboundary = () => window.dispatchEvent(new CustomEvent("jarvis:voice-pulse", { detail: { level: .72 + Math.random() * .28 } }));
      utterance.onend = () => setState("idle", { source: "speech-end" });
      speechSynthesis.speak(utterance);
    }
  }

  function setModelLabel(text, className) {
    modelState.textContent = text;
    toggle3d.classList.remove("is-ready", "is-off", "is-error");
    if (className) toggle3d.classList.add(className);
  }

  window.addEventListener("jarvis:model-progress", (event) => {
    if (!modelReady) setModelLabel(`3D ${event.detail.percent}%`);
  });

  window.addEventListener("jarvis:model-ready", (event) => {
    modelReady = true;
    modelFailed = false;
    threeEnabled = true;
    toggle3d.setAttribute("aria-pressed", "true");
    setModelLabel("FULL 3D LIVE", "is-ready");
    showToast(`ЛИЦЕВОЙ 3D-РИГ АКТИВЕН • ${event.detail.clips.length} СОСТОЯНИЙ`);
  });

  window.addEventListener("jarvis:model-error", () => {
    modelReady = false;
    modelFailed = true;
    setModelLabel("ПОВТОРИТЬ 3D", "is-error");
    showToast("WEBGL НЕДОСТУПЕН • ПОКАЗАНА 2.5D ВЕРСИЯ");
  });

  window.addEventListener("jarvis:model-toggle-result", (event) => {
    threeEnabled = event.detail.enabled;
    if (toggle3d) toggle3d.setAttribute("aria-pressed", String(threeEnabled));
    setModelLabel(threeEnabled ? "FULL 3D LIVE" : "2.5D", threeEnabled ? "is-ready" : "is-off");
  });

  if (toggle3d) {
    toggle3d.addEventListener("click", (event) => {
      event.stopPropagation();
      if (modelFailed) {
        setModelLabel("3D ПЕРЕЗАПУСК");
        window.location.reload();
        return;
      }
      if (!modelReady) {
        showToast("3D-МОДЕЛЬ ЕЩЁ ЗАГРУЖАЕТСЯ");
        return;
      }
      threeEnabled = !threeEnabled;
      window.dispatchEvent(new CustomEvent("jarvis:toggle-3d", { detail: { enabled: threeEnabled } }));
      showToast(threeEnabled ? "ЖИВАЯ 3D-МОДЕЛЬ ВКЛЮЧЕНА" : "ВКЛЮЧЁН РЕЖИМ 2.5D");
    });
  }

  // AI-driven emotions are triggered from live.js via window.JarvisAvatar.setState/emotion.

  // Чат, микрофон, навигация и инструменты подключены к реальным API в live.js

  document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => {
    activeMode = button.dataset.mode;
    showToast(`РЕЖИМ: ${button.getAttribute("aria-label").toUpperCase()}`);
  }));

  stage.addEventListener("pointermove", (event) => {
    const rect = stage.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - .5) * 2));
    const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - .5) * 2));
    window.dispatchEvent(new CustomEvent("jarvis:look", { detail: { x, y } }));
  });
  stage.addEventListener("pointerleave", () => window.dispatchEvent(new CustomEvent("jarvis:look", { detail: { x: 0, y: 0 } })));
  stage.addEventListener("click", () => setState("smiling", { source: "avatar", duration: 1900 }));

  const canvas = document.getElementById("particleCanvas");
  const ctx = canvas.getContext("2d");
  let particles = [];
  function resize() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    particles = Array.from({ length: Math.min(110, Math.floor(innerWidth / 13)) }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: Math.random() * 1.35 + .2, a: Math.random() * .6 + .15, v: Math.random() * .16 + .03 }));
  }
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => { p.y -= p.v; if (p.y < -3) p.y = canvas.height + 3; ctx.fillStyle = `rgba(46,203,255,${p.a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); });
    requestAnimationFrame(draw);
  }
  addEventListener("resize", resize);
  resize();
  draw();

  window.JarvisAvatar = Object.freeze({
    setState,
    getState: () => state,
    speak,
    showToast,
    getMode: () => activeMode,
    blink: () => window.dispatchEvent(new CustomEvent("jarvis:avatar-blink")),
    emotion: applyAiEmotion,
    applyEmotion: applyAiEmotion,
  });
  setTimeout(() => showToast("JARVIS OS • ЭМОЦИИ ПЕРЕДАНЫ ИИ"), 600);
})();
