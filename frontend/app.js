const form = document.querySelector("#set-form");
const saveButton = document.querySelector("#save-button");
const saveStatus = document.querySelector("#save-status");
const historyStatus = document.querySelector("#history-status");
const historyList = document.querySelector("#history-list");
const historyFilter = document.querySelector("#history-filter");
const backupFile = document.querySelector("#backup-file");
const backupStatus = document.querySelector("#backup-status");
const restoreButton = document.querySelector("#restore-button");
const recentList = document.querySelector("#recent-list");
const recentStatus = document.querySelector("#recent-status");
const copyRecentValuesButton = document.querySelector("#copy-recent-values");
const lastSavedCard = document.querySelector("#last-saved");
const lastSavedDetails = document.querySelector("#last-saved-details");
const progressExercise = document.querySelector("#progress-exercise");
const comingNames = {
  cardio: "Cardio & sports", nutrition: "Detailed nutrition",
  reminders: "Reminders", voice: "Voice entry", wearables: "Wearables",
};
let selectedRecentSet = null;
let lastSavedSet = null;
let previewedBackup = null;
let recentSets = [];
let exercises = [];
let favorites = [];

// Use the local calendar date the user experienced.
const now = new Date();
form.elements.activity_date.value = [
  now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0"),
].join("-");

async function apiFetch(path, options = {}) {
  const response = await fetch(path, options);
  if (response.status === 401) {
    window.location.replace("/login");
    throw new Error("Your session ended. Sign in again.");
  }
  return response;
}

function showSaveStatus(message, kind = "") {
  saveStatus.textContent = message;
  saveStatus.className = `status ${kind}`;
}

function describeSet(set) {
  const load = set.load === null
    ? "load unknown"
    : `${set.load} ${set.unit} ${set.load_type === "per_hand" ? "per hand" : "total"}`;
  return `${set.reps} reps · ${load}`;
}

function setTextRow(list, title, detail) {
  const item = document.createElement("li");
  const strong = document.createElement("strong");
  const span = document.createElement("span");
  strong.textContent = title;
  span.textContent = detail;
  item.append(strong, span);
  list.append(item);
  return item;
}

function fillValues(set) {
  form.elements.reps.value = set.reps;
  form.elements.load.value = set.load ?? "";
}

function fillFromSavedSet(set) {
  window.clearWorkoutContext?.();
  form.elements.activity_date.value = set.activity_date;
  form.elements.exercise.value = set.exercise;
  form.elements.unit.value = set.unit;
  form.elements.load_type.value = set.load_type;
  fillValues(set);
  selectedRecentSet = null;
  copyRecentValuesButton.hidden = true;
  showSaveStatus("Values copied into the form. Review them, then save when ready.");
  window.location.hash = "#log";
  requestAnimationFrame(() => form.elements.reps.focus());
}

function selectExerciseForLog(name) {
  window.clearWorkoutContext?.();
  form.elements.exercise.value = name;
  const recent = recentSets.find((set) => set.exercise.toLowerCase() === name.toLowerCase());
  if (recent) {
    form.elements.unit.value = recent.unit;
    form.elements.load_type.value = recent.load_type;
  }
  selectedRecentSet = recent ?? null;
  copyRecentValuesButton.hidden = !recent;
  showSaveStatus(`${name} selected. Review or enter reps and load, then save.`);
  window.location.hash = "#log";
  requestAnimationFrame(() => form.elements.reps.focus());
}

