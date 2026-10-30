const form = document.querySelector("#set-form");
const saveButton = document.querySelector("#save-button");
const saveStatus = document.querySelector("#save-status");
const historyStatus = document.querySelector("#history-status");
const historyList = document.querySelector("#history-list");
const backupFile = document.querySelector("#backup-file");
const backupStatus = document.querySelector("#backup-status");
const restoreButton = document.querySelector("#restore-button");
const recentList = document.querySelector("#recent-list");
const recentStatus = document.querySelector("#recent-status");
const copyRecentValuesButton = document.querySelector("#copy-recent-values");
const lastSavedCard = document.querySelector("#last-saved");
const lastSavedDetails = document.querySelector("#last-saved-details");
let selectedRecentSet = null;
let lastSavedSet = null;
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

function describeSet(set) {
  const load = set.load === null ? "load unknown" : `${set.load} ${set.unit} ${set.load_type === "per_hand" ? "per hand" : "total"}`;
  return `${set.reps} reps · ${load}`;
}

function fillValues(set) {
  form.elements.reps.value = set.reps;
  form.elements.load.value = set.load ?? "";
}

function fillFromSavedSet(set) {
  form.elements.activity_date.value = set.activity_date;
  form.elements.exercise.value = set.exercise;
  form.elements.unit.value = set.unit;
  form.elements.load_type.value = set.load_type;
  fillValues(set);
  selectedRecentSet = null;
  copyRecentValuesButton.hidden = true;
  showSaveStatus("Values copied into the form. Review them, then save when ready.");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
  form.elements.reps.focus({ preventScroll: true });
}

async function loadRecentExercises() {
  recentStatus.textContent = "Loading recent exercises…";
  try {
    const response = await fetch("/api/recent-exercises", { cache: "no-store" });
    if (!response.ok) throw new Error("Recent exercises could not be loaded.");
    const sets = await response.json();
    recentList.replaceChildren();
    selectedRecentSet = null;
    copyRecentValuesButton.hidden = true;
    for (const set of sets) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "recent-button";
      const name = document.createElement("strong");
      name.textContent = set.exercise;
      const details = document.createElement("span");
      details.textContent = describeSet(set);
      button.append(name, details);
      button.addEventListener("click", () => {
        form.elements.exercise.value = set.exercise;
        form.elements.unit.value = set.unit;
        form.elements.load_type.value = set.load_type;
        selectedRecentSet = set;
        copyRecentValuesButton.hidden = false;
        showSaveStatus(`${set.exercise} selected. Reps and load are unchanged; copy the last values or enter your own.`);
      });
      recentList.append(button);
    }
    recentStatus.textContent = sets.length ? "Choose an exercise to fill its name and load convention." : "No recent exercises yet. Type a name to begin.";
  } catch {
    recentList.replaceChildren();
    selectedRecentSet = null;
    copyRecentValuesButton.hidden = true;
    recentStatus.textContent = "Recent exercises unavailable. Type a name manually.";
  }
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
      details.textContent = `${set.activity_date} · ${describeSet(set)}`;
      const repeat = document.createElement("button");
      repeat.type = "button";
      repeat.className = "text-button repeat-button";
      repeat.textContent = "Use again";
      repeat.addEventListener("click", () => {
        fillFromSavedSet(set);
      });
      item.append(title, details, repeat);
      historyList.append(item);
    }
    historyStatus.textContent = sets.length ? "Showing the latest 100 saved sets." : "No sets saved yet.";
  } catch {
    historyStatus.textContent = "History could not be loaded. Try Refresh.";
  }
}

form.elements.exercise.addEventListener("input", () => {
  selectedRecentSet = null;
  copyRecentValuesButton.hidden = true;
});

copyRecentValuesButton.addEventListener("click", () => {
  if (!selectedRecentSet) return;
  fillValues(selectedRecentSet);
  showSaveStatus("Last reps and load copied. Review them, then save when ready.");
  form.elements.reps.focus();
});

document.querySelector("#repeat-values").addEventListener("click", () => {
  if (lastSavedSet) fillFromSavedSet(lastSavedSet);
});

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
    let response;
    try {
      response = await fetch("/api/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(set),
      });
    } catch {
      showSaveStatus("Could not confirm the save. Check history before retrying; your entries are still here.", "error");
      return;
    }
    let result;
    try {
      result = await response.json();
    } catch {
      showSaveStatus("Could not read the save response. Check history before retrying; your entries are still here.", "error");
      return;
    }
    if (!response.ok) {
      showSaveStatus(`${result.error || "Save failed."} Your entries are still here.`, "error");
      return;
    }
    lastSavedSet = result;
    lastSavedDetails.textContent = `${result.activity_date} · ${result.exercise} · ${describeSet(result)}`;
    lastSavedCard.hidden = false;
    showSaveStatus("Saved in this computer's database.", "success");
    form.elements.reps.value = "";
    form.elements.load.value = "";
    await Promise.all([loadHistory(), loadRecentExercises()]);
    form.elements.reps.focus();
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
loadRecentExercises();
