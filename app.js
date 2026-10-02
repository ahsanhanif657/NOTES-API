/* Home page: load stats, render notes, search, sort, tag filter, pin & delete */
(() => {
  "use strict";

  const { escapeHtml, timeAgo, api, showToast, confirmAction } = window.NotesUI;

  const container = document.getElementById("notesContainer");
  const searchInput = document.getElementById("searchInput");
  const searchWrap = document.getElementById("searchWrap");
  const searchClear = document.getElementById("searchClear");
  const sortSelect = document.getElementById("sortSelect");
  const tagFilterBar = document.getElementById("tagFilterBar");
  const subtitle = document.getElementById("notesSubtitle");

  let allNotes = [];
  let activeTag = null;

  const EMPTY_STATE = `
    <div class="empty-state">
      <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/>
      </svg>
      <h3>No notes yet</h3>
      <p>Your notes will appear here once you create one.</p>
      <a class="btn" href="create.html">Create your first note</a>
    </div>`;

  const NO_RESULTS = `
    <div class="empty-state">
      <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7"/><path d="m21 21-3.5-3.5"/>
      </svg>
      <h3>No matching notes</h3>
      <p>Try a different keyword or clear the filters.</p>
    </div>`;

  async function loadStats() {
    try {
      const stats = await api("/api/stats");
      document.getElementById("statTotal").textContent = stats.total;
      document.getElementById("statPinned").textContent = stats.pinned;
      document.getElementById("statTags").textContent = stats.tags.length;
      renderTagFilters(stats.tags);
    } catch {
      /* stats are decorative — ignore failures */
    }
  }

  function renderTagFilters(tags) {
    if (!tags.length) {
      tagFilterBar.hidden = true;
      tagFilterBar.innerHTML = "";
      return;
    }
    tagFilterBar.innerHTML = "";
    tags.forEach(({ name, count }) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "tag-chip" + (activeTag === name ? " active" : "");
      chip.textContent = `#${name} (${count})`;
      chip.addEventListener("click", () => {
        activeTag = activeTag === name ? null : name;
        renderTagFilters(tags);
        updateSubtitle();
        renderNotes(currentView());
      });
      tagFilterBar.appendChild(chip);
    });
    tagFilterBar.hidden = false;
  }

  async function loadNotes() {
    container.innerHTML = "";
    try {
      allNotes = await api("/api/notes");
      renderNotes(currentView());
      updateSubtitle();
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><h3>Could not load notes</h3><p>${escapeHtml(err.message)}</p></div>`;
    }
  }

  function currentView() {
    const keyword = searchInput.value.trim().toLowerCase();
    let notes = allNotes;
    if (keyword) {
      notes = notes.filter(
        n => n.title.toLowerCase().includes(keyword) || n.content.toLowerCase().includes(keyword)
      );
    }
    if (activeTag) {
      notes = notes.filter(n => (n.tags || []).some(t => t === activeTag));
    }
    return notes;
  }

  function updateSubtitle() {
    const visible = currentView().length;
    if (allNotes.length === 0) {
      subtitle.textContent = "A clean slate — let's take some notes.";
    } else {
      subtitle.textContent = `${visible} of ${allNotes.length} note${allNotes.length === 1 ? "" : "s"}` +
        (activeTag ? ` tagged #${activeTag}` : "");
    }
  }

  function renderNotes(notes) {
    container.innerHTML = "";
    if (allNotes.length === 0) {
      container.innerHTML = EMPTY_STATE;
      return;
    }
    if (notes.length === 0) {
      container.innerHTML = NO_RESULTS;
      return;
    }
    notes.forEach(note => container.appendChild(buildCard(note)));
  }

  function buildCard(note) {
    const card = document.createElement("div");
    card.className = "note-card";
    card.dataset.color = note.color || "default";
    card.dataset.pinned = note.pinned ? "true" : "false";

    const excerpt = note.content.length > 180 ? note.content.slice(0, 180) + "…" : note.content;

    const tagsHtml = (note.tags || []).length
      ? `<div class="note-tags">${note.tags.map(t => `<span class="mini-tag">#${escapeHtml(t)}</span>`).join("")}</div>`
      : "";

    card.innerHTML = `
      <button class="pin-badge" type="button" title="${note.pinned ? "Unpin" : "Pin"} note" aria-label="Pin note">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="${note.pinned ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 17v5"/><path d="M9 10.8 6.7 13.1a1 1 0 0 0 .7 1.7H16.6a1 1 0 0 0 .7-1.7L15 10.8V5h1a1 1 0 1 0 0-2H8a1 1 0 0 0 0 2h1z"/></svg>
      </button>
      <h2>${escapeHtml(note.title)}</h2>
      <p class="note-excerpt">${escapeHtml(excerpt)}</p>
      ${tagsHtml}
      <small class="note-meta">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        ${escapeHtml(timeAgo(note.updatedAt))}
      </small>
      <div class="actions">
        <a class="btn btn-ghost btn-sm" href="note.html?id=${encodeURIComponent(note.id)}">View</a>
        <a class="btn btn-ghost btn-sm" href="edit.html?id=${encodeURIComponent(note.id)}">Edit</a>
        <button class="btn btn-danger btn-sm" type="button" data-action="delete">Delete</button>
      </div>`;

    card.querySelector(".pin-badge").addEventListener("click", () => togglePin(note.id));
    card.querySelector("[data-action='delete']").addEventListener("click", () => deleteNote(note.id, note.title));
    return card;
  }

  async function togglePin(id) {
    try {
      const updated = await api(`/api/notes/${id}/pin`, { method: "PATCH" });
      const idx = allNotes.findIndex(n => n.id === id);
      if (idx !== -1) allNotes[idx] = updated;
      showToast(updated.pinned ? "Note pinned to top" : "Note unpinned");
      applySort();
      renderNotes(currentView());
      updateSubtitle();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function deleteNote(id, title) {
    const confirmed = await confirmAction({
      title: "Delete this note?",
      message: `"${title}" will be permanently removed. This cannot be undone.`,
      confirmText: "Delete"
    });
    if (!confirmed) return;
    try {
      await api(`/api/notes/${id}`, { method: "DELETE" });
      allNotes = allNotes.filter(n => n.id !== id);
      showToast("Note deleted successfully");
      renderNotes(currentView());
      updateSubtitle();
      loadStats();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  function applySort() {
    const [sort, dir] = (sortSelect.value || "updatedAt-desc").split("-");
    const factor = dir === "asc" ? 1 : -1;
    allNotes.sort((a, b) => {
      let result = 0;
      if (sort === "title") result = a.title.localeCompare(b.title);
      else result = new Date(a[sort] || 0) - new Date(b[sort] || 0);
      return result * factor;
    });
    allNotes.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  }

  /* ---------- Events ---------- */
  let debounceTimer;
  searchInput.addEventListener("input", () => {
    searchWrap.classList.toggle("has-value", searchInput.value.length > 0);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      renderNotes(currentView());
      updateSubtitle();
    }, 180);
  });

  searchClear.addEventListener("click", () => {
    searchInput.value = "";
    searchWrap.classList.remove("has-value");
    renderNotes(currentView());
    updateSubtitle();
    searchInput.focus();
  });

  sortSelect.addEventListener("change", () => {
    applySort();
    renderNotes(currentView());
  });

  loadStats();
  loadNotes();
})();
