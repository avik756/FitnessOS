const bodyForm = document.querySelector("#body-form");
const profileForm = document.querySelector("#profile-form");
const calorieForm = document.querySelector("#calorie-form");
const localToday = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
bodyForm.elements.activity_date.value = localToday;
calorieForm.elements.activity_date.value = localToday;

async function readFeature(path) {
  const response = await apiFetch(path, { cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not load records.");
  return result;
}

function featureStatus(selector, message, kind = "") {
  const node = document.querySelector(selector);
  node.textContent = message;
  node.className = `status ${kind}`;
}

async function saveFeature(formNode, path, payload, statusSelector, afterSave) {
  const button = formNode.querySelector('button[type="submit"]');
  button.disabled = true;
  featureStatus(statusSelector, "Saving…");
  try {
    await postBackup(path, payload);
  } catch (error) {
    featureStatus(statusSelector, `${error.message} Your entries are still here.`, "error");
    button.disabled = false;
    return;
  }
  featureStatus(statusSelector, "Saved in this computer's database.", "success");
  try {
    await afterSave();
  } catch {
    featureStatus(statusSelector, "Saved, but the display could not refresh. Reload to review it.", "error");
  } finally {
    button.disabled = false;
  }
}

let bodyRows = [];
let bodyProfile = {};

function kg(row) {
  if (row.weight === null) return null;
  return Number(row.weight) * (row.weight_unit === "lb" ? 0.45359237 : 1);
}

function cm(row, key) {
  if (row[key] === null) return null;
  return Number(row[key]) * (row.measure_unit === "in" ? 2.54 : 1);
}

function metricValue(row, metric) {
  if (metric === "weight") return kg(row);
  if (metric === "body_fat_pct") return row.body_fat_pct === null ? null : Number(row.body_fat_pct);
  if (metric === "bmi") {
    const height = Number(bodyProfile.height_cm) / 100;
    return height && kg(row) !== null ? kg(row) / (height * height) : null;
  }
  return cm(row, metric);
}

function card(label, value) {
  const node = document.createElement("div");
  node.className = "stat-card";
  const small = document.createElement("span");
  small.textContent = label;
  const strong = document.createElement("strong");
  strong.textContent = value;
  node.append(small, strong);
  return node;
}

function renderBodyTrend() {
  const metric = document.querySelector("#body-trend-select").value;
  const chart = document.querySelector("#body-trend-chart");
  const status = document.querySelector("#body-trend-status");
  chart.replaceChildren();
  const points = bodyRows.map((row) => ({ date: row.activity_date, value: metricValue(row, metric) }))
    .filter((point) => point.value !== null).reverse().slice(-12);
  if (!points.length) {
    status.textContent = metric === "bmi" ? "Add height in your profile and a weight entry to see BMI." : "No values logged for this trend yet.";
    return;
  }
  const low = Math.min(...points.map((point) => point.value));
  const high = Math.max(...points.map((point) => point.value));
  for (const point of points) {
    const column = document.createElement("div");
    column.className = "trend-column";
    const value = document.createElement("strong");
    value.textContent = point.value.toFixed(1);
    const bar = document.createElement("div");
    bar.className = "trend-bar";
    bar.style.height = `${Math.max(12, 20 + (point.value - low) / (high - low || 1) * 70)}px`;
    const label = document.createElement("span");
    label.textContent = point.date.slice(5);
    column.append(value, bar, label);
    chart.append(column);
  }
  const change = points.length > 1 ? ` Change across shown entries: ${(points.at(-1).value - points[0].value).toFixed(1)}.` : "";
  status.textContent = `${points.length} logged value${points.length === 1 ? "" : "s"}, oldest to newest.${change}${metric === "bmi" ? " BMI uses your current profile height for all dates." : ""}`;
}

async function loadBody() {
  try {
    const [rows, profile, stats] = await Promise.all([
      readFeature("/api/body"), readFeature("/api/profile"), readFeature("/api/body/stats"),
    ]);
    bodyRows = rows;
    bodyProfile = profile;
    profileForm.elements.height_cm.value = profile.height_cm ?? "";
    profileForm.elements.age_years.value = profile.age_years ?? "";
    profileForm.elements.formula_variant.value = profile.formula_variant ?? "";
    const cards = document.querySelector("#body-stat-cards");
    cards.replaceChildren(
      card("Latest weight", stats.latest_weight ? `${stats.latest_weight.weight} ${stats.latest_weight.weight_unit}` : "—"),
      card("BMI from latest weight", stats.bmi ?? "—"),
      card("Logged body fat", stats.latest_body_fat ? `${stats.latest_body_fat.body_fat_pct}%` : "—"),
      card("Resting kcal/day · BMR proxy", stats.rmr_kcal ?? "—"),
      card("Last 7 weights · avg kg", stats.recent_weight_average_kg ?? "—"),
      card("Last 7 weights · change kg", stats.recent_weight_change_kg ?? "—"),
    );
    const list = document.querySelector("#body-list");
    list.replaceChildren();
    for (const row of rows.slice(0, 15)) {
      const parts = [];
      if (row.weight !== null) parts.push(`${row.weight} ${row.weight_unit}`);
      if (row.body_fat_pct !== null) parts.push(`${row.body_fat_pct}% body fat`);
      for (const key of ["waist", "chest", "hips", "arm", "thigh"]) if (row[key] !== null) parts.push(`${key} ${row[key]} ${row.measure_unit}`);
      setTextRow(list, row.activity_date, parts.join(" · "));
    }
    renderBodyTrend();
  } catch (error) {
    document.querySelector("#body-trend-status").textContent = error.message;
  }
}

document.querySelector("#body-trend-select").addEventListener("change", renderBodyTrend);
bodyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(bodyForm));
  await saveFeature(bodyForm, "/api/body", values, "#body-save-status", async () => {
    for (const key of ["weight", "body_fat_pct", "waist", "chest", "hips", "arm", "thigh"]) bodyForm.elements[key].value = "";
    await loadBody();
  });
});
profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(profileForm));
  values.age_years = values.age_years ? Number(values.age_years) : null;
  await saveFeature(profileForm, "/api/profile", values, "#profile-status", loadBody);
});

