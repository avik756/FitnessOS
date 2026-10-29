# Fitness app project: current source of truth

**Updated: 23 October 2026.** This file is the **most important repository document at all times** for this project. Read it before planning, coding, or interpreting another Markdown file. `README.md`, `NEW_PROJECT_CONTEXT.md`, `DISCOVERY_QUESTIONNAIRE.md`, `followups.md`, `LEARNING_PLAN.md`, and `GIT_GITHUB_CRASH_COURSE.md` preserve earlier thinking or teach specific skills; any statement in them may have been changed by a later decision recorded here. Do not treat an older proposal, answer, or technical choice as current merely because it appears in one of those files.

This precedence applies **among repository documents**. A newer direct instruction from Avik overrides this file. When Avik changes a project decision, update this file so the next session has the new source of truth. Keep settled decisions, current preferences, experiments, and unresolved questions distinct. Do not silently convert an idea into a requirement.

## What is settled now

- **Build a web app first.** This is Avik's explicit, preferred implementation direction. Make the browser experience work exceptionally well on a phone. A native wrapper or phone app may be considered later if a tested requirement calls for it.
- **The product is a personal fitness app.** Its purpose is to make recording activity easy and to make past records and progress useful to review. “FitnessOS” is a working name, not a final product name.
- **Low-friction logging and readable history are central.** The app should not make ordinary use tedious. A good phone interaction matters more than implementing a large feature list early.
- **AI may help build it, but Avik wants to understand the code.** Explain the data flow and changed files, let him inspect diffs, and make increments he can reproduce and describe. For learning tasks, start with explicit examples and commands, then ask him to perform similar steps independently.
- **A Python data/backend layer remains an earlier explicit requirement.** Choosing a web app first does not imply that the browser UI itself can be written entirely in Python. Use normal web technologies in the browser as needed. If a proposed architecture would remove Python from the backend, raise that choice with Avik rather than assuming the requirement disappeared.
- **The current build only needs to run on localhost.** Avik explicitly asked to start building now; hosting is not required for this increment.

## Current project state

As of 23 October 2026, `C:\FitnessOS` contains planning and learning documents plus a **local strength-set logger** (`app.py`, `static/`, `RUN_APP.md`). It saves sets to SQLite, shows history, reuses previous values, and supports JSON export and guarded restore into an empty database. It uses Python's standard library for this build; this does not settle the first product milestone, final framework, offline storage model, or hosting. The local Git branch is `main`; the GitHub remote is `git@github.com:avik756/FitnessOS.git`. Avik has made an initial commit and a second practice commit and pushed them successfully from Ubuntu WSL. Git/GitHub connection is therefore achieved; do not keep describing it as an unresolved setup blocker. Verify the current Git state before reporting it later, because this paragraph is dated.

The Friday coding-cafe check-in with Raghav was expected to discuss GitHub progress, blockers, and next focus. The honest status at this point is planning plus a working GitHub workflow. This meeting context is dated and does not set the product roadmap.

## Product direction and quality bar

These are the current design principles to preserve while choosing a first build:

- Start with one small, complete workflow and test it end to end before expanding breadth. **The exact first milestone is not yet chosen.** Avik explicitly did not want the README to claim one prematurely.
- Strength-workout logging and history are the strongest candidate for a first experiment. Earlier notes accepted a strength-only first release, but the new web-first project should confirm its exact scope before treating the old V1 outline as binding.
- Make saving unambiguous. A visible value is not necessarily persisted. Confirm a successful save only after storage succeeds, preserve a draft after failure, and check that records survive reloads and restarts.
- Privacy, dependable recovery, and costs close to zero matter. Do not encourage storing meaningful personal records until export and recovery have been tested. Keep personal measurements, notes, credentials, and backup secrets out of source control and diagnostic logs.
- Preserve explicit units and load conventions, the activity date the user experienced, and the difference between unknown and zero. Avoid silently changing or deleting records. A restore should preview its effect and must not replace data with an empty state after failure.
- Show observations honestly. A change in logged performance is not proof of physiological improvement. Do not present precise strength predictions, medical or training prescriptions, or research claims without a defined and tested basis.
- Define what “great on a phone” means in observable terms: comfortable touch input, keyboard behavior, responsiveness, save feedback, relaunch behavior, and access to history. Test on a real phone when possible; desktop responsive mode alone is insufficient.
- Offline usefulness is a strong earlier preference, but its exact requirement and storage model are unresolved. A Python server with SQLite cannot by itself save from a disconnected phone browser. If offline entry is required, evaluate browser-local storage and later sync/recovery deliberately.

