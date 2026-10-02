/* Single note view page */
(() => {
  "use strict";

  const { escapeHtml, formatDate, timeAgo, api, showToast, confirmAction } = window.NotesUI;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const noteContainer = document.getElementById("note");

  if (!id) {
    renderError("No note ID was provided in the URL.");
  } else {
    loadNote();
  }

  function renderError(message) {
    noteContainer.dataset.color = "default";
    noteContainer.innerHTML = `
      <h1>Oops</h1>
      <p class="note-body">${escapeHtml(message)}</p>
      <div class="actions">
        <a class="btn" href="index.html">Back to Notes</a>
      </div>`;
  }

  async function loadNote() {
    try {
      const note = await api(`/api/notes/${encodeURIComponent(id)}`);
      document.title = `${note.title} — My Notes`;
      renderNote(note);
    } catch (err) {
      renderError(err.message);
    }
  }

  function renderNote(note) {
    noteContainer.dataset.color = note.color || "default";

    const tagsHtml = (note.tags || []).length
      ? `<div class="note-tags">${note.tags.map(t => `<span class="mini-tag">#${escapeHtml(t)}</span>`).join("")}</div>`
      : "";

    const pinnedHtml = note.pinned
      ? `<span class="pinned-flag">
           <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M16 3a1 1 0 0 1 .7.3l4 4a1 1 0 0 1-.3 1.63l-3.6 1.8-2.2 5.9a1 1 0 0 1-1.63.32L9 13.4l-5 5L3 19l5-5-3.55-3.97a1 1 0 0 1 .32-1.64L10.7 6.2l1.8-3.6A1 1 0 0 1 16 3z"/></svg>
           Pinned
         </span>`
      : "";

    noteContainer.innerHTML = `
      <h1>${escapeHtml(note.title)}</h1>
      <div class="meta-row">
        ${pinnedHtml}
        <span class="meta-item" title="${escapeHtml(formatDate(note.createdAt))}">Created ${escapeHtml(timeAgo(note.createdAt))}</span>
        <span class="meta-item" title="${escapeHtml(formatDate(note.updatedAt))}">Updated ${escapeHtml(timeAgo(note.updatedAt))}</span>
      </div>
      <p class="note-body">${escapeHtml(note.content)}</p>
      ${tagsHtml}
      <div class="actions">
        <a class="btn" href="edit.html?id=${encodeURIComponent(note.id)}">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit Note
        </a>
        <button class="btn btn-danger" type="button" id="deleteBtn">Delete Note</button>
      </div>`;

    noteContainer.querySelector("#deleteBtn").addEventListener("click", async () => {
      const confirmed = await confirmAction({
        title: "Delete this note?",
        message: `"${note.title}" will be permanently removed. This cannot be undone.`,
        confirmText: "Delete"
      });
      if (!confirmed) return;
      try {
        await api(`/api/notes/${encodeURIComponent(note.id)}`, { method: "DELETE" });
        showToast("Note deleted successfully");
        window.location.href = "index.html";
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }
})();
