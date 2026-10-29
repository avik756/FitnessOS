const form = document.querySelector("#set-form");
const saveButton = document.querySelector("#save-button");
const saveStatus = document.querySelector("#save-status");
const historyStatus = document.querySelector("#history-status");
const historyList = document.querySelector("#history-list");
const backupFile = document.querySelector("#backup-file");
const backupStatus = document.querySelector("#backup-status");
const restoreButton = document.querySelector("#restore-button");
let previewedBackup = null;

// Use the user's local calendar date, not UTC, for the date they experienced.
const now = new Date();
document.querySelector("#activity-date").value = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, "0"),
  String(now.getDate()).padStart(2, "0"),
].join("-");

function showSaveStatus(message, kind = "") {
  saveStatus.textContent = message;
  saveStatus.className = `status ${kind}`;
}

async function loadHistory() {
  historyStatus.textContent = "Loading history…";
  try {
    const response = await fetch("/api/sets", { cache: "no-store" });
    if (!response.ok) throw new Error("History could not be loaded.");
    const sets = await response.json();
    historyList.replaceChildren();
    for (const set of sets) {
      const item = document.createElement("li");
      const title = document.createElement("strong");
      const details = document.createElement("span");
      title.textContent = set.exercise;
      const load = set.load === null ? "load unknown" : `${set.load} ${set.unit} ${set.load_type === "per_hand" ? "per hand" : "total"}`;
      details.textContent = `${set.activity_date} · ${set.reps} reps · ${load}`;
      const repeat = document.createElement("button");
      repeat.type = "button";
      repeat.className = "text-button repeat-button";
      repeat.textContent = "Use again";
      repeat.addEventListener("click", () => {
        form.elements.activity_date.value = set.activity_date;
        form.elements.exercise.value = set.exercise;
        form.elements.reps.value = set.reps;
        form.elements.load.value = set.load ?? "";
        form.elements.unit.value = set.unit;
        form.elements.load_type.value = set.load_type;
        showSaveStatus("Previous values filled in. Review them, then save when ready.");
        form.scrollIntoView({ behavior: "smooth", block: "start" });
        form.elements.reps.focus({ preventScroll: true });
      });
      item.append(title, details, repeat);
      historyList.append(item);
    }
    historyStatus.textContent = sets.length ? "Showing the latest 100 saved sets." : "No sets saved yet.";
  } catch {
    historyStatus.textContent = "History could not be loaded. Try Refresh.";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  saveButton.disabled = true;
  showSaveStatus("Saving…");
  const fields = new FormData(form);
  const set = {
    activity_date: fields.get("activity_date"),
    exercise: fields.get("exercise"),
    reps: Number(fields.get("reps")),
    load: fields.get("load"),
    unit: fields.get("unit"),
    load_type: fields.get("load_type"),
  };
  try {
    const response = await fetch("/api/sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(set),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Save failed. Try again.");
    showSaveStatus("Saved in this computer's database.", "success");
    await loadHistory();
    form.elements.reps.value = "";
    form.elements.load.value = "";
    form.elements.reps.focus();
  } catch (error) {
    showSaveStatus(`${error.message} Your entries are still here.`, "error");
  } finally {
    saveButton.disabled = false;
  }
});

document.querySelector("#refresh-button").addEventListener("click", loadHistory);

async function postBackup(path, data) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "The request failed.");
  return result;
}

document.querySelector("#export-button").addEventListener("click", async () => {
  backupStatus.textContent = "Preparing backup…";
  try {
    const response = await fetch("/api/export", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not create the backup.");
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = "fitnessos-sets.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    backupStatus.textContent = "Backup downloaded. Check that you can find the file.";
  } catch (error) {
    backupStatus.textContent = error.message;
  }
});

backupFile.addEventListener("change", () => {
  previewedBackup = null;
  restoreButton.disabled = true;
  backupStatus.textContent = "";
});

document.querySelector("#preview-button").addEventListener("click", async () => {
  previewedBackup = null;
  restoreButton.disabled = true;
  if (!backupFile.files.length) {
    backupStatus.textContent = "Choose a JSON backup first.";
    return;
  }
  backupStatus.textContent = "Checking backup…";
  try {
    const data = JSON.parse(await backupFile.files[0].text());
    const preview = await postBackup("/api/restore/preview", data);
    previewedBackup = data;
    backupStatus.textContent = `${preview.import_count} sets dated ${preview.first_date} to ${preview.last_date}. ${preview.existing_count} sets currently saved. ${preview.can_restore ? "Ready to restore." : "Restore is available only in an empty database."}`;
    restoreButton.disabled = !preview.can_restore;
  } catch (error) {
    backupStatus.textContent = `Cannot preview backup: ${error.message}`;
  }
});

restoreButton.addEventListener("click", async () => {
  if (!previewedBackup) return;
  restoreButton.disabled = true;
  backupStatus.textContent = "Restoring…";
  try {
    const result = await postBackup("/api/restore", previewedBackup);
    previewedBackup = null;
    backupStatus.textContent = `Restored ${result.restored} sets. Check them in history.`;
    await loadHistory();
  } catch (error) {
    backupStatus.textContent = `Restore failed: ${error.message}`;
  }
});

loadHistory();
