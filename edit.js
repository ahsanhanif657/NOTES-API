/* Edit note page */
(() => {
  "use strict";

  const { api, showToast, initColorRow, bindCharCount, showFormError, clearFormError } = window.NotesUI;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const form = document.getElementById("editForm");
  const titleInput = document.getElementById("title");
  const contentInput = document.getElementById("content");
  const tagsInput = document.getElementById("tags");
  const pinnedInput = document.getElementById("pinned");
  const saveBtn = document.getElementById("saveBtn");
  const colorRow = initColorRow(document.getElementById("colorRow"));

  bindCharCount(contentInput, document.getElementById("contentCount"));

  if (!id) {
    document.querySelector(".form-card").innerHTML =
      "<h1>Edit Note</h1><p>No note ID was provided in the URL.</p><a class='btn' href='index.html'>Back to Notes</a>";
  } else {
    loadNote();
  }

  async function loadNote() {
    try {
      const note = await api(`/api/notes/${encodeURIComponent(id)}`);
      document.title = `${note.title} — My Notes`;
      titleInput.value = note.title;
      contentInput.value = note.content;
      tagsInput.value = (note.tags || []).join(", ");
      pinnedInput.checked = !!note.pinned;
      colorRow.color = note.color || "default";
    } catch (err) {
      document.querySelector(".form-card").innerHTML =
        `<h1>Edit Note</h1><p>${err.message}</p><a class='btn' href='index.html'>Back to Notes</a>`;
    }
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    clearFormError();

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (!title) return showFormError("Title cannot be empty.");
    if (!content) return showFormError("Content cannot be empty.");

    saveBtn.disabled = true;
    try {
      await api(`/api/notes/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: {
          title,
          content,
          tags: tagsInput.value,
          color: colorRow.color,
          pinned: pinnedInput.checked
        }
      });
      showToast("Note updated successfully");
      window.location.href = `note.html?id=${encodeURIComponent(id)}`;
    } catch (err) {
      showFormError(err.message);
      saveBtn.disabled = false;
    }
  });
})();
