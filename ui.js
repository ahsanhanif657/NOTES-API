/* Shared UI helpers: theme, toasts, confirm modal, API wrapper, formatting */
(() => {
  "use strict";

  /* Redirect local static-server pages only when the Notes API is available. */
  (() => {
    const API_PORT = "3000";
    const loc = window.location;
    const isLocal = loc.hostname === "localhost" || loc.hostname === "127.0.0.1" || loc.hostname === "[::1]";
    if (loc.protocol !== "http:" || !loc.port || loc.port === API_PORT || !isLocal) return;
    let path = loc.pathname;
    const marker = path.lastIndexOf("/public/");
    if (marker !== -1) path = path.slice(marker + "/public".length) || "/";
    const serverUrl = `${loc.protocol}//${loc.hostname}:${API_PORT}`;
    fetch(`${serverUrl}/api/notes`, { mode: "no-cors" })
      .then(() => loc.replace(`${serverUrl}${path}${loc.search}${loc.hash}`))
      .catch(() => {
        // Leave the page open so the API helper can show setup instructions when used.
      });
  })();

  const NOTE_COLORS = [
    { id: "default", label: "Default" },
    { id: "yellow", label: "Yellow" },
    { id: "green", label: "Green" },
    { id: "blue", label: "Blue" },
    { id: "pink", label: "Pink" },
    { id: "purple", label: "Purple" }
  ];

  const ICONS = {
    check: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    alert: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4m0 4h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>'
  };

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text == null ? "" : String(text);
    return div.innerHTML;
  }

  function timeAgo(iso) {
    if (!iso) return "";
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 0) return "just now";
    if (seconds < 45) return "just now";
    if (seconds < 90) return "a minute ago";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
    return new Date(iso).toLocaleDateString();
  }

  function formatDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  async function api(url, options = {}) {
    const config = {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json" }
    };
    if (options.body !== undefined) config.body = JSON.stringify(options.body);
    let res;
    try {
      res = await fetch(url, config);
    } catch (err) {
      if (err instanceof TypeError) {
        throw new Error("Cannot connect to the Notes API. Run `npm start` in the project folder, then open http://localhost:3000. Don't open the page with Live Server or directly from a file.");
      }
      throw err;
    }
    let data = null;
    try { data = await res.json(); } catch { /* empty body */ }
    if (!res.ok) {
      const message = res.status === 405
        ? "This page is being served without the Notes API. Run `npm start` in the project folder, then open http://localhost:3000."
        : (data && data.message) || `Request failed (${res.status})`;
      const err = new Error(message);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  /* ---------- Toasts ---------- */
  function ensureToastStack() {
    let stack = document.querySelector(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      document.body.appendChild(stack);
    }
    return stack;
  }

  function showToast(message, type = "success") {
    const stack = ensureToastStack();
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.setAttribute("role", "status");
    toast.innerHTML = `${type === "success" ? ICONS.check : ICONS.alert}<span>${escapeHtml(message)}</span>`;
    stack.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 400);
    }, 3400);
  }

  /* ---------- Confirm modal ---------- */
  function ensureModal() {
    let modal = document.querySelector(".modal-overlay");
    if (!modal) {
      modal = document.createElement("div");
      modal.className = "modal-overlay";
      modal.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
          <div class="modal-icon">${ICONS.alert}</div>
          <h3 class="modal-title" id="modalTitle"></h3>
          <p class="modal-message"></p>
          <div class="modal-actions">
            <button class="btn btn-ghost" type="button" data-modal-cancel>Cancel</button>
            <button class="btn btn-danger" type="button" data-modal-confirm></button>
          </div>
        </div>`;
      document.body.appendChild(modal);
    }
    return modal;
  }

  function confirmAction({ title = "Are you sure?", message = "", confirmText = "Confirm" } = {}) {
    return new Promise(resolve => {
      const modal = ensureModal();
      modal.querySelector(".modal-title").textContent = title;
      modal.querySelector(".modal-message").textContent = message;
      const confirmBtn = modal.querySelector("[data-modal-confirm]");
      const cancelBtn = modal.querySelector("[data-modal-cancel]");
      confirmBtn.textContent = confirmText;

      const close = result => {
        modal.classList.remove("open");
        modal.removeEventListener("click", onOverlay);
        confirmBtn.removeEventListener("click", onConfirm);
        cancelBtn.removeEventListener("click", onCancel);
        document.removeEventListener("keydown", onKey);
        resolve(result);
      };
      const onOverlay = e => { if (e.target === modal) close(false); };
      const onConfirm = () => close(true);
      const onCancel = () => close(false);
      const onKey = e => { if (e.key === "Escape") close(false); };

      modal.addEventListener("click", onOverlay);
      confirmBtn.addEventListener("click", onConfirm);
      cancelBtn.addEventListener("click", onCancel);
      document.addEventListener("keydown", onKey);

      modal.classList.add("open");
    });
  }

  /* ---------- Theme ---------- */
  function storedTheme() {
    try { return localStorage.getItem("notes-theme"); } catch { return null; }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("notes-theme", theme); } catch { /* private mode */ }
  }

  function initTheme() {
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", storedTheme() || (prefersDark ? "dark" : "light"));
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    applyTheme(current === "dark" ? "light" : "dark");
  }

  initTheme();

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-action='toggle-theme']").forEach(btn => {
      btn.addEventListener("click", toggleTheme);
    });
  });

  /* ---------- Note form helpers (create / edit) ---------- */
  function initColorRow(rowEl, initial = "default") {
    let selected = NOTE_COLORS.some(c => c.id === initial) ? initial : "default";
    rowEl.innerHTML = "";
    NOTE_COLORS.forEach(c => {
      const swatch = document.createElement("button");
      swatch.type = "button";
      swatch.className = `color-swatch swatch-${c.id}` + (c.id === selected ? " selected" : "");
      swatch.title = c.label;
      swatch.setAttribute("aria-label", `${c.label} color`);
      swatch.addEventListener("click", () => {
        selected = c.id;
        rowEl.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("selected"));
        swatch.classList.add("selected");
      });
      rowEl.appendChild(swatch);
    });
    return {
      get color() { return selected; },
      set color(value) {
        if (!NOTE_COLORS.some(c => c.id === value)) return;
        selected = value;
        rowEl.querySelectorAll(".color-swatch").forEach(s => {
          s.classList.toggle("selected", s.title.toLowerCase() === NOTE_COLORS.find(c => c.id === value).label.toLowerCase());
        });
      }
    };
  }

  function bindCharCount(textarea, countEl, max = 10000) {
    const update = () => {
      const len = textarea.value.length;
      countEl.textContent = `${len.toLocaleString()} characters`;
      countEl.classList.toggle("over", len > max);
    };
    textarea.addEventListener("input", update);
    update();
  }

  function showFormError(message) {
    const box = document.getElementById("formError");
    if (!box) return;
    box.textContent = message;
    box.classList.add("visible");
  }

  function clearFormError() {
    const box = document.getElementById("formError");
    if (box) {
      box.textContent = "";
      box.classList.remove("visible");
    }
  }

  window.NotesUI = {
    NOTE_COLORS,
    escapeHtml,
    timeAgo,
    formatDate,
    api,
    showToast,
    confirmAction,
    initTheme,
    toggleTheme,
    initColorRow,
    bindCharCount,
    showFormError,
    clearFormError
  };
})();