async function loadCalories() {
  try {
    const rows = await readFeature("/api/calories");
    const grouped = new Map();
    for (const row of rows) grouped.set(row.activity_date, (grouped.get(row.activity_date) || 0) + row.kcal);
    document.querySelector("#calorie-summary").textContent = rows.length
      ? `${rows.length} ${rows.length === 1 ? "entry" : "entries"}. Totals reflect logged foods only; missing entries are not zero-calorie days.`
      : "No calorie entries yet.";
    const days = document.querySelector("#calorie-days");
    days.replaceChildren();
    for (const [day, total] of [...grouped].slice(0, 14)) days.append(card(day, `${total} kcal`));
    const list = document.querySelector("#calorie-list");
    list.replaceChildren();
    for (const row of rows.slice(0, 30)) setTextRow(list, `${row.activity_date} · ${row.label}`, `${row.kcal} kcal`);
  } catch (error) {
    document.querySelector("#calorie-summary").textContent = error.message;
  }
}

calorieForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(calorieForm));
  values.kcal = Number(values.kcal);
  await saveFeature(calorieForm, "/api/calories", values, "#calorie-save-status", async () => {
    calorieForm.elements.label.value = "";
    calorieForm.elements.kcal.value = "";
    await loadCalories();
  });
});

let calendarDate = new Date(now.getFullYear(), now.getMonth(), 1);
let selectedDay = localToday;

async function loadDay() {
  const title = document.querySelector("#day-title");
  const details = document.querySelector("#day-details");
  title.textContent = selectedDay;
  details.textContent = "Loading day…";
  try {
    const data = await readFeature(`/api/day?date=${selectedDay}`);
    details.replaceChildren();
    for (const [heading, rows, describe] of [
      ["Strength sets", data.sets, (row) => `${row.exercise} · ${describeSet(row)}`],
      ["Body entries", data.body, (row) => [row.weight === null ? null : `${row.weight} ${row.weight_unit}`, row.body_fat_pct === null ? null : `${row.body_fat_pct}% body fat`, ...["waist", "chest", "hips", "arm", "thigh"].filter((key) => row[key] !== null).map((key) => `${key} ${row[key]} ${row.measure_unit}`)].filter(Boolean).join(" · ")],
      ["Calorie entries", data.calories, (row) => `${row.label} · ${row.kcal} kcal`],
    ]) {
      const section = document.createElement("section");
      const h = document.createElement("h3");
      h.textContent = `${heading} (${rows.length})`;
      section.append(h);
      if (rows.length) {
        const list = document.createElement("ul");
        list.className = "compact-list";
        for (const row of rows) setTextRow(list, describe(row), "");
        section.append(list);
      } else {
        const p = document.createElement("p");
        p.className = "muted";
        p.textContent = "Nothing logged.";
        section.append(p);
      }
      details.append(section);
    }
  } catch (error) {
    details.textContent = error.message;
  }
}

