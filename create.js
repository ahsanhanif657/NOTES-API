/* Create note page */
(() => {
  "use strict";

  const { api, showToast, initColorRow, bindCharCount, showFormError, clearFormError } = window.NotesUI;

  const form = document.getElementById("noteForm");
  const titleInput = document.getElementById("title");
  const contentInput = document.getElementById("content");
  const tagsInput = document.getElementById("tags");
  const pinnedInput = document.getElementById("pinned");
  const saveBtn = document.getElementById("saveBtn");
  const colorRow = initColorRow(document.getElementById("colorRow"));

  bindCharCount(contentInput, document.getElementById("contentCount"));

  form.addEventListener("submit", async e => {
    e.preventDefault();
    clearFormError();

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (!title) return showFormError("Please give your note a title.");
    if (!content) return showFormError("Please write some content before saving.");

    saveBtn.disabled = true;
    try {
      const note = await api("/api/notes", {
        method: "POST",
        body: {
          title,
          content,
          tags: tagsInput.value,
          color: colorRow.color,
          pinned: pinnedInput.checked
        }
      });
      showToast("Note created successfully");
      window.location.href = `note.html?id=${encodeURIComponent(note.id)}`;
    } catch (err) {
      showFormError(err.message);
      saveBtn.disabled = false;
    }
  });
})();
