/* JARVIS LIVE — вся логика UX на нативном UI (Volumetric Silence) */
(() => {
  "use strict";

  const shell = document.getElementById("jarvisApp");
  const A = () => window.JarvisAvatar || {};
  const toast = (t) => (A().showToast ? A().showToast(t) : null);
  const setState = (s, o) => (A().setState ? A().setState(s, o) : null);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };

  /* ═══ FIXED 1920×1080 STAGE ═══
     В режиме fixed-1920 контейнер #jarvis-stage имеет фиксированные
     1920×1080 px и масштабируется целиком через transform: scale.
     При resize меняется только scale — индивидуальные панели не
     пере-позиционируются по window.innerWidth. */
  const FIXED_STAGE_SIZE = { w: 1920, h: 1080 };
  const isFixedStage = () => shell?.dataset.layoutMode === "fixed-1920";

  function applyStageScale() {
    const stage = document.getElementById("jarvis-stage");
    if (!stage) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / FIXED_STAGE_SIZE.w, vh / FIXED_STAGE_SIZE.h);
    stage.style.transform = `scale(${scale})`;
    document.documentElement.style.setProperty("--jarvis-stage-scale", String(scale));
  }
  applyStageScale();
  addEventListener("resize", applyStageScale, { passive: true });

  // В fixed-1920 music-player и .projects-panel не существуют в DOM.
  // Гардим от null-query, чтобы не получить TypeError на $(".panel-foot", null).
  if (!isFixedStage()) {
    const projectsPanel = $(".projects-panel");
    const musicPlayer = $("#musicPlayer");
    const projectsFooter = projectsPanel ? $(".panel-foot", projectsPanel) : null;
    if (projectsPanel && musicPlayer && projectsFooter) {
      projectsPanel.insertBefore(musicPlayer, projectsFooter);
    }
  }

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reducedMotion) {
    $$(".system-panel, .projects-panel").forEach((panel) => {
      panel.addEventListener("pointermove", (event) => {
        const rect = panel.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        panel.style.setProperty("--tilt-x", `${-y * 2.4}deg`);
        panel.style.setProperty("--tilt-y", `${x * 2.8}deg`);
      });
      panel.addEventListener("pointerleave", () => {
        panel.style.setProperty("--tilt-x", "0deg");
        panel.style.setProperty("--tilt-y", "0deg");
      });
    });
  }

  async function api(path, options = {}) {
    const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  /* В fixed-1920 режиме overlay/log должны жить внутри #jarvis-stage,
     чтобы масштабироваться вместе со сценой. */
  const stageRoot = (() => {
    if (!isFixedStage()) return shell;
    const stage = document.getElementById("jarvis-stage");
    return stage || shell;
  })();

  /* ══ ДОСКА ЧАТА ══ */
  const log = el("div", "chat-log");
  log.id = "chatLog";
  stageRoot.appendChild(log);
  let logTimer;

  function constrainChatPanel() {
    const panel = $(".chat-panel");
    if (!panel) return;
    // FIXED-1920: chat-panel позиционируется CSS абсолютно внутри stage.
    // Не делаем viewport-relative расчёт. Сбрасываем инлайн-стили, чтобы
    // CSS-правила #jarvisApp[data-layout-mode="fixed-1920"] .chat-panel
    // корректно применялись.
    if (isFixedStage()) {
      panel.style.left = "";
      panel.style.right = "";
      panel.style.width = "";
      panel.style.maxWidth = "";
      return;
    }
    const sp = $(".system-panel");
    const pp = $(".projects-panel");
    if (!sp || !pp) return;
    const host = shell.getBoundingClientRect();
    const vw = host.width;
    const spR = sp.getBoundingClientRect();
    const ppR = pp.getBoundingClientRect();
    const gap = 14;
    const available = ppR.left - spR.right - gap * 2;
    const maxHalf = Math.max(320, Math.floor(vw / 2) - 8);
    const desiredWidth = Math.min(available, maxHalf, 960);
    const center = (spR.right + ppR.left) / 2;
    const left = center - desiredWidth / 2;
    panel.style.left = `${left}px`;
    panel.style.right = `${host.width - (left + desiredWidth)}px`;
    panel.style.width = `${desiredWidth}px`;
    panel.style.maxWidth = `${desiredWidth}px`;
  }

  function layoutChatLog() {
    const panel = $(".chat-panel");
    if (!panel) return;
    constrainChatPanel();
    if (isFixedStage()) {
      // Chat-log внутри fixed stage: координаты в системе stage (px),
      // не зависят от viewport. Chat-panel: top 820 → log bottom = 270.
      log.style.left = "300px";
      log.style.right = "300px";
      log.style.width = "";
      log.style.bottom = "270px";
      log.style.maxHeight = "520px";
      return;
    }
    const p = panel.getBoundingClientRect();
    const host = shell.getBoundingClientRect();
    log.style.left = `${p.left - host.left}px`;
    log.style.width = `${p.width}px`;
    log.style.bottom = `${host.bottom - p.top + 10}px`;
    log.style.maxHeight = `${Math.max(140, p.top - host.top - 170)}px`;
  }
  addEventListener("resize", layoutChatLog);
  requestAnimationFrame(layoutChatLog);
  setTimeout(layoutChatLog, 400);
  addEventListener("DOMContentLoaded", layoutChatLog);
  setTimeout(layoutChatLog, 1000);

  function pushMsg(role, text, actions) {
    const box = el("div", `msg ${role}`);
    box.innerHTML = `<b>${role === "user" ? "ВЫ" : role === "err" ? "ОШИБКА" : "ДЖАРВИС"}</b>`;
    box.appendChild(document.createTextNode(text));
    if (actions && actions.length) {
      const bar = el("div", "msg-actions");
      actions.forEach((a) => {
        const b = el("button"); b.type = "button"; b.textContent = a.label;
        b.addEventListener("click", () => runAction(a));
        bar.appendChild(b);
      });
      box.appendChild(bar);
    }
    log.appendChild(box);
    layoutChatLog();
    log.classList.add("is-visible");
    log.scrollTop = log.scrollHeight;
    clearTimeout(logTimer);
    logTimer = setTimeout(() => log.classList.remove("is-visible"), 45000);
  }

  /* ══ REMOTE CAPABILITY COMMANDS ══
     This cockpit (public/dashboard/*) is a standalone, no-build vanilla-JS
     page — a separate runtime from the React tree (src/components/jarvis/
     use-jarvis.ts + parse-remote-capability-command.ts also implement this
     same phrase-detection + task-create-and-poll flow, but that hook is
     only reachable from JarvisUnifiedConsole, which nothing currently
     mounts). Duplicated here, deliberately, rather than imported, because
     this file has no bundler/module system; the phrase list and the real
     execution chain (POST /api/devices/[id]/commands ->
     src/daemon/capabilities/** -> GET /api/tasks/[id] polling) are the
     same contract described in src/lib/jarvis/capabilities/envelope.ts. */
  const REMOTE_CAPABILITY_PATTERNS = [
    { re: /скажи состояние систем|состояние систем[ыа]|как дела (с )?систем/i, capability: "system", operation: "status", confirmation: "Проверяю состояние системы на HOME-PC…" },
    { re: /как[иа]е модели ollama установлен|список моделей ollama|модели ollama/i, capability: "ollama", operation: "models", confirmation: "Запрашиваю список моделей Ollama на HOME-PC…" },
    { re: /покажи файлы корня проекта|файлы корня проекта|листинг проекта/i, capability: "filesystem", operation: "list", confirmation: "Получаю листинг корня проекта на HOME-PC…" },
    { re: /покажи активные mcp сервер|активные mcp|список mcp сервер/i, capability: "mcp", operation: "list", confirmation: "Проверяю активные MCP-серверы на HOME-PC…" },
    { re: /открой браузер и безопасн(ую|ой) тестов(ую|ой) страниц|открой браузер и тестовую страницу/i, capability: "browser", operation: "open", confirmation: "Открываю браузер и безопасную тестовую страницу на HOME-PC…" },
    { re: /запусти (safe )?smoke[- ]?тест n8n|проверь n8n smoke|smoke workflow n8n/i, capability: "n8n", operation: "smoke", confirmation: "Запускаю проверенный smoke-workflow n8n на HOME-PC…" },
    { re: /состояние n8n|n8n запущен/i, capability: "n8n", operation: "health", confirmation: "Проверяю состояние n8n на HOME-PC…" },
  ];

  function matchRemoteCapability(text) {
    const t = (text || "").toLowerCase();
    for (const entry of REMOTE_CAPABILITY_PATTERNS) {
      if (entry.re.test(t)) return entry;
    }
    return null;
  }

  async function pollTaskUntilDone(taskId, timeoutMs = 180000, intervalMs = 1500) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      try {
        const data = await api(`/api/tasks/${encodeURIComponent(taskId)}`);
        const task = data.task;
        if (task && (task.status === "succeeded" || task.status === "failed")) return task;
      } catch { /* transient — keep polling until timeout */ }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error("Превышено время ожидания выполнения команды на HOME-PC");
  }

  function summarizeCapabilityResult(resultJson) {
    if (!resultJson) return "Готово.";
    try {
      const parsed = JSON.parse(resultJson);
      const pretty = JSON.stringify(parsed, null, 2);
      return pretty.length > 3000 ? pretty.slice(0, 3000) + "\n… (обрезано)" : pretty;
    } catch { return resultJson; }
  }

  async function runRemoteCapability(match) {
    pushMsg("bot", match.confirmation);
    setState("thinking", { source: "chat" });
    try {
      const statusData = await api("/api/devices/status");
      const devices = statusData.devices || [];
      const device = devices.find((d) => d.status === "ONLINE") || devices[0];
      if (!device) throw new Error("Нет зарегистрированных устройств HOME-PC");
      if (device.status !== "ONLINE") throw new Error(`Устройство «${device.name}» сейчас OFFLINE — команда не может быть выполнена`);

      const idempotencyKey = `chat:${device.id}:${match.capability}:${match.operation}:${Date.now()}`;
      const createData = await api(`/api/devices/${encodeURIComponent(device.id)}/commands`, {
        method: "POST",
        body: JSON.stringify({ capability: match.capability, operation: match.operation, idempotencyKey, source: "chat" }),
      });

      const finalTask = await pollTaskUntilDone(createData.task.id);
      const succeeded = finalTask.status === "succeeded";
      const resultText = succeeded
        ? summarizeCapabilityResult(finalTask.result)
        : `Ошибка выполнения на HOME-PC: ${finalTask.result || "неизвестная ошибка"}`;
      pushMsg(succeeded ? "bot" : "err", resultText);
      setState(succeeded ? "smiling" : "sad", { duration: 2200 });
      if (succeeded) speak("Готово. Результат в чате.");
    } catch (e) {
      pushMsg("err", e.message);
      setState("sad", { duration: 2400 });
    } finally {
      refreshEntities();
    }
  }

  function runAction(action) {
    if (action.type === "navigate") return openModule(action.label || "МОДУЛЬ", action.target);
    if (action.type === "api_call") {
      toast("ВЫПОЛНЯЮ ДЕЙСТВИЕ"); setState("thinking", { source: "action" });
      api(action.target, { method: "POST", body: JSON.stringify(action.payload || {}) })
        .then(() => { toast("ГОТОВО"); setState("smiling", { duration: 1800 }); })
        .catch((e) => { pushMsg("err", e.message); setState("sad", { duration: 2200 }); });
    }
  }

  /* ══ ГОЛОС ══ */
  let audio, pulseTimer;
  async function speak(text) {
    const content = String(text || "").trim();
    if (!content) return;
    const short = content.length > 600 ? content.slice(0, 600) + "…" : content;
    setState("talking", { source: "speech" });
    try {
      const r = await api("/api/tts", { method: "POST", body: JSON.stringify({ text: short }) });
      if (!r.url) throw new Error("no url");
      if (audio) audio.pause();
      audio = new Audio(r.url);
      clearInterval(pulseTimer);
      pulseTimer = setInterval(() => window.dispatchEvent(new CustomEvent("jarvis:voice-pulse", { detail: { level: .6 + Math.random() * .4 } })), 120);
      audio.onended = audio.onerror = () => { clearInterval(pulseTimer); setState("idle", { source: "speech-end" }); };
      await audio.play();
    } catch { if (A().speak) A().speak(short); else setState("idle"); }
  }

  /* ══ ЧАТ ══ */
  const form = $("#commandForm");
  const input = $("#commandInput");
  const chatAttachmentInput = $("#chatAttachmentInput");
  const chatAttachmentButton = $("#chatAttachmentButton");
  const chatAttachments = $("#chatAttachments");
  const history = [];
  let selectedChatFiles = [];
  let chatUploadController = null;

  function renderChatAttachments() {
    if (!chatAttachments) return;
    chatAttachments.replaceChildren();
    selectedChatFiles.forEach((file, index) => {
      const chip = el("div", "chat-attachment");
      const name = el("span");
      name.textContent = `${file.name} · ${Math.ceil(file.size / 1024)} KB`;
      const remove = el("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Удалить ${file.name}`);
      remove.addEventListener("click", () => {
        selectedChatFiles.splice(index, 1);
        renderChatAttachments();
      });
      chip.append(name, remove);
      chatAttachments.appendChild(chip);
    });
  }

  function selectChatFiles(files) {
    const candidates = [...selectedChatFiles, ...files];
    if (candidates.length > 5) return toast("НЕ БОЛЕЕ 5 ВЛОЖЕНИЙ");
    if (candidates.some((file) => file.size > 20 * 1024 * 1024)) return toast("ФАЙЛ БОЛЬШЕ 20 МБ");
    const identities = new Set();
    if (candidates.some((file) => {
      const identity = `${file.name}:${file.size}:${file.lastModified}`;
      if (identities.has(identity)) return true;
      identities.add(identity);
      return false;
    })) return toast("ДУБЛИКАТ ВЛОЖЕНИЯ");
    selectedChatFiles = candidates;
    renderChatAttachments();
  }

  if (chatAttachmentButton && chatAttachmentInput) {
    chatAttachmentButton.addEventListener("click", () => {
      if (chatUploadController) {
        chatUploadController.abort();
        return;
      }
      chatAttachmentInput.click();
    });
    chatAttachmentInput.addEventListener("change", () => {
      selectChatFiles(chatAttachmentInput.files || []);
      chatAttachmentInput.value = "";
    });
  }

  const emotionRe = /\[emotion:\s*([a-z_]+)\]/i;
  const emotionDurations = { smiling: 2800, laughing: 3200, thinking: 4200, sad: 3600, surprised: 2600, idle: 1200 };

  function applyAiEmotionTag(text) {
    const m = text.match(emotionRe);
    if (!m) return text;
    const emotion = m[1].toLowerCase();
    const avatar = window.JarvisAvatar;
    if (avatar && avatar.emotion) avatar.emotion(emotion, { duration: emotionDurations[emotion] || 3200 });
    return text.replace(emotionRe, "").trim();
  }

  async function sendCommand(message) {
    pushMsg("user", message);
    history.push({ role: "user", content: message });

    // Remote capability commands (real system status / Ollama / filesystem
    // / MCP / browser / n8n on HOME-PC, via the daemon) take priority over
    // the general AI chat route — a fundamentally different, task-based
    // flow. See REMOTE_CAPABILITY_PATTERNS above.
    if (selectedChatFiles.length === 0) {
      const capabilityMatch = matchRemoteCapability(message);
      if (capabilityMatch) {
        toast("ЗАПРОС ОТПРАВЛЕН");
        await runRemoteCapability(capabilityMatch);
        return;
      }
    }

    setState("thinking", { source: "chat" });
    toast("ЗАПРОС ОТПРАВЛЕН");
    let uploaded = [];
    try {
      let data;
      if (selectedChatFiles.length) {
        chatUploadController = new AbortController();
        chatAttachmentButton.textContent = "×";
        chatAttachmentButton.setAttribute("aria-label", "Отменить загрузку");
        const formData = new FormData();
        selectedChatFiles.forEach((file) => formData.append("files", file));
        const uploadResponse = await fetch("/api/chat/attachments", {
          method: "POST",
          body: formData,
          signal: chatUploadController.signal,
        });
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadData.error || `HTTP ${uploadResponse.status}`);
        uploaded = uploadData.attachments || [];
        data = await api("/api/jarvis/orchestrate", {
          method: "POST",
          body: JSON.stringify({ message, attachmentIds: uploaded.map((item) => item.id) }),
        });
        if (!data.ok) throw new Error(data.error || "Attachment request failed");
      } else {
        data = await api("/api/chat", { method: "POST", body: JSON.stringify({ message, history: history.slice(-10) }) });
      }
      let reply = data.reply || data.result || "Пустой ответ.";
      reply = applyAiEmotionTag(reply);
      if (data.emotion && window.JarvisAvatar && window.JarvisAvatar.emotion) {
        window.JarvisAvatar.emotion(data.emotion, { duration: emotionDurations[data.emotion] || 3200 });
      }
      history.push({ role: "assistant", content: reply });
      pushMsg("bot", reply, data.actions);
      if (data.fallbackUsed) toast("AI PROVIDER: FALLBACK");
      speak(reply);
      // Execute a server-emitted UI action (e.g. navigate to a section).
      if (data.uiAction && data.uiAction.type === "navigate" && data.uiAction.path) {
        const label = (data.task && data.task.type) || "РАЗДЕЛ";
        openModule(label, data.uiAction.path);
      }
      refreshEntities();
      selectedChatFiles = [];
      renderChatAttachments();
    } catch (e) {
      await Promise.all(uploaded.filter((item) => !item.duplicate).map((item) =>
        fetch(`/api/chat/attachments/${encodeURIComponent(item.id)}`, { method: "DELETE" }).catch(() => undefined)
      ));
      pushMsg("err", e.message); setState("sad", { duration: 2400 }); toast("ОШИБКА ЗАПРОСА");
    } finally {
      chatUploadController = null;
      if (chatAttachmentButton) {
        chatAttachmentButton.textContent = "＋";
        chatAttachmentButton.setAttribute("aria-label", "Добавить вложения");
      }
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const c = input.value.trim();
    if (!c) return toast("ВВЕДИТЕ КОМАНДУ");
    input.value = "";
    submitPrompt(c);
  });

  /* ══ МИКРОФОН ══ */
  const mic = $("#micButton");
  const status = $("#assistantStatus");
  mic.addEventListener("click", () => {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) return speak("Распознавание речи не поддерживается этим браузером.");
    const rec = new R();
    rec.lang = "ru-RU"; rec.interimResults = false;
    mic.classList.add("is-active"); status.textContent = "СЛУШАЮ";
    rec.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      pushMsg("user", transcript);
      setState("thinking", { source: "voice" });
      // Voice uses the same in-project browser path as typed chat commands.
      // Do this before the generic voice-command API can route elsewhere.
      if (await handleBrowserChatCommand(transcript)) return;
      try {
        const routed = await api("/api/voice/command", { method: "POST", body: JSON.stringify({ transcript }) });
        const d = routed.routed || {};
        if (d.nextAction && d.nextAction !== "execute_safe_action") {
          const m = d.message || d.reason || "Команда требует подтверждения.";
          pushMsg("bot", m); speak(m); return;
        }
        // Voice navigation: if the command router resolved a navigate action,
        // open the target section directly.
        const navResult = routed.result;
        if (navResult && navResult.action === "navigate" && navResult.payload && navResult.payload.path) {
          const reply = navResult.spokenResponse || `Открываю раздел.`;
          pushMsg("bot", reply); speak(reply);
          openModule("РАЗДЕЛ", navResult.payload.path);
          return;
        }
        const reply = (navResult && (navResult.response || navResult.message)) || null;
        if (reply) { pushMsg("bot", reply); speak(reply); return; }
        sendCommand(transcript);
      } catch { sendCommand(transcript); }
    };
    rec.onerror = () => { mic.classList.remove("is-active"); setState("idle"); };
    rec.onend = () => mic.classList.remove("is-active");
    rec.start();
  });

  /* ══ МОДУЛЬ ══ */
  const overlay = el("section", "module-overlay", `
    <div class="module-head"><span id="moduleTitle">Модуль</span><div class="module-actions"><button type="button" id="moduleExpand" aria-pressed="false">Развернуть ⤢</button><button type="button" id="moduleClose">Закрыть ✕</button></div></div>
    <div class="module-body" id="moduleBody"></div>`);
  stageRoot.appendChild(overlay);
  const moduleTitle = $("#moduleTitle", overlay);
  const moduleBody = $("#moduleBody", overlay);
  $("#moduleClose", overlay).addEventListener("click", closeModule);
  $("#moduleExpand", overlay).addEventListener("click", () => {
    const expanded = overlay.classList.toggle("is-maximized");
    const button = $("#moduleExpand", overlay);
    button.setAttribute("aria-pressed", String(expanded));
    button.textContent = expanded ? "Обычный размер ⤡" : "Развернуть ⤢";
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModule(); });

  function layoutModule() {
    if (isFixedStage()) {
      // FIXED-1920: module-overlay позиционируется CSS абсолютно внутри stage.
      // Не переопределяем viewport-relative расчётами.
      overlay.style.left = "";
      overlay.style.right = "";
      overlay.style.top = "";
      overlay.style.bottom = "";
      overlay.style.width = "";
      overlay.style.maxWidth = "";
      constrainChatPanel();
      return;
    }
    const host = shell.getBoundingClientRect();
    const left = $(".system-panel"), right = $(".projects-panel"), chat = $(".chat-panel"), tools = $(".unified-top-panel");
    const lr = left && getComputedStyle(left).display !== "none" ? left.getBoundingClientRect() : null;
    const rr = right && getComputedStyle(right).display !== "none" ? right.getBoundingClientRect() : null;
    const cr = chat ? chat.getBoundingClientRect() : null;
    const tr = tools ? tools.getBoundingClientRect() : { bottom: host.top + 80 };
    /* стеклянный правый сайдбар: ширина ~min(460px, ...) */
    const rightGap = rr ? (host.right - rr.left) + 14 : 26;
    const leftGap = lr ? (lr.right - host.left) + 14 : 14;
    overlay.style.left = `${leftGap}px`;
    overlay.style.right = `${rightGap}px`;
    overlay.style.top = `${tr.bottom - host.top + 14}px`;
    const bottomBase = cr ? cr.top : host.bottom;
    overlay.style.bottom = `${host.bottom - bottomBase + 14}px`;
    overlay.style.width = "auto";
    overlay.style.maxWidth = "none";
    constrainChatPanel();
  }
  addEventListener("resize", layoutModule);

  function closeModule() {
    overlay.classList.remove("is-open", "browser-workspace", "is-maximized");
    const button = $("#moduleExpand", overlay);
    button.setAttribute("aria-pressed", "false");
    button.textContent = "Развернуть ⤢";
    moduleBody.innerHTML = "";
  }
  function openShell(title, options = {}) {
    moduleTitle.textContent = title;
    moduleBody.innerHTML = "";
    overlay.classList.remove("is-maximized");
    const button = $("#moduleExpand", overlay);
    button.setAttribute("aria-pressed", "false");
    button.textContent = "Развернуть ⤢";
    overlay.classList.toggle("browser-workspace", Boolean(options.browserWorkspace));
    layoutModule();
    overlay.classList.add("is-open");
  }
  function fitIframeHeight(iframe) {
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const h = Math.max(doc.documentElement.scrollHeight, doc.body ? doc.body.scrollHeight : 0, moduleBody.clientHeight);
      iframe.style.height = `${h}px`;
    } catch {}
  }
  function openModule(title, route) {
    openShell(String(title));
    const f = el("iframe");
    f.onload = () => {
      fitIframeHeight(f);
      // Next.js routes hydrate and expand after load; poll until height is stable
      let last = 0, stable = 0;
      const iv = setInterval(() => {
        try {
          const doc = f.contentDocument;
          const h = Math.max(doc.documentElement.scrollHeight, doc.body ? doc.body.scrollHeight : 0, moduleBody.clientHeight);
          if (h !== last) { last = h; stable = 0; f.style.height = `${h}px`; }
          else if (++stable >= 6) clearInterval(iv);
        } catch { clearInterval(iv); }
      }, 160);
      setTimeout(() => clearInterval(iv), 3200);
      try {
        const win = f.contentWindow;
        if (win) win.addEventListener("resize", () => fitIframeHeight(f));
      } catch {}
    };
    f.src = route;
    moduleBody.appendChild(f);
  }
  function openText(title, text) { openShell(String(title)); const b = el("div", "module-text"); b.textContent = text; moduleBody.appendChild(b); }

  /* ══ ТЕРМИНАЛ ══ */
  let termSession = null;
  function openTerminal() {
    openShell("Терминал");
    moduleBody.innerHTML = `<div class="term">
      <div class="term-out" id="termOut">JARVIS SHELL · локальные команды\n</div>
      <form class="term-in" id="termForm"><input id="termInput" autocomplete="off" placeholder="команда..." /></form></div>`;
    const out = $("#termOut", moduleBody), inp = $("#termInput", moduleBody);
    inp.focus();
    $("#termForm", moduleBody).addEventListener("submit", async (e) => {
      e.preventDefault();
      const command = inp.value.trim();
      if (!command) return;
      inp.value = "";
      const line = el("div", "cmd"); line.textContent = `> ${command}`; out.appendChild(line);
      try {
        const r = await api("/api/terminal/exec", { method: "POST", body: JSON.stringify({ sessionId: termSession, command }) });
        termSession = r.sessionId || termSession;
        const res = el("div", r.stderr ? "err" : "");
        res.textContent = (r.stdout || "") + (r.stderr || "") || `[exit ${r.exitCode}] ${r.cwd || ""}`;
        out.appendChild(res);
      } catch (err) { const res = el("div", "err"); res.textContent = err.message; out.appendChild(res); }
      out.scrollTop = out.scrollHeight;
    });
  }

  /* ══ НАВИГАЦИЯ И ИНСТРУМЕНТЫ ══ */
  const NAV = { dashboard: ["Дашборд", "/dashboard"], projects: ["Проекты", "/projects"], agents: ["Агенты", "/agents"],
    memory: ["Память · Graphify", "/graphify"], analytics: ["Аналитика / GitHub", "/upload"], system: ["Система", "/settings"], settings: ["Настройки", "/settings"] };
  const TOOLS = { agents: ["Агенты", "/agents"], code: ["Репозитории", "/repos"], web: ["Watchlist", "/watchlist"],
    files: ["Файлы", "/upload"], database: ["Память · Graphify", "/graphify"], projects: ["Проекты", "/projects"],
    tasks: ["Задачи", "/board"], whatsapp: ["Phone Bridge", "/phone"], telegram: ["Telegram", "/phone"], instagram: ["Phone Bridge", "/phone"] };

  $$("[data-nav]").forEach((b) => b.addEventListener("click", () => {
    $$("[data-nav]").forEach((o) => o.classList.toggle("is-on", o === b));
    const r = NAV[b.dataset.nav]; if (r) openModule(r[0], r[1]);
  }));

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".tool-dropdown")) {
      document.querySelectorAll(".tool-dropdown").forEach((d) => {
        d.classList.remove("is-open");
        const btn = d.querySelector("button");
        if (btn) btn.setAttribute("aria-expanded", "false");
      });
    }
  });

  const BROWSER_TARGETS = {
    web: { title: "Веб-агент JARVIS", url: "https://www.google.com/" },
    vscode: { title: "VS Code Web", url: "https://vscode.dev/" },
    zai: { title: "Z.ai", url: "https://z.ai/" },
    aistudio: { title: "Google AI Studio", url: "https://aistudio.google.com/" },
  };
  let activeBrowserTabId = null;
  let activeBrowserTarget = BROWSER_TARGETS.web;

  function browserScreenshotUrl(snapshot) {
    const shot = snapshot?.screenshot;
    if (shot && typeof shot === "object" && shot.data) return `data:image/png;base64,${shot.data}`;
    if (typeof shot === "string" && shot) return shot.startsWith("data:") ? shot : `data:image/png;base64,${shot}`;
    return "";
  }

  function updateBrowserPreview(snapshot) {
    const stage = $("#browserViewerStage", moduleBody);
    const status = $("#browserViewerStatus", moduleBody);
    if (!stage) return;
    const imageUrl = browserScreenshotUrl(snapshot);
    stage.innerHTML = "";
    if (imageUrl) {
      const image = el("img", "browser-viewer-image");
      image.src = imageUrl;
      image.alt = snapshot?.title || "Страница веб-агента";
      stage.appendChild(image);
      if (status) status.textContent = snapshot?.title ? `Страница: ${snapshot.title}` : "Снимок страницы обновлён.";
    } else {
      const empty = el("div", "browser-viewer-empty");
      empty.textContent = "Страница загружается в браузере агента…";
      stage.appendChild(empty);
      if (status) status.textContent = "Ожидание снимка страницы…";
    }
  }

  function openBrowserViewer(target, tabId, snapshot = null) {
    openShell(`Веб-агент · ${target.title}`, { browserWorkspace: true });
    const viewer = el("section", "browser-viewer");
    const toolbar = el("div", "browser-viewer-toolbar");
    const address = el("div", "browser-viewer-address");
    address.textContent = target.url;
    const refresh = el("button", "browser-viewer-button");
    refresh.type = "button"; refresh.textContent = "ОБНОВИТЬ ВИД";
    refresh.addEventListener("click", async () => {
      refresh.disabled = true;
      try {
        const fresh = await api("/api/browser/camofox", { method: "POST", body: JSON.stringify({ action: "snapshot", tabId }) });
        updateBrowserPreview(fresh);
      } catch (error) { pushMsg("err", error.message); }
      finally { refresh.disabled = false; }
    });
    toolbar.append(address, refresh);
    const stage = el("div", "browser-viewer-stage");
    stage.id = "browserViewerStage";
    const status = el("div", "browser-viewer-status");
    status.id = "browserViewerStatus";
    status.textContent = `Агент управляет вкладкой ${tabId}.`;
    viewer.append(toolbar, stage, status);
    moduleBody.appendChild(viewer);
    updateBrowserPreview(snapshot);
  }

  async function startBrowserAgent(target = BROWSER_TARGETS.web) {
    setState("thinking", { source: "web" });
    toast("ЗАПУСК ВЕБ-АГЕНТА…");
    try {
      const health = await api("/api/browser/camofox", { method: "POST", body: JSON.stringify({ action: "health" }) });
      if (!health.healthy) throw new Error("Браузерный агент CamoFox недоступен.");

      // Every entry point (Code, the top Web tool, and the chat Web button)
      // reuses this one CamoFox tab and this one in-project workspace.
      if (activeBrowserTabId) {
        if (activeBrowserTarget.url !== target.url) {
          await api("/api/browser/camofox", {
            method: "POST",
            body: JSON.stringify({ action: "navigate", tabId: activeBrowserTabId, url: target.url }),
          });
        }
      } else {
        const tab = await api("/api/browser/camofox", {
          method: "POST",
          body: JSON.stringify({ action: "createTab", url: target.url, sessionId: "jarvis-main" }),
        });
        activeBrowserTabId = tab.tabId;
      }
      activeBrowserTarget = target;
      document.querySelectorAll(".tool-dropdown").forEach((dropdown) => dropdown.classList.remove("is-open"));
      openBrowserViewer(target, activeBrowserTabId);
      toast("ВЕБ-АГЕНТ ГОТОВ");
      setState("smiling", { duration: 1800 });
      void api("/api/browser/camofox", { method: "POST", body: JSON.stringify({ action: "snapshot", tabId: activeBrowserTabId }) })
        .then((snapshot) => { updateBrowserPreview(snapshot); if (snapshot?.title) pushMsg("bot", `Веб-агент: открыта страница «${snapshot.title}».`); })
        .catch(() => {});
    } catch (error) {
      pushMsg("err", error.message);
      toast("ВЕБ-АГЕНТ НЕДОСТУПЕН");
      setState("sad", { duration: 2000 });
    }
  }

  async function handleBrowserChatCommand(text) {
    const value = String(text || "").trim();
    const lower = value.toLowerCase();
    const explicitUrl = value.match(/https?:\/\/[^\s]+/i)?.[0];
    const bareDomain = value.match(/\b(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s]*)?\b/i)?.[0];
    const url = explicitUrl || (bareDomain ? `https://${bareDomain}` : null);
    const browserIntent = url || /(^веб\b|^web\b|(?:открой|зайди|перейди|посети|запусти).*(?:сайт|страниц|браузер|интернет|google|гугл|youtube|ютуб|vscode|z\.ai|ai studio)|(?:найди|поищи).*(?:в интернете|в гугл|в google)|open.*(?:site|browser|vscode|z\.ai|ai studio)|browse|camofox)/i.test(lower);
    if (!browserIntent) return false;
    const clickMatch = value.match(/^(?:веб|web)\s+(?:клик|нажми|click)\s+(e\d+)\s*$/i);
    const typeMatch = value.match(/^(?:веб|web)\s+(?:напиши|введи|type)\s+(e\d+)\s+(.+)$/i);
    const searchMatch = value.match(/^(?:(?:веб|web)\s+)?(?:найди|ищи|поищи|search)\s+(.+)$/i);
    if (clickMatch || typeMatch) {
      if (!activeBrowserTabId) {
        pushMsg("err", "Сначала откройте сайт через веб-агента.");
        return true;
      }
      try {
        if (clickMatch) {
          await api("/api/browser/camofox", { method: "POST", body: JSON.stringify({ action: "click", tabId: activeBrowserTabId, ref: clickMatch[1] }) });
        } else {
          await api("/api/browser/camofox", { method: "POST", body: JSON.stringify({ action: "type", tabId: activeBrowserTabId, ref: typeMatch[1], text: typeMatch[2] }) });
        }
        const snapshot = await api("/api/browser/camofox", { method: "POST", body: JSON.stringify({ action: "snapshot", tabId: activeBrowserTabId }) });
        openBrowserViewer(activeBrowserTarget, activeBrowserTabId, snapshot);
      } catch (error) { pushMsg("err", error.message); }
      return true;
    }
    if (searchMatch) {
      try {
        const snapshot = await api("/api/browser/camofox", { method: "POST", body: JSON.stringify({ action: "searchGoogle", query: searchMatch[1], sessionId: "jarvis-main" }) });
        openText("Поиск веб-агента", snapshot?.snapshot || "Поиск выполнен.");
      } catch (error) { pushMsg("err", error.message); }
      return true;
    }
    if (/список.*вклад|tabs?/.test(lower)) {
      try {
        const result = await api("/api/browser/camofox", { method: "POST", body: JSON.stringify({ action: "listTabs", sessionId: "jarvis-main" }) });
        openText("Веб-агент JARVIS", (result || []).map((tab, index) => `${index + 1}. ${tab.url}`).join("\n") || "Открытых вкладок нет.");
      } catch (error) { pushMsg("err", error.message); }
      return true;
    }
    if (/vscode|vs code/.test(lower)) { await startBrowserAgent(BROWSER_TARGETS.vscode); return true; }
    if (/z\.ai|зет.?аи/.test(lower)) { await startBrowserAgent(BROWSER_TARGETS.zai); return true; }
    if (/ai studio|студи[яи].*google|google.*студи/.test(lower)) { await startBrowserAgent(BROWSER_TARGETS.aistudio); return true; }
    await startBrowserAgent(url ? { title: "Веб-агент JARVIS", url } : BROWSER_TARGETS.web);
    return true;
  }

  $$('[data-code-target]').forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    const target = BROWSER_TARGETS[button.dataset.codeTarget];
    button.closest(".tool-dropdown")?.classList.remove("is-open");
    if (target) startBrowserAgent(target);
  }));

  $$('[data-dev-action]').forEach((button) => button.addEventListener("click", async (event) => {
    event.stopPropagation();
    const action = button.dataset.devAction;
    button.closest(".tool-dropdown")?.classList.remove("is-open");
    if (action === "agents") return openModule("Агенты", "/agents");
    if (action === "prompt") return submitPrompt("Создай production-ready промпт-пак: проанализируй последний запрос, сгенерируй структурированные системные инструкции для агентов, включи режим петли реализация-проверка-исправление.");
    if (action === "plan") return submitPrompt("Перейди в режим планирования. Задавай мне уточняющие вопросы, чтобы создать идеальный план проекта. Не пиши код, пока план не согласован.");
    if (action === "implementation") return submitPrompt("На основе согласованного промпт-пака и плана создай поэтапный Roadmap с тестами на каждом шаге. Начни с этапа 1.");
    if (action === "verify") return submitPrompt("Запусти режим проверки (ПЗН): прогони последнюю реализацию по петле реализация-проверка-исправление — типы, линт, тесты, сборка и визуальная регрессия. Составь список расхождений с приоритетами и предложи минимальные исправления.");
    if (action === "telegram") return openModule("Telegram", "/phone");
    try {
      if (action === "mcp") {
        const status = await api("/api/mcp-bridge/status");
        return openText("MCP", JSON.stringify(status, null, 2));
      }
      const status = await api("/api/development/status");
      if (action === "plugins") return openText("Плагины", JSON.stringify(status.plugins, null, 2));
      if (action === "tools") return openText("Инструменты", JSON.stringify(status.tools, null, 2));
      if (action === "skills") return openText("Навыки", JSON.stringify(status.skills, null, 2));
    } catch (error) {
      pushMsg("err", error.message);
    }
  }));

  const chatIcons = $(".chat-icons");
  if (chatIcons && !$("#webAgentButton")) {
    const webButton = el("button");
    webButton.type = "button";
    webButton.id = "webAgentButton";
    webButton.title = "Веб-агент";
    webButton.textContent = "ВЕБ";
    webButton.addEventListener("click", () => startBrowserAgent());
    chatIcons.insertBefore(webButton, $("[data-jicon=logtoggle]", chatIcons));
  }

  $$("button[data-tool]").forEach((b) => b.addEventListener("click", async () => {
    const t = b.dataset.tool;
    const dropdown = b.closest(".tool-dropdown");
    if (dropdown) {
      document.querySelectorAll(".tool-dropdown").forEach((d) => { if (d !== dropdown) d.classList.remove("is-open"); });
      dropdown.classList.toggle("is-open");
      const btn = dropdown.querySelector("button");
      if (btn) btn.setAttribute("aria-expanded", String(dropdown.classList.contains("is-open")));
      return;
    }
    if (t === "terminal") return openTerminal();
    if (t === "files") {
      setState("thinking", { source: "files" }); toast("ОТКРЫВАЮ ПРОВОДНИК…");
      api("/api/os/open-file-manager", { method: "POST", body: JSON.stringify({}) })
        .then(() => { toast("ПРОВОДНИК ОТКРЫТ"); setState("smiling", { duration: 1800 }); })
        .catch((e) => { pushMsg("err", e.message); setState("sad", { duration: 2200 }); });
      return;
    }
    if (t === "prompt-engineering") {
      setState("thinking", { source: "prompt-engineering" }); toast("ГЕНЕРАЦИЯ ПРОМПТ-ПАКА…");
      submitPrompt("Создай production-ready промпт-пак: проанализируй последний запрос, сгенерируй структурированные системные инструкции для агентов, включи режим петли реализация-проверка-исправление.");
      return;
    }
    if (t === "planning") {
      setState("thinking", { source: "planning" }); toast("ПЛАНИРОВАНИЕ ПРОЕКТА…");
      submitPrompt("Перейди в режим планирования. Задавай мне уточняющие вопросы, чтобы создать идеальный план проекта. Не пиши код, пока план не согласован.");
      return;
    }
    if (t === "implementation") {
      setState("thinking", { source: "implementation" }); toast("СОЗДАНИЕ РОАДМАПА…");
      submitPrompt("На основе согласованного промпт-пака и плана создай поэтапный Roadmap с тестами на каждом шаге. Начни с этапа 1.");
      return;
    }

    if (t === "web") {
      return startBrowserAgent();
    }
    const r = TOOLS[t]; if (r) openModule(r[0], r[1]);
  }));

  /* ══ СИСТЕМНОЕ ЯДРО ══ */
  const metrics = {};
  $$(".metric").forEach((m) => {
    metrics[m.dataset.m] = { row: m, fill: $(".track > i", m), val: $("b", m) };
    m.addEventListener("click", () => {
      const k = m.dataset.m, x = lastMetrics;
      openText(k.toUpperCase(), {
        cpu: `Загрузка CPU: ${x.cpu}%`,
        gpu: `Загрузка GPU: ${x.gpu}%`,
        ram: `RAM: ${(x.ram || 0).toFixed(2)} ГБ из ${(x.totalRam || 0).toFixed(1)} ГБ`,
        vram: `VRAM: ${x.vram} ГБ`,
      }[k] || "нет данных");
    });
  });

  $$(".stat").forEach((s) => s.addEventListener("click", () => {
    const x = lastMetrics;
    openText(s.querySelector("span").textContent, {
      temp: `Температура: ${x.temp ? x.temp.toFixed(1) : "—"} °C`,
      fan: `Кулеры: ${Math.round(40 + (x.cpu || 0) * .4)}%`,
      net: `↓ ${(x.networkIn || 0).toFixed(2)} Мб/с\n↑ ${(x.networkOut || 0).toFixed(2)} Мб/с`,
    }[s.dataset.card]);
  }));

  const countersBox = $("#counters");
  const COUNTERS = [["ram", "Память"], ["conn", "Соединения"], ["pkt", "Пакеты/с"], ["loss", "Потери"]];
  if (countersBox) COUNTERS.forEach(([k, label]) => {
    const c = el("div", "counter", `<b data-c="${k}">—</b><span>${label}</span>`);
    c.addEventListener("click", () => openText("Сетевая статистика",
      `Память: ${(lastMetrics.ram || 0).toFixed(1)} ГБ\nВходящий: ${(lastMetrics.networkIn || 0).toFixed(2)} Мб/с\nИсходящий: ${(lastMetrics.networkOut || 0).toFixed(2)} Мб/с`));
    countersBox.appendChild(c);
  });

  const netCanvas = $("#netCanvas");
  const netHistory = [];
  const netVisual = { phase: 0, lastFrame: 0, frame: 0 };
  const reduceNetMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function drawNet(now = performance.now()) {
    if (!netCanvas) return;
    const c = netCanvas;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return;
    const pixelWidth = Math.round(w * dpr), pixelHeight = Math.round(h * dpr);
    if (c.width !== pixelWidth || c.height !== pixelHeight) {
      c.width = pixelWidth;
      c.height = pixelHeight;
    }
    const ctx = c.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const delta = Math.min(48, now - (netVisual.lastFrame || now));
    netVisual.lastFrame = now;
    netVisual.phase += delta * 0.001;

    const backdrop = ctx.createLinearGradient(0, 0, 0, h);
    backdrop.addColorStop(0, "rgba(2, 20, 35, .20)");
    backdrop.addColorStop(.6, "rgba(0, 8, 17, .04)");
    backdrop.addColorStop(1, "rgba(0, 24, 40, .22)");
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(64,176,224,.16)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (h / 4) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    for (let x = 0; x < w; x += Math.max(32, w / 8)) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }

    const samples = netHistory.length > 1 ? netHistory : [0.18, 0.24, 0.2, 0.28];
    const max = Math.max(.5, ...samples);
    const points = samples.map((value, index) => ({
      x: (index / (samples.length - 1)) * w,
      y: h - (value / max) * (h * .70) - h * .15,
    }));

    const area = ctx.createLinearGradient(0, 0, 0, h);
    area.addColorStop(0, "rgba(79, 227, 255, .26)");
    area.addColorStop(1, "rgba(79, 227, 255, 0)");
    ctx.beginPath();
    points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    ctx.fillStyle = area;
    ctx.fill();

    ctx.beginPath();
    points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.strokeStyle = "#4fe3ff";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "rgba(79,227,255,.82)";
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    const scanX = ((netVisual.phase * 42) % (w + 34)) - 17;
    const scan = ctx.createLinearGradient(scanX - 16, 0, scanX + 16, 0);
    scan.addColorStop(0, "rgba(79, 227, 255, 0)");
    scan.addColorStop(.5, "rgba(79, 227, 255, .22)");
    scan.addColorStop(1, "rgba(79, 227, 255, 0)");
    ctx.fillStyle = scan;
    ctx.fillRect(scanX - 16, 0, 32, h);

    const pointAt = (progress) => {
      const scaled = progress * (points.length - 1);
      const index = Math.min(points.length - 2, Math.max(0, Math.floor(scaled)));
      const local = scaled - index;
      const from = points[index], to = points[index + 1];
      return { x: from.x + (to.x - from.x) * local, y: from.y + (to.y - from.y) * local };
    };
    [0, .34, .68].forEach((offset, index) => {
      const signal = pointAt((netVisual.phase * (.16 + index * .025) + offset) % 1);
      const radius = 2 + Math.sin(netVisual.phase * 4 + index) * .45;
      const glow = ctx.createRadialGradient(signal.x, signal.y, 0, signal.x, signal.y, 10);
      glow.addColorStop(0, "rgba(224, 253, 255, .96)");
      glow.addColorStop(.22, "rgba(79, 227, 255, .9)");
      glow.addColorStop(1, "rgba(79, 227, 255, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(signal.x, signal.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#d9fbff";
      ctx.beginPath(); ctx.arc(signal.x, signal.y, radius, 0, Math.PI * 2); ctx.fill();
    });

    const latest = points.at(-1);
    const pulse = 4 + (Math.sin(netVisual.phase * 5) + 1) * 2;
    ctx.strokeStyle = "rgba(121, 239, 255, .46)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(latest.x, latest.y, pulse, 0, Math.PI * 2); ctx.stroke();
  }

  function animateNet(now) {
    drawNet(now);
    if (!reduceNetMotion) netVisual.frame = requestAnimationFrame(animateNet);
  }
  addEventListener("resize", () => drawNet());
  if (netCanvas && !reduceNetMotion) netVisual.frame = requestAnimationFrame(animateNet);

  let lastMetrics = {};
  const navCpu = $("#navCpu"), navRam = $("#navRam"), navProvider = $("#navProvider"), navState = $("#navState");
  const coreRpm = $("#coreRpm"), coreTick = $("#coreTick");

  async function pollMetrics() {
    try {
      const m = await api("/api/os-metrics");
      lastMetrics = m;
      const ramPct = m.totalRam ? (m.ram / m.totalRam) * 100 : 0;
      const vramPct = Math.min(100, ((m.vram || 0) / 8.5) * 100);
      const set = (k, pct, text) => {
        const t = metrics[k]; if (!t) return;
        t.fill.style.right = `${100 - Math.max(0, Math.min(100, pct))}%`;
        t.val.textContent = text;
        t.row.classList.toggle("crit", pct >= 90);
      };
      set("cpu", m.cpu, `${m.cpu}%`);
      set("gpu", m.gpu, `${m.gpu}%`);
      set("ram", ramPct, `${Math.round(ramPct)}%`);
      set("vram", vramPct, `${(m.vram || 0).toFixed(1)} ГБ`);

      const stats = { temp: `${m.temp.toFixed(1)}°`, fan: `${Math.round(40 + m.cpu * .4)}%`, net: `${m.networkIn.toFixed(1)}` };
      $$(".stat").forEach((s) => { const b = s.querySelector("b"); if (b) b.textContent = stats[s.dataset.card]; });

      if (navCpu) navCpu.textContent = `${m.cpu}%`;
      if (navRam) navRam.textContent = `${Math.round(ramPct)}%`;

      const c = { ram: `${(m.ram || 0).toFixed(1)}G`, conn: `${Math.round((m.networkIn + m.networkOut) * 100)}`,
                  pkt: `${Math.round(m.cpu * 1.8)}`, loss: "0.00%" };
      Object.entries(c).forEach(([k, v]) => { const n = $(`[data-c="${k}"]`); if (n) n.textContent = v; });

      if (coreRpm) coreRpm.textContent = `${Math.round(600 + m.cpu * 34)}`;
      if (coreTick) coreTick.textContent = `${(1 + m.cpu / 100).toFixed(2)}×`;
      window.dispatchEvent(new CustomEvent("jarvis:core-load", { detail: { load: m.cpu / 100 } }));

      netHistory.push(m.networkIn + m.networkOut);
      if (netHistory.length > 48) netHistory.shift();
      drawNet();
    } catch {
      if (navState) navState.textContent = "ОФФЛАЙН";
    }
  }

  const provBox = $("#providers"), provCount = $("#provCount");
  async function pollProviders() {
    if (!provBox && !provCount) return;
    try {
      const s = await api("/api/providers/status");
      const list = s.providers || [];
      if (provCount) provCount.textContent = `${list.filter((p) => p.configured).length}/${list.length}`;
      if (provBox) {
        provBox.innerHTML = "";
        list.forEach((p) => {
          const cell = el("div", `prov ${p.configured ? "on" : "off"}`, `<u>${p.name}</u><i></i>`);
          cell.title = `${p.name} · ${p.role}`;
          cell.addEventListener("click", () => openText(p.name,
            `Провайдер: ${p.name}\nРоль: ${p.role}\nСтатус: ${p.configured ? "ONLINE" : "OFFLINE (нет ключа)"}\nPrimary: ${s.primaryProvider}\nHeavy: ${s.heavyProvider}\nMock: ${s.mockMode ? "вкл" : "выкл"}`));
          provBox.appendChild(cell);
        });
      }
      if (navProvider) navProvider.textContent = s.mockMode ? "НЕТ ИИ" : String(s.primaryProvider || "—").toUpperCase();
    } catch { if (provCount) provCount.textContent = "0/0"; }
  }

  /* ══ ПРАВАЯ ПАНЕЛЬ ══ */
  const entities = $("#entities");
  let activeTab = "projects";

  $$("#tabs button").forEach((b) => b.addEventListener("click", () => {
    activeTab = b.dataset.tab;
    $$("#tabs button").forEach((o) => o.classList.toggle("is-on", o === b));
    const tabModule = {
      projects: ["Проекты", "/projects"],
      tasks: ["Задачи", "/board"],
      agents: ["Агенты", "/agents"],
      // No dedicated route for "devices" -- it renders inline from
      // /api/devices/status below, same as the other tabs render inline
      // from their own APIs; only the module-drilldown (openModule) is
      // skipped for this tab.
    }[activeTab];
    if (tabModule) openModule(tabModule[0], tabModule[1]);
    refreshEntities();
  }));

  function renderEntities(items) {
    if (!entities) return;
    entities.innerHTML = "";
    if (!items.length) {
      entities.appendChild(el("div", "entity empty", `<div class="e-top"><span class="e-name">Нет записей</span></div><div class="e-meta">источник пуст</div>`));
      return;
    }
    items.slice(0, 4).forEach((it) => {
      const card = el("div", "entity", `
        <div class="e-top"><span class="e-name">${it.name}</span><span class="e-state ${it.tone || ""}">${it.state}</span></div>
        <div class="track"><i style="right:${100 - (it.progress || 0)}%"></i></div>
        <div class="e-meta">${it.meta}</div>`);
      $(".track > i", card).style.background = "#4fe3ff";
      $(".track > i", card).style.boxShadow = "0 0 7px rgba(79,227,255,.8)";
      card.addEventListener("click", it.onClick);
      entities.appendChild(card);
    });
  }

  async function refreshEntities() {
    try {
      if (activeTab === "projects") {
        const d = await api("/api/projects");
        renderEntities((d.projects || []).map((p) => ({
          name: p.name,
          state: p.active ? "ACTIVE" : "IDLE",
          tone: p.active ? "" : "info",
          progress: p.active ? 100 : 40,
          meta: [p.techStack, p.githubUrl].filter(Boolean).join(" · ").slice(0, 62) || "без описания",
          onClick: () => openText(p.name, `Проект: ${p.name}\nОписание: ${p.description || "—"}\nStack: ${p.techStack || "—"}\nGitHub: ${p.githubUrl || "—"}\nПуть: ${p.localPath || "—"}`),
        })));
      } else if (activeTab === "tasks") {
        const d = await api("/api/tasks");
        renderEntities((d.tasks || []).map((t) => ({
          name: t.title,
          state: t.completed ? "DONE" : "OPEN",
          tone: t.completed ? "" : "warn",
          progress: t.completed ? 100 : 30,
          meta: new Date(t.createdAt).toLocaleString("ru-RU"),
          onClick: async () => {
            await api("/api/tasks", { method: "PATCH", body: JSON.stringify({ id: t.id, completed: !t.completed }) });
            toast(t.completed ? "ЗАДАЧА ВОЗВРАЩЕНА" : "ЗАДАЧА ВЫПОЛНЕНА");
            refreshEntities();
          },
        })));
      } else if (activeTab === "devices") {
        // Real HOME-PC device + registry-projection state (see
        // src/app/api/devices/status/route.ts). No local registry lives
        // here or is invented client-side -- everything rendered below is
        // exactly what that endpoint returns, including the server's own
        // ONLINE/OFFLINE staleness computation and the forced
        // UNKNOWN_DEVICE_OFFLINE program/capability state when a device
        // isn't ONLINE.
        const d = await api("/api/devices/status");
        renderEntities((d.devices || []).map((dev) => {
          const online = dev.status === "ONLINE";
          const reg = dev.registryProjection;
          const heartbeat = dev.lastHeartbeatAt ? new Date(dev.lastHeartbeatAt).toLocaleString("ru-RU") : "никогда";
          const regLine = reg
            ? `Программы ${reg.programsSummary?.installed ?? "?"}/${reg.programs.length} · Возможности ${reg.capabilitiesSummary?.installed ?? "?"}/${reg.capabilities.length} · ревизия ${reg.revision.slice(0, 10)}`
            : "реестр недоступен";
          return {
            name: dev.name,
            state: dev.status,
            tone: online ? "" : (dev.status === "DISABLED" ? "off" : "warn"),
            progress: online ? 100 : 0,
            meta: `${heartbeat} · ${regLine}`,
            onClick: () => openText(
              dev.name,
              `Статус: ${dev.status}\n` +
              `Последний heartbeat: ${heartbeat}\n` +
              `Версия демона: ${dev.daemonVersion || "—"}\n` +
              `Активных задач: ${dev.runningTaskCount}\n` +
              (reg
                ? `Ревизия реестра: ${reg.revision}\nСформировано: ${new Date(reg.generatedAt).toLocaleString("ru-RU")}\n\n` +
                  `ПРОГРАММЫ (${reg.programs.length}):\n` +
                  reg.programs.map((p) => `• ${p.name} — installed:${p.installed} enabled:${p.enabled} running:${p.running} health:${p.health}`).join("\n")
                : "\nРеестр недоступен для этого устройства.")
            ),
          };
        }));
      } else {
        const d = await api("/api/agents");
        renderEntities((d.agents || []).map((a) => ({
          name: a.name,
          state: String(a.status || "idle").toUpperCase(),
          tone: a.enabled ? "" : "off",
          progress: a.enabled ? 100 : 20,
          meta: `${a.department} · риск ${a.riskLevel}`,
          onClick: () => openText(a.name, `Агент: ${a.name}\nОтдел: ${a.department}\nСтатус: ${a.status}\nРиск: ${a.riskLevel}\nИнструменты: ${(a.tools || []).join(", ")}`),
        })));
      }
    } catch {
      renderEntities([]);
    }
  }

  /* ══ РЕЖИМЫ ЧАТА ══ */
  let mode = "auto";
  const MODE_LABEL = { auto: "АВТО", media: "МЕДИА", transcription: "ТРАНСКРИПЦИЯ", analysis: "АНАЛИЗ" };
  const MODE_PH = {
    auto: "Скажи ДЖАРВИСУ, что сделать...", media: "Опиши изображение, видео или музыку для создания...",
    transcription: "Выбери аудиофайл для распознавания", analysis: "Что проанализировать...",
  };

  const fileInput = el("input");
  fileInput.type = "file"; fileInput.accept = "audio/*,video/*"; fileInput.style.display = "none";
  stageRoot.appendChild(fileInput);

  function setMode(next) {
    mode = next;
    $$("[data-jmode]").forEach((b) => b.classList.toggle("is-on", b.dataset.jmode === next));
    input.placeholder = MODE_PH[next] || MODE_PH.auto;
    toast(`РЕЖИМ: ${MODE_LABEL[next]}`);
  }

  $$("[data-jmode]").forEach((b) => b.addEventListener("click", () => {
    const m = b.dataset.jmode;
    if (m === "more") return openText("Режимы чата", [
      "АВТО — диалог через /api/chat (AI-провайдер, память, действия).",
      "МЕДИА — единый режим для изображения, видео и музыки. Укажите нужный тип: «создай видео …» или «создай музыку …».",
      "ТРАНСКРИПЦИЯ — загрузка аудио/видео и распознавание речи.",
      "АНАЛИЗ — разбор репозитория, текста или задачи.",
      "",
      "Иконки: ∿ тест голоса · ◉ непрерывный голос · ≡ настройки · ⇢ история.",
    ].join("\n"));
    if (m === "transcription" && mode === "transcription") return fileInput.click();
    setMode(m);
    if (m === "transcription") fileInput.click();
  }));

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    pushMsg("user", `Файл на транскрипцию: ${file.name}`);
    setState("thinking", { source: "media" }); toast("РАСПОЗНАЮ АУДИО…");
    try {
      const fd = new FormData();
      fd.append("file", file); fd.append("type", "transcription");
      const res = await fetch("/api/media/generate", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const text = data.text || data.transcript || JSON.stringify(data).slice(0, 900);
      pushMsg("bot", text); openText("Транскрипция", text); setState("idle");
    } catch (e) { pushMsg("err", e.message); setState("sad", { duration: 2200 }); }
    fileInput.value = "";
  });

  /* ══ ИКОНКИ ЧАТА ══ */
  let continuousVoice = false, continuousRec = null;
  let chatMinimized = false;
  const chatConsole = $("#chatConsole");
  const chatMinimizeBtn = $("#chatMinimize");
  const chatOriginalChildren = chatConsole ? Array.from(chatConsole.children).filter(n => !n.classList.contains("chat-head")) : [];

  function setChatMinimized(minimized) {
    chatMinimized = minimized;
    if (!chatConsole) return;
    chatConsole.classList.toggle("is-minimized", minimized);
    chatOriginalChildren.forEach(n => (n.style.display = minimized ? "none" : ""));
    if (chatMinimizeBtn) chatMinimizeBtn.textContent = minimized ? "□" : "−";
    if (!minimized) {
      layoutChatLog();
      const input = $("#commandInput", chatConsole);
      if (input) input.focus();
    } else {
      log.classList.remove("is-visible");
    }
  }

  if (chatMinimizeBtn) {
    chatMinimizeBtn.addEventListener("click", () => setChatMinimized(!chatMinimized));
  }

  $$("[data-jicon]").forEach((z) => z.addEventListener("click", () => {
    const k = z.dataset.jicon;
    if (k === "wave") return speak("Голосовой канал активен. Синтез речи работает.");
    if (k === "eq") return openModule("Настройки голоса", "/settings");
    if (k === "logtoggle") {
      if (chatMinimized) setChatMinimized(false);
      log.classList.toggle("is-visible");
      layoutChatLog();
      clearTimeout(logTimer);
      return;
    }
    if (k === "mic") {
      const R = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!R) return toast("РАСПОЗНАВАНИЕ НЕ ПОДДЕРЖИВАЕТСЯ");
      continuousVoice = !continuousVoice;
      z.classList.toggle("is-on", continuousVoice);
      if (!continuousVoice) {
        if (continuousRec) continuousRec.stop();
        continuousRec = null; toast("ГОЛОСОВОЙ РЕЖИМ ВЫКЛЮЧЕН"); setState("idle"); return;
      }
      toast("НЕПРЕРЫВНЫЙ ГОЛОСОВОЙ РЕЖИМ");
      continuousRec = new R();
      continuousRec.lang = "ru-RU"; continuousRec.continuous = true; continuousRec.interimResults = false;
      continuousRec.onresult = (e) => { const t = e.results[e.results.length - 1][0].transcript.trim(); if (t) submitPrompt(t); };
      continuousRec.onend = () => { if (continuousVoice) try { continuousRec.start(); } catch {} };
      continuousRec.start();
    }
  }));

  async function submitPrompt(text) {
    // Remote capability commands (real system status / Ollama / filesystem /
    // MCP / browser / n8n on HOME-PC, via the daemon) must be checked before
    // handleBrowserChatCommand — its broad browser-intent regex ("открой" +
    // "браузер"/"страниц"/etc.) would otherwise swallow the exact phrase
    // "открой браузер и безопасную тестовую страницу" and route it to the
    // local UI web-agent feature (/api/browser/camofox, a Next.js route that
    // only works from within the Next.js server process itself and cannot
    // reach CamoFox on HOME-PC when that process is Vercel's cloud runtime)
    // instead of the daemon capability path. Discovered via real E2E testing
    // against the redeployed Preview: the phrase created zero AgentTask rows
    // and instead called /api/browser/camofox directly, which reported
    // CamoFox unavailable regardless of whether it was actually running.
    if (selectedChatFiles.length === 0 && matchRemoteCapability(text)) return sendCommand(text);
    if (await handleBrowserChatCommand(text)) return;
    if (mode === "auto") return sendCommand(text);
    if (mode === "analysis") return sendCommand(`Проанализируй: ${text}`);
    if (mode === "transcription") return fileInput.click();
    const mediaType = /(?:видео|ролик|анимац|movie|video)/i.test(text) ? "video" : /(?:музык|песн|трек|мелоди|аудио|music|song|sound)/i.test(text) ? "music" : "image";
    const mediaLabel = `${MODE_LABEL[mode]} · ${{ image: "ИЗОБРАЖЕНИЕ", video: "ВИДЕО", music: "МУЗЫКА" }[mediaType]}`;
    pushMsg("user", `[${mediaLabel}] ${text}`);
    setState("thinking", { source: "media" });
    toast(`ГЕНЕРАЦИЯ: ${mediaLabel}`);
    try {
      const data = await api("/api/media/generate", { method: "POST", body: JSON.stringify({ type: mediaType, prompt: text }) });
      openShell(mediaLabel);
      const box = el("div", "media-out");
      if (data.url && mediaType === "image") box.appendChild(Object.assign(el("img"), { src: data.url }));
      else if (data.url && mediaType === "video") box.appendChild(Object.assign(el("video"), { src: data.url, controls: true }));
      else if (data.url && mediaType === "music") box.appendChild(Object.assign(el("audio"), { src: data.url, controls: true }));
      const cap = el("div", "module-text");
      cap.textContent = `${mediaLabel}\nprompt: ${text}\n${data.url || JSON.stringify(data).slice(0, 500)}`;
      box.appendChild(cap);
      moduleBody.appendChild(box);
      pushMsg("bot", `${mediaLabel} готово: ${data.url || "результат в модуле"}`);
      setState("smiling", { duration: 2000 });
    } catch (e) { pushMsg("err", e.message); setState("sad", { duration: 2400 }); }
  }

  /* Retired Telegram/embedded-YouTube player. Kept inert for source-history safety. */
  if (false) {
  /* Volume slider — wired to the same <audio> element used by the player. */
  const mpVolume = $("#mpVolume");
  const mpVolBtn = $(".mp-vol-btn");
  let mpLastVol = 0.6;
  function applyVolume(v) {
    v = Math.max(0, Math.min(1, Number(v)));
    if (Number.isNaN(v)) v = mpLastVol;
    if (mpAudio) mpAudio.volume = v;
    if (mpVolume) { mpVolume.value = String(v); mpVolume.style.setProperty("--vol", `${Math.round(v * 100)}%`); }
    if (mpVolBtn) mpVolBtn.classList.toggle("is-muted", v === 0);
  }
  if (mpAudio) mpAudio.volume = mpLastVol;
  if (mpVolume) {
    applyVolume(parseFloat(mpVolume.value) || mpLastVol);
    mpVolume.addEventListener("input", () => { const v = parseFloat(mpVolume.value); if (v > 0) mpLastVol = v; applyVolume(v); });
  }

  $$("[data-mp]").forEach((b) => b.addEventListener("click", () => {
    const k = b.dataset.mp;
    if (k === "play") togglePlay();
    if (k === "next") { loadTrack(mpIndex + 1); if (mpPlaying) play(); }
    if (k === "prev") { loadTrack(mpIndex - 1); if (mpPlaying) play(); }
    if (k === "list") { mpPlaylist?.classList.toggle("is-open"); }
    if (k === "mute") { applyVolume((mpAudio && mpAudio.volume > 0) ? 0 : (mpLastVol || 0.6)); }
  }));

  /* Telegram music source: the browser never receives the bot token. */
  const tgMusicSource = $("#tgMusicSource");
  const tgMusicStatus = $("#tgMusicStatus");
  async function refreshTelegramMusicSource() {
    if (!tgMusicSource || !tgMusicStatus) return;
    try {
      const response = await fetch("/api/telegram/music/status", { credentials: "same-origin", cache: "no-store" });
      const state = await response.json();
      tgMusicSource.classList.toggle("is-connected", Boolean(state.connected));
      tgMusicStatus.textContent = state.message || "Статус Telegram недоступен";
    } catch {
      tgMusicStatus.textContent = "Статус Telegram временно недоступен";
    }
  }

  async function loadTelegramMusicTracks() {
    try {
      const response = await fetch("/api/telegram/music/tracks", { credentials: "same-origin", cache: "no-store" });
      const payload = await response.json();
      const tracks = Array.isArray(payload.tracks) ? payload.tracks : [];
      if (!tracks.length) return;
      const knownUrls = new Set(mpTracks.map((track) => track.url));
      const telegramTracks = tracks
        .filter((track) => typeof track?.title === "string" && typeof track?.url === "string" && !knownUrls.has(track.url))
        .map((track) => ({ title: `TG · ${track.title}`, url: track.url }));
      if (!telegramTracks.length) return;
      mpTracks = [...telegramTracks, ...mpTracks];
      renderPlaylist();
      if (!mpPlaying) { mpIndex = 0; loadTrack(0); }
      if (tgMusicStatus) tgMusicStatus.textContent = `Загружено песен из Telegram: ${telegramTracks.length}`;
    } catch {
      // The built-in local playlist remains available if Telegram is temporarily offline.
    }
  }

  /* ══ СТАРТ ══ */
  const ytForm = $("#ytForm");
  const ytInput = $("#ytInput");
  const ytStatus = $("#ytStatus");
  const ytFrame = $("#ytFrame");
  const ytAuthButton = $("#ytAuthButton");
  const ytPlaylistsButton = $("#ytPlaylistsButton");
  const ytPlaylists = $("#ytPlaylists");
  const ytIdPattern = /^[A-Za-z0-9_-]{11}$/;
  const ytHosts = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be", "www.youtu.be"]);

  function mountYouTubeEmbed(source, label) {
    if (!ytFrame || !ytStatus) return;
    const iframe = document.createElement("iframe");
    iframe.title = label;
    iframe.src = source;
    iframe.loading = "eager";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    iframe.allowFullscreen = true;
    ytFrame.replaceChildren(iframe);
    ytFrame.hidden = false;
  }

  async function refreshYouTubeAccount() {
    if (!ytStatus || !ytAuthButton || !ytPlaylistsButton) return;
    try {
      const response = await fetch("/api/youtube/status", { credentials: "same-origin", cache: "no-store" });
      const state = await response.json();
      if (state.connected) {
        ytAuthButton.textContent = "YouTube подключен";
        ytPlaylistsButton.disabled = false;
        ytStatus.textContent = "YouTube подключен · доступны личные плейлисты";
      } else if (state.configured) {
        ytAuthButton.textContent = "Подключить YouTube";
        ytPlaylistsButton.disabled = true;
        ytStatus.textContent = "Подключите YouTube для личных плейлистов";
      } else {
        ytAuthButton.textContent = "Настроить YouTube";
        ytPlaylistsButton.disabled = true;
        ytStatus.textContent = "YouTube OAuth ещё не настроен на сервере";
      }
    } catch {
      ytStatus.textContent = "Статус YouTube временно недоступен";
    }
  }

  async function showYouTubePlaylists() {
    if (!ytPlaylists || !ytStatus) return;
    ytStatus.textContent = "Загрузка личных плейлистов…";
    try {
      const response = await fetch("/api/youtube/playlists", { credentials: "same-origin", cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Playlist request failed");
      ytPlaylists.replaceChildren();
      const playlists = Array.isArray(payload.playlists) ? payload.playlists : [];
      playlists.forEach((playlist) => {
        if (!playlist?.id || !/^[A-Za-z0-9_-]{8,160}$/.test(playlist.id)) return;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "yt-playlist-button";
        button.textContent = `${playlist.title || "Без названия"}${Number.isFinite(playlist.itemCount) ? ` · ${playlist.itemCount}` : ""}`;
        button.addEventListener("click", () => {
          const params = new URLSearchParams({ autoplay: "1", playsinline: "1", enablejsapi: "1", origin: window.location.origin, rel: "0", list: playlist.id });
          mountYouTubeEmbed(`https://www.youtube.com/embed/videoseries?${params}`, playlist.title || "YouTube playlist");
          ytStatus.textContent = `Плейлист: ${playlist.title || "Без названия"}`;
        });
        ytPlaylists.append(button);
      });
      ytPlaylists.hidden = !ytPlaylists.childElementCount;
      ytStatus.textContent = ytPlaylists.hidden ? "В аккаунте не найдено плейлистов" : "Выберите личный плейлист";
    } catch {
      ytPlaylists.hidden = true;
      ytStatus.textContent = "Не удалось загрузить личные плейлисты. Подключите аккаунт повторно.";
    }
  }

  ytAuthButton?.addEventListener("click", async () => {
    try {
      const response = await fetch("/api/youtube/status", { credentials: "same-origin", cache: "no-store" });
      const state = await response.json();
      if (!state.configured) { ytStatus.textContent = "Добавьте OAuth-параметры в .env.local и перезапустите проект"; return; }
      window.top.location.assign("/api/youtube/auth/start");
    } catch {
      ytStatus.textContent = "Не удалось начать авторизацию YouTube";
    }
  });
  if (ytPlaylistsButton) {
    ytPlaylistsButton.addEventListener("click", showYouTubePlaylists);
    ytPlaylistsButton.addEventListener("click", () => toast("Плейлисты YouTube временно недоступны"));
  }

  }

  /* ── Local music player ─────────────────────────────────────────────── */
  const mpAudio = $("#mpAudio");
  const mpTrack = $("#mpTrack");
  const mpVisualizer = $("#mpVisualizer");
  const fallbackLocalTracks = ["track1.wav", "track2.wav", "track3.wav", "track4.wav"]
    .map((fileName) => ({ title: fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "), url: `/music/${fileName}` }));
  let mpTracks = [];
  let mpIndex = -1;
  let mpPlaying = false;
  let mpAudioContext;
  let mpAnalyser;
  let mpFrequencyData;
  let mpVisualFrame = 0;

  function updatePlayButton() {
    const button = $("[data-mp=\"play\"]");
    if (!button) return;
    button.textContent = mpPlaying ? "❚❚" : "▶";
    button.setAttribute("aria-label", mpPlaying ? "Пауза" : "Играть");
  }

  function drawMusicVisualizer() {
    if (!mpVisualizer) return;
    const width = Math.max(1, Math.round(mpVisualizer.clientWidth * (devicePixelRatio || 1)));
    const height = Math.max(1, Math.round(mpVisualizer.clientHeight * (devicePixelRatio || 1)));
    if (mpVisualizer.width !== width || mpVisualizer.height !== height) {
      mpVisualizer.width = width;
      mpVisualizer.height = height;
    }
    const context = mpVisualizer.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, width, height);
    const bars = 18;
    const gap = Math.max(1, Math.round(width / 120));
    const barWidth = Math.max(1, (width - gap * (bars - 1)) / bars);
    if (mpAnalyser && mpFrequencyData) mpAnalyser.getByteFrequencyData(mpFrequencyData);
    for (let index = 0; index < bars; index += 1) {
      const sample = mpFrequencyData ? mpFrequencyData[Math.floor(index / bars * mpFrequencyData.length)] / 255 : 0;
      const idle = mpPlaying ? .08 : .045;
      const barHeight = Math.max(2, height * (idle + sample * .84));
      const x = index * (barWidth + gap);
      context.fillStyle = `rgba(87, 232, 255, ${.35 + sample * .65})`;
      context.fillRect(x, height - barHeight, barWidth, barHeight);
    }
    if (mpPlaying) mpVisualFrame = requestAnimationFrame(drawMusicVisualizer);
  }

  function connectMusicVisualizer() {
    if (!mpAudio || mpAudioContext) return;
    try {
      mpAudioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = mpAudioContext.createMediaElementSource(mpAudio);
      mpAnalyser = mpAudioContext.createAnalyser();
      mpAnalyser.fftSize = 64;
      mpFrequencyData = new Uint8Array(mpAnalyser.frequencyBinCount);
      source.connect(mpAnalyser);
      mpAnalyser.connect(mpAudioContext.destination);
    } catch {
      mpAudioContext = undefined;
    }
  }

  async function playCurrent() {
    if (!mpAudio || mpIndex < 0) return;
    try {
      connectMusicVisualizer();
      if (mpAudioContext?.state === "suspended") await mpAudioContext.resume();
      await mpAudio.play();
    } catch {}
  }

  function loadTrack(index, autoplay = false) {
    if (!mpAudio || !mpTracks.length) return;
    mpIndex = (index + mpTracks.length) % mpTracks.length;
    const track = mpTracks[mpIndex];
    mpAudio.src = track.url;
    mpAudio.load();
    if (mpTrack) mpTrack.textContent = track.title;
    if (autoplay) void playCurrent();
  }

  async function loadLocalPlaylist() {
    const currentUrl = mpTracks[mpIndex]?.url;
    try {
      const response = await fetch("/api/music/local", {
        credentials: "same-origin",
        cache: "no-store",
        signal: AbortSignal.timeout(6_000),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      const discoveredTracks = (Array.isArray(payload.tracks) ? payload.tracks : [])
        .filter((track) => typeof track?.title === "string" && typeof track?.url === "string" && track.url.startsWith("/music/"));
      mpTracks = discoveredTracks.length ? discoveredTracks : fallbackLocalTracks;
      const currentIndex = mpTracks.findIndex((track) => track.url === currentUrl);
      if (!mpTracks.length) {
        mpIndex = -1;
        if (mpTrack) mpTrack.textContent = "Нет локальных треков";
        return;
      }
      loadTrack(currentIndex >= 0 ? currentIndex : 0, false);
    } catch (error) {
      mpTracks = fallbackLocalTracks;
      loadTrack(0, false);
    }
  }

  mpAudio?.addEventListener("play", () => { mpPlaying = true; updatePlayButton(); cancelAnimationFrame(mpVisualFrame); drawMusicVisualizer(); });
  mpAudio?.addEventListener("pause", () => { mpPlaying = false; updatePlayButton(); cancelAnimationFrame(mpVisualFrame); drawMusicVisualizer(); });
  mpAudio?.addEventListener("ended", () => loadTrack(mpIndex + 1, true));
  mpAudio?.addEventListener("error", () => { if (mpTrack) mpTrack.textContent = "Файл не воспроизводится"; });
  if (mpAudio) mpAudio.volume = .6;

  $$('[data-mp]').forEach((button) => button.addEventListener("click", () => {
    const action = button.dataset.mp;
    if (action === "play") {
      if (mpPlaying) mpAudio?.pause();
      else void playCurrent();
    }
    if (action === "prev") loadTrack(mpIndex - 1, mpPlaying);
    if (action === "next") loadTrack(mpIndex + 1, mpPlaying);
  }));

  pollMetrics(); setInterval(pollMetrics, 3000);
  pollProviders(); setInterval(pollProviders, 60000);
  refreshEntities(); setInterval(refreshEntities, 20000);
  drawNet();
  void loadLocalPlaylist();

  window.JarvisLive = Object.freeze({ api, sendCommand, submitPrompt, speak, openModule, openText, openTerminal, refreshEntities, setMode });
})();