async function loadCalendar() {
  const year = calendarDate.getFullYear();
  const monthIndex = calendarDate.getMonth();
  const month = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  document.querySelector("#calendar-month").textContent = calendarDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const grid = document.querySelector("#calendar-grid");
  const status = document.querySelector("#calendar-status");
  grid.replaceChildren();
  status.textContent = "Loading calendar…";
  try {
    const counts = await readFeature(`/api/calendar?month=${month}`);
    const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
    const length = new Date(year, monthIndex + 1, 0).getDate();
    if (!selectedDay.startsWith(month)) selectedDay = `${month}-01`;
    for (let i = 0; i < firstWeekday; i++) grid.append(document.createElement("span"));
    for (let day = 1; day <= length; day++) {
      const dateString = `${month}-${String(day).padStart(2, "0")}`;
      const data = counts[dateString] || { sets: 0, body: 0, calories: 0 };
      const button = document.createElement("button");
      button.type = "button";
      button.className = `calendar-day${dateString === selectedDay ? " selected" : ""}${data.sets + data.body + data.calories ? " has-entries" : ""}`;
      button.setAttribute("aria-label", `${dateString}: ${data.sets} sets, ${data.body} body entries, ${data.calories} calorie entries`);
      const number = document.createElement("strong");
      number.textContent = day;
      const markers = document.createElement("small");
      markers.textContent = [data.sets ? `${data.sets} S` : "", data.body ? `${data.body} B` : "", data.calories ? `${data.calories} C` : ""].filter(Boolean).join(" · ");
      button.append(number, markers);
      button.addEventListener("click", () => {
        selectedDay = dateString;
        for (const other of grid.querySelectorAll("button")) other.classList.remove("selected");
        button.classList.add("selected");
        loadDay();
      });
      grid.append(button);
    }
    status.textContent = "S = strength sets, B = body entries, C = calorie entries.";
    await loadDay();
  } catch (error) {
    status.textContent = error.message;
  }
}

for (const [selector, offset] of [["#calendar-prev", -1], ["#calendar-next", 1]]) {
  document.querySelector(selector).addEventListener("click", () => {
    calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + offset, 1);
    selectedDay = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, "0")}-01`;
    loadCalendar();
  });
}

async function loadMake() {
  try {
    const plans = await readFeature("/api/make");
    const workoutSelect = document.querySelector("#make-workout-select");
    const daySelect = document.querySelector("#make-day-select");
    const previousWorkout = workoutSelect.value;
    const previousDay = daySelect.value;
    workoutSelect.replaceChildren(new Option("Choose a workout", ""));
    daySelect.replaceChildren(new Option("Choose a day", ""));
    const container = document.querySelector("#made-workouts");
    container.replaceChildren();
    for (const workout of plans.workouts) {
      workoutSelect.add(new Option(workout.name, workout.id));
      const article = document.createElement("article");
      article.className = "made-workout";
      const h = document.createElement("h3");
      h.textContent = workout.name;
      article.append(h);
      for (const day of workout.days) {
        daySelect.add(new Option(`${workout.name} · ${day.name}`, day.id));
        const p = document.createElement("p");
        p.textContent = `${day.name}: `;
        if (!day.exercises.length) p.append("No exercises yet.");
        for (const exercise of day.exercises) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "chip-button";
          button.textContent = exercise;
          button.title = `Log ${exercise}`;
          button.addEventListener("click", () => selectExerciseForLog(exercise));
          p.append(button);
        }
        article.append(p);
      }
      container.append(article);
    }
    if (!plans.workouts.length) container.textContent = "No workouts yet. Make one above.";
    workoutSelect.value = [...workoutSelect.options].some((option) => option.value === previousWorkout) ? previousWorkout : "";
    daySelect.value = [...daySelect.options].some((option) => option.value === previousDay) ? previousDay : "";
    const suggestions = document.querySelector("#exercise-suggestions");
    suggestions.replaceChildren();
    for (const name of [...new Set([...plans.exercises, ...exercises.map((item) => item.exercise)])]) {
      const option = document.createElement("option");
      option.value = name;
      suggestions.append(option);
    }
  } catch (error) {
    featureStatus("#make-status", error.message, "error");
  }
}

for (const [id, kind] of [["make-exercise-form", "exercise"], ["make-workout-form", "workout"],
                          ["make-day-form", "day"], ["make-day-exercise-form", "day-exercise"]]) {
  const target = document.getElementById(id);
  target.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(target));
    if (payload.workout_id) payload.workout_id = Number(payload.workout_id);
    if (payload.day_id) payload.day_id = Number(payload.day_id);
    await saveFeature(target, `/api/make/${kind}`, payload, "#make-status", async () => {
      if (target.elements.name) target.elements.name.value = "";
      if (target.elements.exercise) target.elements.exercise.value = "";
      await loadExercises();
      await loadMake();
    });
  });
}

function loadFeatureRoute() {
  const route = window.location.hash.slice(1);
  if (route === "body") loadBody();
  if (route === "calories") loadCalories();
  if (route === "make") loadMake();
  if (route === "history") loadCalendar();
}
window.addEventListener("hashchange", loadFeatureRoute);
loadFeatureRoute();
