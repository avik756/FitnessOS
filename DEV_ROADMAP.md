# Suggested development roadmap

**Draft for Avik to edit · 30 October 2026.** This is a proposal, not a settled product plan. `AGENTS.md` remains the source of truth for current decisions. The working assumption for this draft is a small, local strength-logging experiment: record several sets with little effort, then find and trust them later.

## Starting point

The current app already saves one strength set at a time to SQLite, shows the latest 100 sets, fills the form from a previous set, and exports and restores JSON into an empty database. Its Python HTTP server is bound to this computer. The code lives in `backend/` and `frontend/`, with local records in `databases/`. The README still describes the earlier planning stage. Keep the existing save, export, and restore checks passing as the app grows.

## Suggested sequence for today

Finish each milestone as a usable slice: change the code, try the flow in a browser, run relevant automated checks, and inspect the diff before moving on. We can complete the first three and use the fourth if time and a phone are available. These are separate review points, not a promise to commit or push.

### 1. Make repeated sets easy to enter

**Status (30 October):** Implemented and checked with invented records in a local browser. Avik's own trial is still pending.

**Build:** After a successful save, show the set just saved near the form and offer a clear **Repeat values** action for the next set. Keep the chosen date, exercise, unit, and load convention visible. Let Avik change reps and load before every save. Preserve the form values and give a retry path when saving fails.

**Done when:** Three sets for one exercise can be recorded in a row without retyping the exercise or units; each save creates exactly one row; reload and server restart show all three; a failed save keeps the unsaved entries. A blank load remains distinct from `0`.

**Learn:** Trace `frontend/index.html` → `frontend/app.js` → `POST /api/sets` → `backend/app.py` → SQLite → history. Avik can explain when the browser has a draft and when the database has a record.

### 2. Make the next exercise quick to start

**Status (30 October):** Implemented and checked with invented records in a local browser. Avik's own trial is still pending.

**Build:** Show a short list of recently used exercises. Choosing one fills its name and the last recorded unit and load convention, with the last set's reps and load available to copy deliberately. Saving still requires an explicit tap. Keep the list usable with touch and a narrow screen.

**Done when:** A previously used exercise can be selected without typing its name, its suggested values are visibly editable, and selecting it alone creates no record. If history cannot load, manual entry still works.

**Learn:** Follow how the browser reads `GET /api/sets`, derives recent choices, and keeps a suggestion separate from a saved set.

### 3. Make history answer a useful question

**Build:** Add an exercise filter and a clear date order to saved history. Show the full load meaning (`kg` or `lb`, total or per hand), including unknown versus zero. Show how many records match. Keep the initial view easy to scan on a phone.

**Done when:** Avik can find the last sets for one exercise after a reload and tell which values were recorded. Filtering never changes stored records. Check the latest-100 limit against the intended use; if it hides needed history, add a server-side query before calling this done.

**Learn:** Compare filtering in JavaScript with querying SQLite, and explain why a partial result cannot support a claim about all past records.

### 4. Check recovery and the actual phone experience

**Build/check:** Export a backup with the new records, preview it against a separate empty database, restore it, and compare the records. Test narrow browser width. If a phone and a safe way to reach the local server are available, try entering and finding a set on that phone and note keyboard behavior, touch comfort, save feedback, and relaunch behavior.

**Done when:** The backup round trip preserves dates, exercises, reps, loads, units, and load conventions, and refuses to overwrite a database with records. Record what was actually checked on a phone. A desktop width check alone does not count as a real-device check.

**Learn:** Explain which database is authoritative today and why a disconnected phone browser cannot save to it.

## After today's slices

1. **Choose the first product trial from evidence.** Use the completed flow during several real workouts. Note time to first saved set, taps, corrections, confusing labels, failures, and whether past records were easy to find. Decide whether separate workout sessions and an explicit workout model are needed.
2. **Resolve offline and recovery.** Decide what must work without a connection, where a successful save lives, and how a replacement phone recovers data. Prototype the smallest storage and sync approach that can prove those answers before relying on it for meaningful personal records.
3. **Expand history carefully.** Add per-exercise comparisons or trends only after the underlying records and units support them. Label observations as logged performance, and explain any derived calculation.
4. **Add broader features only when the core flow is dependable.** Cardio, nutrition, reminders, voice entry, plans, wearables, and hosting remain possible later work.

## Edits to make before building

- Is a repeated strength-set flow the right first experiment for today?
- Which history question matters most: “What did I do last time?”, “What have I done for this exercise?”, or something else?
- Is a real phone available today, and what phone/browser would be used? Phone access to the local server needs an explicit approach.
- Which of milestones 1–3 should be cut or reordered if time is short?

Once Avik settles a product decision, record it in `AGENTS.md`. Keep this roadmap as a changeable plan, with completed and verified work labeled separately.
