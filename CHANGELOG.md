# Changelog

This file records semi-important and larger product changes, architecture choices, and decisions. Each entry describes what changed and why when that reason is known. It is a concise project record; Git history remains the place to inspect detailed code changes.

## 2026-11-10 — Daily records and routine logging prototype

- **Implemented:** Saved workout days can start dated sessions. Their exercises open the existing set logger, and saved sets stay linked to the session. Finishing a session leaves its history readable. Avik asked for this without changing the set-entry controls.
- **Implemented:** A daily journal records water (with undo), sleep intervals and optional quality, daily step totals, and bloating, mood and energy check-ins. The day view puts these alongside dated sets, body records and meals. Water reminders are optional while the page remains open; they are not scheduled system notifications.
- **Implemented:** Optional meal times and a personal food library with named portions and user-entered calorie values. Logging a portion stores the calculated calorie total and description. This is not a licensed India food database or nutrient analysis.
- **Implemented:** Progress photos have user-defined categories and a calendar. The browser converts uploads to JPEG using canvas; the server checks the account password for a five-minute session unlock. It also requires a recent unlock before exporting a backup that contains photos. Photos are stored in local SQLite and exported as unencrypted JSON, so the login is an access gate, not storage encryption. The prototype library is limited to 20 MB. Fingerprint/WebAuthn access remains future work.
- **Implemented:** The progress view compares recorded loads and reps within one unit and load convention, and body trends use a labelled line and values. A typed command or browser speech recognition can prepare an editable set draft for review. Speech availability varies by browser and its provider may receive audio.
- **Planned:** `markdowns/ML_PLAN.md` outlines research, data quality, simple baselines, time-ordered evaluation and prospective checks for bloating, mood/energy, strength, weight, maintenance intake, hypertrophy and voice. No ML model was trained or released. Avik excluded faster set-entry controls and muscle highlighting from this increment.
- **Recovery:** Backup format v4 includes all new daily records, food definitions, workout sessions and photos. v1–v3 backups still restore. Restore still requires an empty records database; account credentials are omitted.
- **Verification:** Python storage and HTTP tests, JavaScript syntax and voice parser tests, and browser checks of daily persistence, routine-linked sets, food portions, photo lock/upload, and a browser-downloaded backup restored into a fresh test database. Desktop browser in a phone-sized viewport was checked; no real-phone test has been completed.

## 2026-11-09 — Current project snapshot

### Features in the local prototype

- Local account setup and sign-in, with an optional “Remember me” session lasting up to 30 days. The database stores a password hash; backups do not include account credentials.
- Overview and strength logging for sets, including activity date, exercise, reps, load, explicit kg/lb units, and total or per-hand load meaning. Recent exercises and favorites support repeat entry.
- Calendar history with daily details for strength sets, body entries, and calorie entries. The earlier filtered set history remains available.
- Body logs for weight, optional user-entered body-fat percentage, and waist, chest, hips, arm, and thigh measurements. Units are explicit. Trends show recorded values; BMI is calculated from weight and profile height. The optional Mifflin–St Jeor result is presented as a resting-energy estimate (BMR proxy), not a calorie prescription.
- Basic manual calorie logging with daily totals. The tracker does not infer unlogged food or calculate a nutrition target.
- A “Make” area to create custom exercises, workouts, named days (for example, “Chest Day 1”), and exercises within those days. A planned exercise can open the set logger.
- JSON backup and previewed restore, including sets, favorites, body and calorie entries, profile details, and workout templates. Restore is guarded against overwriting an existing records database. Older v1 and v2 set backups remain supported.
- Planned features that are not implemented continue to say “This feature is coming soon!”

### Decisions and reasons

- **Web app first; localhost for now.** Avik explicitly chose a browser app and asked to start locally. Hosting and a native app are not needed for this prototype.
- **Python backend, browser frontend, SQLite data.** Python remains an explicit backend requirement. SQLite and Python’s standard library keep the learning prototype small and avoid a separate database service; they do not settle the production stack.
- **Phone-friendly, low-friction logging and readable history.** These are the product’s core quality goals. Desktop responsive checks are useful, but a real-phone test remains outstanding.
- **Preserve units, activity dates, and unknown values.** Load meaning and body measurement units stay explicit; the date is the one the user experienced; blank/unknown remains distinct from zero. This supports understandable and trustworthy history.
- **Do not estimate body-fat percentage from BMI.** Body fat is user-entered because BMI is not a direct body-fat measurement. BMI is shown as a screening calculation, and the resting-energy formula is an estimate rather than a prescription.
- **Keep backup and recovery deliberate.** Personal records are local, credentials are excluded from export, restore previews its effect, and restore refuses to replace existing records. Privacy and dependable recovery are project priorities.
- **Treat workout/day definitions as reusable templates.** The current Make feature creates the routine structure and offers exercise shortcuts; recording a complete workout session from a template is future work.
- **Keep framework and broader scope open.** No frontend framework, hosting provider, offline storage model, or final first-release scope has been selected. Larger areas such as cardio, detailed nutrition, reminders, voice entry, and wearables remain future work.

### Verification and limits

- The current testing routine is in `markdowns/TESTING_ROUTINE.md`.
- Browser smoke checks covered body logging and estimates, routine creation, calorie logging, and calendar day details in a phone-sized viewport. A real-device test has not been completed.
- The app’s Python tests and JavaScript syntax checks passed during the feature work on 2026-11-05. This entry records that check at that time, not a claim about later code changes.