function showRoute() {
  const raw = window.location.hash.slice(1) || "home";
  const route = raw.startsWith("coming/") ? "coming" : raw;
  const known = ["home", "log", "history", "body", "calories", "make", "exercises", "progress", "backup", "more", "coming", "daily", "workouts", "foods", "photos"];
  const selected = known.includes(route) ? route : "home";
  for (const view of document.querySelectorAll("[data-view]")) view.hidden = view.dataset.view !== selected;
  if (selected === "coming") {
    const feature = raw.split("/")[1];
    document.querySelector("#coming-title").textContent = comingNames[feature] || "A new space";
  }
  const mobileCurrent = ["home", "log", "history"].includes(selected) ? selected : "more";
  for (const link of document.querySelectorAll("[data-nav]")) {
    const active = link.dataset.nav === (link.closest(".mobile-nav") ? mobileCurrent : selected);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", showRoute);
showRoute();

async function loadAccount() {
  try {
    const response = await apiFetch("/api/auth/status", { cache: "no-store" });
    const status = await response.json();
    if (!status.authenticated) {
      window.location.replace("/login");
      return;
    }
    document.querySelector("#account-name").textContent = status.name;
  } catch {
    document.querySelector("#account-name").textContent = "you";
  }
}

async function loadOverview() {
  const status = document.querySelector("#overview-status");
  status.textContent = "Loading your records…";
  try {
    const response = await apiFetch("/api/overview", { cache: "no-store" });
    if (!response.ok) throw new Error("Overview could not be loaded.");
    const overview = await response.json();
    document.querySelector("#total-sets").textContent = overview.set_count;
    document.querySelector("#active-days").textContent = overview.active_days;
    const list = document.querySelector("#overview-list");
    list.replaceChildren();
    for (const set of overview.recent_sets) setTextRow(list, set.exercise, `${set.activity_date} · ${describeSet(set)}`);
    status.textContent = overview.recent_sets.length ? "Your three most recently saved sets." : "No sets yet. Log your first set to begin.";
  } catch {
    status.textContent = "Overview could not be loaded.";
  }
}

async function loadRecentExercises() {
  recentStatus.textContent = "Loading recent exercises…";
  try {
    const response = await apiFetch("/api/recent-exercises", { cache: "no-store" });
    if (!response.ok) throw new Error("Recent exercises could not be loaded.");
    recentSets = await response.json();
    recentList.replaceChildren();
    selectedRecentSet = null;
    copyRecentValuesButton.hidden = true;
    for (const set of recentSets) {
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
    recentStatus.textContent = recentSets.length ? "Choose an exercise to fill its name and load convention." : "No recent exercises yet. Type a name to begin.";
  } catch {
    recentList.replaceChildren();
    recentSets = [];
    selectedRecentSet = null;
    copyRecentValuesButton.hidden = true;
    recentStatus.textContent = "Recent exercises unavailable. Type a name manually.";
  }
}

function refillSelect(select, firstLabel, previous) {
  select.replaceChildren(new Option(firstLabel, ""));
  for (const exercise of exercises) select.add(new Option(exercise.exercise, exercise.exercise));
  select.value = exercises.some((exercise) => exercise.exercise === previous) ? previous : "";
}

function exerciseCard(name, detail, isFavorite) {
  const card = document.createElement("div");
  card.className = "exercise-card";
  const title = document.createElement("strong");
  title.textContent = name;
  const small = document.createElement("small");
  small.textContent = detail;
  const actions = document.createElement("div");
  actions.className = "exercise-actions";
  const log = document.createElement("button");
  log.type = "button";
  log.textContent = "Log a set";
  log.addEventListener("click", () => selectExerciseForLog(name));
  const favorite = document.createElement("button");
  favorite.type = "button";
  favorite.textContent = isFavorite ? "Remove favorite" : "Add favorite";
  favorite.addEventListener("click", async () => {
    favorite.disabled = true;
    try {
      const response = await apiFetch("/api/favorites", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exercise: name, favorite: !isFavorite }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update favorite.");
      favorites = result.favorites;
      renderExercises();
    } catch (error) {
      document.querySelector("#favorites-status").textContent = error.message;
      favorite.disabled = false;
    }
  });
  actions.append(log, favorite);
  card.append(title, small, actions);
  return card;
}

function renderExercises() {
  const favoriteList = document.querySelector("#favorites-list");
  const allList = document.querySelector("#all-exercises-list");
  const shortcuts = document.querySelector("#favorite-shortcuts");
  favoriteList.replaceChildren();
  allList.replaceChildren();
  shortcuts.replaceChildren();
  const favoriteKey = new Set(favorites.map((name) => name.toLowerCase()));
  for (const name of favorites) {
    const record = exercises.find((item) => item.exercise.toLowerCase() === name.toLowerCase());
    favoriteList.append(exerciseCard(name, record ? `${record.set_count} saved ${record.set_count === 1 ? "set" : "sets"}` : "No saved sets yet", true));
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip-button";
    button.textContent = name;
    button.addEventListener("click", () => selectExerciseForLog(name));
    shortcuts.append(button);
  }
  for (const item of exercises) {
    allList.append(exerciseCard(item.exercise, `${item.set_count} ${item.set_count === 1 ? "set" : "sets"}${item.last_date ? ` · last dated ${item.last_date}` : " · created exercise"}`, favoriteKey.has(item.exercise.toLowerCase())));
  }
  document.querySelector("#favorites-status").textContent = favorites.length ? "" : "No favorites yet. Add one from your logged exercises.";
  document.querySelector("#exercises-status").textContent = exercises.length ? `${exercises.length} ${exercises.length === 1 ? "exercise" : "exercises"} with records.` : "No exercises logged yet.";
  if (!favorites.length) shortcuts.textContent = "Add favorites from the Exercises page.";
}

async function loadExercises() {
  try {
    const [exerciseResponse, favoriteResponse] = await Promise.all([
      apiFetch("/api/exercises", { cache: "no-store" }),
      apiFetch("/api/favorites", { cache: "no-store" }),
    ]);
    if (!exerciseResponse.ok || !favoriteResponse.ok) throw new Error("Exercises could not be loaded.");
    exercises = await exerciseResponse.json();
    favorites = await favoriteResponse.json();
    refillSelect(historyFilter, "All recent sets", historyFilter.value);
    refillSelect(progressExercise, "Select an exercise", progressExercise.value);
    renderExercises();
  } catch {
    document.querySelector("#exercises-status").textContent = "Exercises could not be loaded. Try reloading the page.";
  }
}

async function loadHistory() {
  historyStatus.textContent = "Loading history…";
  try {
    const exercise = historyFilter.value;
    const path = exercise ? `/api/sets?exercise=${encodeURIComponent(exercise)}` : "/api/sets";
    const response = await apiFetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error("History could not be loaded.");
    const sets = await response.json();
    historyList.replaceChildren();
    for (const set of sets) {
      const item = setTextRow(historyList, set.exercise, `${set.activity_date} · ${describeSet(set)}`);
      const repeat = document.createElement("button");
      repeat.type = "button";
      repeat.className = "text-button repeat-button";
      repeat.textContent = "Use again";
      repeat.addEventListener("click", () => fillFromSavedSet(set));
      item.append(repeat);
    }
    historyStatus.textContent = exercise
      ? `${sets.length} saved sets for ${exercise}.`
      : sets.length ? "Showing the latest 100 saved sets. Choose an exercise to see all of its sets." : "No sets saved yet.";
  } catch {
    historyStatus.textContent = "History could not be loaded. Try Refresh.";
  }
}

async function loadProgress() {
  const status = document.querySelector("#progress-status");
  const summary = document.querySelector("#progress-summary");
  const chart = document.querySelector("#progress-chart");
  const list = document.querySelector("#progress-list");
  const exercise = progressExercise.value;
  summary.replaceChildren();
  chart.replaceChildren();
  list.replaceChildren();
  if (!exercise) {
    status.textContent = "Choose an exercise to review its recorded sets.";
    return;
  }
  status.textContent = "Loading records…";
  try {
    const response = await apiFetch(`/api/sets?exercise=${encodeURIComponent(exercise)}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Progress records could not be loaded.");
    const sets = await response.json();
    const counts = new Map();
    for (const set of sets) counts.set(set.activity_date, (counts.get(set.activity_date) || 0) + 1);
    for (const [label, value] of [["Sets logged", sets.length], ["Days recorded", counts.size]]) {
      const card = document.createElement("div");
      card.className = "stat-card";
      const span = document.createElement("span");
      const strong = document.createElement("strong");
      span.textContent = label;
      strong.textContent = value;
      card.append(span, strong);
      summary.append(card);
    }
    const days = [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-7);
    const peak = Math.max(1, ...days.map(([, count]) => count));
    for (const [date, count] of days) {
      const column = document.createElement("div");
      column.className = "bar-column";
      const number = document.createElement("strong");
      number.textContent = count;
      const bar = document.createElement("div");
      bar.className = "bar";
      bar.style.height = `${Math.max(9, Math.round(count / peak * 75))}px`;
      const day = document.createElement("span");
      day.textContent = date.slice(5);
      column.append(number, bar, day);
      chart.append(column);
    }
    for (const set of sets.slice(0, 10)) setTextRow(list, set.activity_date, describeSet(set));
    status.textContent = sets.length ? "Logged set count by activity date, followed by the 10 most recent records." : "No sets recorded for this exercise.";
  } catch {
    status.textContent = "Progress records could not be loaded.";
  }
}

form.elements.exercise.addEventListener("input", () => {
  window.clearWorkoutContext?.();
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
historyFilter.addEventListener("change", loadHistory);
progressExercise.addEventListener("change", loadProgress);
document.querySelector("#refresh-button").addEventListener("click", loadHistory);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  saveButton.disabled = true;
  showSaveStatus("Saving…");
  const fields = new FormData(form);
  const set = {
    activity_date: fields.get("activity_date"), exercise: fields.get("exercise"),
    reps: Number(fields.get("reps")), load: fields.get("load"),
    unit: fields.get("unit"), load_type: fields.get("load_type"),
    session_id: window.workoutContext?.id ?? null, session_exercise: window.workoutContext?.position ?? null,
  };
  try {
    let response;
    try {
      response = await apiFetch("/api/sets", {
        method: "POST", headers: { "Content-Type": "application/json" },
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
    window.dispatchEvent(new Event("records-changed"));
    lastSavedDetails.textContent = `${result.activity_date} · ${result.exercise} · ${describeSet(result)}`;
    lastSavedCard.hidden = false;
    showSaveStatus("Saved in this computer's database.", "success");
    form.elements.reps.value = "";
    form.elements.load.value = "";
    await loadExercises();
    await Promise.all([loadHistory(), loadRecentExercises(), loadOverview(), loadProgress()]);
    form.elements.reps.focus();
  } finally {
    saveButton.disabled = false;
  }
});

async function postBackup(path, data) {
  const response = await apiFetch(path, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "The request failed.");
  return result;
}

document.querySelector("#export-button").addEventListener("click", async () => {
  backupStatus.textContent = "Preparing backup…";
  try {
    const response = await apiFetch("/api/export", { cache: "no-store" });
    if (!response.ok) { const failure = await response.json(); throw new Error(failure.error || "Could not create the backup."); }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = "fitnessos-backup.json";
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
    const dates = preview.import_count ? `dated ${preview.first_date} to ${preview.last_date}` : "with no set dates";
    backupStatus.textContent = `${preview.journal_count || 0} journal entries (including ${preview.photo_count || 0} photos), ${preview.import_count} sets, ${preview.favorite_count} favorites, ${preview.body_count} body entries, ${preview.calorie_count} calorie entries, ${preview.workout_count} workouts, and ${preview.exercise_count} custom exercises ${dates}. ${preview.existing_count + preview.existing_favorite_count + preview.existing_other_count} items currently saved. ${preview.can_restore ? "Ready to restore." : "Restore requires an empty database of records."}`;
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
    window.dispatchEvent(new Event("records-changed"));
    backupStatus.textContent = `Restored ${result.restored} sets and ${result.favorites_restored} favorites. All record types restored. Review History, Daily journal, Workouts, Food library, and Photos.`;
    await loadExercises();
    await Promise.all([loadHistory(), loadRecentExercises(), loadOverview(), loadProgress()]);
  } catch (error) {
    backupStatus.textContent = `Restore failed: ${error.message}`;
  }
});

for (const button of document.querySelectorAll("[data-logout]")) {
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
      });
      if (!response.ok) throw new Error("Sign out failed.");
      window.location.replace("/login");
    } catch {
      button.textContent = "Sign out failed";
      button.disabled = false;
    }
  });
}

loadAccount();
loadOverview();
loadRecentExercises();
loadExercises().then(() => Promise.all([loadHistory(), loadProgress()]));