## Earlier preferences to revisit, not an automatic feature checklist

The discovery and follow-up documents contain many thoughtful answers. They are useful evidence of intent, but some were made before the web-first restart. Reconfirm them when their workflow enters scope:

- Strength entry ideas: exercise, sets, reps, load, explicit kg/lb and per-hand/total conventions; optional warm-up distinction; rest timed by default but editable; subjective reps-in-reserve where zero means failure.
- Speed ideas: favorites, recent exercises, and reusable workouts; adding a prefilled exercise with one tap; a whole workout in roughly seven taps was an aspiration for repeated routines, not a measured acceptance criterion. Set-by-set versus whole-workout confirmation was proposed as a setting.
- History ideas: per-exercise trends, best recorded sets, and an estimated one-rep maximum only with its calculation and uncertainty explained. A week-long deletion recovery period was previously desired.
- Recovery ideas: “saved on this phone” and “backed up” should be distinct states; restoring a replacement phone mattered more than simultaneous editing on many devices. A Google account was acceptable for backup if the privacy model was clear, but no provider or encryption scheme was chosen.
- Evaluation idea: try the early build during five real workouts and note entry time, taps, corrections, confusing labels, save failures, and whether saved history is accessible. Include restart, offline, and restore checks before trusting it.
- Broader vision: cardio and sports, meals and nutrients, reminders, voice entry, workout plans, body measurements, photos, wearables, gamification, and research-based insights. These remain possible later work. Do not let them expand the first experiment by default.

## Technology and study direction

- The immediate learning path is Git/GitHub practice, then HTML/CSS/JavaScript browser basics, SQL using SQLite, a small Python-backed web exercise, and phone/offline testing. See `LEARNING_PLAN.md` for exercises; this file governs the direction if the plan becomes stale.
- **SQL is a language; SQLite is the recommended first database engine for learning and a small prototype.** Python's `sqlite3` module makes it accessible without setting up a separate database server. SQLite is not yet the chosen final storage architecture. Browser storage, a hosted database, and backup/sync remain separate decisions.
- A Python virtual environment (`venv`) becomes useful when installing Python packages. A `.env` file is machine-specific configuration, often including secrets; Docker packages a broader runtime. None is required merely to commit or push to GitHub.
- No specific framework, PWA design, frontend library, cloud provider, Docker setup, or deployment target is locked. FastAPI is one possible Python web framework, not a decision. Learn and add tools when a concrete experiment needs them.
- Avik may finish a current Kivy tutorial for general learning. Kivy screens, Buildozer, BeeWare, and Android packaging are **not prerequisites** for the chosen web-app-first path. Earlier Kivy-heavy study material is historical.

## Working rules for this repository

- Inspect files and `git status` before editing. Preserve Avik's own writing, especially the README, unless asked to revise it. Describe proposed, implemented, and verified work accurately.
- Keep changes small and reviewable. Explain how to run or test code and what a failure would look like. Ask Avik to explain or adjust one part when the work is intended as a learning exercise.
- A Git commit captures a snapshot of the README at that point. The README may be rewritten as the project changes; it is not an append-only diary. Do not describe an unmade commit as already existing.
- `git add .` is a reasonable choice **when Avik intends to include every non-ignored file**. A README description of a file is not a privacy filter. Review staged content before pushing, especially if the repository is public.
- `git restore <path>` discards unstaged edits by replacing them with the staged version. Bash expands `*` into filenames before Git sees it, and `*` normally omits dotfiles. Earlier, `git restore *` discarded unstaged edits in three Markdown files; they were reconstructed. Never use broad restore/reset/clean operations casually.
- For Git practice, let Avik perform the commands himself unless he asks for execution. Do not silently commit, push, or publish work on his behalf.

## Open decisions

1. What exact first end-to-end workflow should be built, and what observable result makes it useful?
2. What must work offline on the phone, and where is a successful save authoritative?
3. Which small Python web approach best supports the first workflow without premature infrastructure?
4. What are the minimum privacy, export, and recovery steps before using the app for real records?
5. What phone and browser should be used for real-device checks?

Resolve these with the smallest useful experiment and Avik's current answers. Update this file when an answer becomes settled; retain old documents as background rather than rewriting history.
