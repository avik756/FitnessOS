# Changelog

## 2026-11-21 - First local phone/PWA increment

- Targeted Chrome on Avik's OnePlus 11R after approval of the PWA direction. Added `phone.ps1` with fictional demo records, optional private-LAN binding and exact Host/Origin validation; remote account setup is refused. Default localhost behavior remains.
- Fixed five phone tabs occupying four columns; Log opens Quick add, More includes sign-out, and phone styling adds larger inputs/controls, viewport-aware dialogs, safe-area spacing, bounded content and single-column presentation. Added per-block Move to... and prevented touch/pen rectangle selection on the legacy tree. Physical-device acceptance remains pending.
- Added manifest/icons, installation guidance and a service worker caching only a public reconnect notice and icons. No private pages/API/photo caching, automatic sync or closed-app reminder capability is implied.
- Added account-scoped IndexedDB drafts for core record forms and atomic SQLite request IDs for set retries, including concurrent/lost-response cases. Sign-out offers draft discard confirmation; set fields lock during submission. Other record types still require checking History before retrying an uncertain save.
- Verified 37 Python storage/handler checks, four JS behavior suites and syntax checks. Six existing HTTP tests remain blocked by WinError 10013; browser localhost timed out. No real-phone/install/hosted verification claimed. Selected free-tier Supabase; sign-in/provisioning and the full hosting migration remain outstanding. Vercel preview unchanged.

## 2026-11-21 - Phone experience execution plan

- Prioritized phone usability before further feature expansion at Avik's request. Added `markdowns/PHONE_EXPERIENCE_PLAN.md` with repository findings, mobile navigation/input/customization stages, local phone-access constraints, proposed hosted Python/auth/database work, installation, recoverable drafts, duplicate-save protection and measurable device checks. Distinguishes static Vercel preview from the functioning local app and accepted priority from proposed technical choices. Documentation only; no application changes, deployment or real-phone verification.

## 2026-11-21 - Hand-coded UX learning direction

- Recorded Avik's preference to implement chosen UX improvements himself and use AI to explain the current data flow and review his diffs. Added a current-app exercise and map of the distinct panel, page-block, legacy-section and navigation movement systems to `markdowns/LEARNING_PLAN.md`. Kept the sample Move to top task explicitly unimplemented; corrected the checklist's stale two-column-page item. Documentation only; no new interaction or browser verification is claimed.

## 2026-11-20 - Course-timeframe frontend direction

- Avik prefers polishing the existing JavaScript frontend for his course project over a whole-site React migration now. Focus subsequent work on the current app's usable workflows, responsive customization, reliable saves and hands-on browser/phone review. React is still a possible later experiment for an isolated screen. This is a direction decision; no application code was changed in this entry.

## 2026-11-20 - Drag-to-arrange Overview and panels

- Added Overview to the saved composable layouts: its two statistics, recent activity, Quick start, workspace section links and custom-page links can be reordered, collapsed, hidden/restored, displayed in one or two columns and set to half/full width in a two-column layout. Linked record panels can be added to Overview. Existing live nodes and handlers remain in place; the layout uses the same revision-checked SQLite save, undo and export as other tool pages.
- Panel grips now preview a before/after insertion line while dragging across a panel, with pointer dragging on touch/pen and move buttons for keyboard access. Custom page blocks preview before/inside/after positions, and can be dropped after another block or inside the middle of a section. Automated syntax and storage checks were run; real-browser and real-phone interaction review is still pending.

## 2026-11-20 - Fictional month-long test database

- Added a reproducible, isolated demo generator and `demo.ps1` launcher that sets `$testDb` to the ignored SQLite sample. Created 30 days of fictional workouts, meals, measurements and journal entries to review populated screens without using personal records. The generator refuses to replace an existing database. SQLite integrity, demo sign-in, session links and backup validation were checked; no browser walkthrough was claimed.

## 2026-11-20 - Steps 2–4 integration follow-up

- Added drag targets for nested custom-page blocks, with Shift to nest inside a section and existing cycle checks for invalid moves. Reduced unnecessary workspace revisions when Quick add opens an already visible panel; duplicating an input form no longer creates an empty layout save. Shared Journal views now exclude undone water entries; additional set views allow a saved exercise filter. Automated storage and JavaScript checks cover the updated behaviors; real-browser acceptance is still pending.

## 2026-11-20 - Feedback execution steps 2–4

- Added transactional revision checks, schema v2, serialized layout saves, conflict feedback, same-tab recovery/download, deliberate reapply and session undo. Older clients cannot bypass revision checks after migration. Sidebar order/density now export with the workspace; restores invalidate stale revisions.
- Made existing tool panels reorderable, collapsible and removable/restorable, with desktop drag, touch/keyboard movement and one/two columns. Added once-only starter pages, shared paginated record views, page/block removal and block duplication without deleting fitness data. Customization controls stay out of the normal reading layout.
- Moved set metadata/shortcuts into disclosure controls while keeping units visible; added a food dialog with Search/My foods/Manual modes, expandable nutrient details, journal section shortcuts, remembered history dates and dated repeat/add actions, and exercise-catalogue filtering.
- Preserved original live form nodes/handlers and entry routes. Updated the manual and checklist. Validation: 29 Python storage/request-handler tests, all JS syntax checks and three JS behavior suites pass. Six network HTTP tests are blocked by Windows socket permissions (WinError 10013); no browser/phone visual or timing claims are made.

## 2026-11-19 - Hosted identity and ownership plan

- Added `markdowns/HOSTING_AND_IDENTITY_PLAN.md` after Avik raised Google sign-in. Records the current single-account schema gap, proposed managed authentication, per-user access controls, session lifecycle, private-photo step-up, local-data migration and two-account isolation tests. No auth provider was provisioned or application code changed.

## 2026-11-19 - Feedback implementation, first increment

- Implemented a screenshot-informed dark shell with a lighter floating sidebar, compact top location trail, subdued cards/forms/Quick add, and quieter login copy. Added sidebar up/down order controls and Settings for theme, type and density. The navigation order and density use browser storage; theme and type retain the existing workspace save. Added local app-open reminders for time/day/message, quiet hours, pause/remove and supported preset/custom vibration, plus a compact Journal with one expanded editor at a time.
- Expanded shared exercise suggestions from 24 to 75 and removed the misleading Detailed nutrition horizon entry. Registered the new shell JavaScript with the Python static server. These changes do not complete the planned whole-site block/view migration, durable closed-app reminders, or body mesh. Visual and real-phone review remain pending; storage tests and JS checks passed, while six HTTP tests still hit WinError 10013 in this environment.

## 2026-11-19 - Screenshot reference added to frontend plan

- Analyzed Avik's supplied Notion screenshot in `markdowns/FRONTEND_FEEDBACK_EXECUTION_PLAN.md` and refined the trial dark surfaces, type hierarchy, compact top bar, optional cover and columns. Distinguished the screenshot's edge-aligned/sans navigation from his separate floating/serif preferences. Documentation only; no frontend changes were implemented or visually verified.

## 2026-11-19 - Hands-on feedback execution plan

- Recorded Avik's visual and whole-site customization feedback, Settings, navigation, exercise expansion, illustrative body model and configurable non-ML reminders in `markdowns/FRONTEND_FEEDBACK_EXECUTION_PLAN.md`. Clarified existing nutrition scope and queued removal of its misleading horizon label. Updated current direction in AGENTS.md; no application code changed or new features claimed as implemented.

## 2026-11-19 - Manual browser walkthrough

- Added `markdowns/MANUAL_TEST_GUIDE.md` with a disposable-database setup, screen map, exact page-canvas and existing fitness flow checks, expected persistence/recovery behavior, and a clear list of planned capabilities that are not yet testable. This is a manual for reviewing the current prototype, not evidence that browser, microphone, phone or backup checks have been performed.

## 2026-11-19 - Completion checklist

- Added `missing.md` as a living checklist for the remaining product work, verification, three feedback/implementation rounds, real-phone trial, recovery and release. Already implemented prototype capabilities are checked separately from unverified behavior; optional future ideas do not block the first dependable release.

## 2026-11-19 - First customizable page canvas

- **Implemented:** Custom pages and subpages with stable `#page/<id>` routes, breadcrumbs, Home/sidebar navigation and a mobile page picker. Pages contain ordered nested sections, notes, headings, dividers, links to existing tools, quick actions and a live recent-set block. Blocks can be checkbox/rectangle selected and moved within or between pages through a destination dialog or up/down controls.
- **Data/recovery:** The existing workspace JSON and backup now carry pages and blocks; the Python validator rejects missing parents, cycles, invalid types, cross-page child relationships and duplicate IDs. Older section links are used to seed pages without removing the original shortcuts.
- **Scope:** This increment does not yet implement versioned conflict detection, general linked record views, canvas drag/drop, text formatting, undo, or broader voice intents. Visual and real-phone interactions are still pending direct validation.

## 2026-11-19 - Frontend audit and master plan

- Added `markdowns/frontend_master_document.md` at Avik's request: current-source inventory, requirement/gap mapping, official Notion research, proposed nested pages and content blocks, JavaScript function contracts, persistence/migration dependencies, and staged implementation and acceptance checks. Proposals are distinguished from implemented and accepted behavior; application code was not changed.
- Audit verification: the voice parser and simulated set-save checks passed. Of 29 Python tests, 23 passed and six HTTP tests were blocked by local request socket permissions (`WinError 10013`). Browser app access timed out; visual, microphone, live food lookup and real-phone behavior were not verified in this audit.

## 2026-11-18 - Integration corrections after review

- Exercise catalogue now comes from the shared API and populates routine creation, entry suggestions, favourites and the exercise library. Built-ins carry zero recorded sets until logged.
- Set popup and normal logger share the same save completion event. Removed timer-based value restoration and function replacement. All submit buttons lock during writes, failed saves keep drafts, repeat entry retains values, and recent/history/quick-add paths open the editor. Last-entered values use insertion order and stale lookups cannot overwrite a replaced draft.
- Personal foods preserve nutrient data and portion logging scales it into meal snapshots. Database-selected portions can be saved to the personal library. Nutrient details appear in meal history and the daily journal, totals refresh after journal saves, and successful meal entry resets source/quantity state.
- Appearance loads before first paint on both login and app pages. Existing calendars, auth, graphs and controls use the selected theme. Nutrition navigation now opens the implemented screen. Restore reloads the workspace/preferences, and validation rejects unsupported layout values and malformed parent/step settings.
- Verification passed with 29 Python tests including HTTP integration, JavaScript syntax, voice parsing and save-handler regression scenarios. The in-app browser could not reach the local test server, so visual and microphone checks remain pending. Food lookup still requires USDA_API_KEY.


## 2026-11-18 - Workspace, exercise editor and nutrition implementation

- **Implemented:** Dark default styling, light mode, serif/sans/mono preferences, user-created nested section links, emoji and colour editing, collapse, sidebar links and breadcrumbs. Drag before another section to reorder, Shift-drag to nest, or select with checkboxes/rectangle and use Move selected. Layout changes persist through the Python workspace endpoint in SQLite.
- **Implemented:** Dedicated set editor reuses the original form and save endpoint. Exercise suggestions include 24 common gym movements. Last-entered sets are fetched per unit and load convention. Four load buttons use a configurable step, default 2.5, remembered per exercise/unit and included in workspace backups. Save set closes with a confirmation; Save & add another retains reviewed values. Voice drafts remain editable inside the same editor and preserve the workout association.
- **Implemented:** Calorie entries accept optional protein, carbohydrate, fat, fiber, sugar, saturated fat, sodium, calcium, iron, potassium and vitamins C/D. Values and source are stored with the entry. Daily totals show nutrient coverage and preserve unknown values for old calorie-only records. FoodData Central search and gram scaling require USDA_API_KEY on the server. Live lookup and coverage have not been verified here.
- **Recovery:** Backup v5 adds workspace/preferences and nutrient snapshots. Restore accepts v1-v5. New regression checks cover round trips, unknown values, invalid nutrients and invalid nesting.
- **Verification:** 23 storage/validation Python tests, JavaScript syntax checks and the voice parser checks pass. Five existing HTTP checks are blocked by WinError 10013 on localhost sockets. Browser interactions, microphone input and real-phone checks remain unverified.

## 2026-11-18 - Local workspace and logging direction

- Avik specified dark workspace styling, selectable and movable nested sections, emojis, a common exercise catalogue, a set-entry popup with adjustable load steps, and detailed nutrition. Planning precedes implementation.

This file records semi-important and larger product changes, architecture choices, and decisions. Each entry describes what changed and why when that reason is known. It is a concise project record; Git history remains the place to inspect detailed code changes.

## 2026-11-17 - Remaining localhost website direction

- **Decision:** Avik's immediate two-day website window is for a black-and-white, Notion-like UI/UX overhaul focused on fast entry through pop-ups, dropdowns and other interactions; completing voice entry; and connecting a food database. Phone operation and final polish follow this implementation window. Hosting the full app remains a later task.
- **Process:** Ship reviewable interface increments, enumerate every visible change (even small ones), let Avik test, and incorporate his specific feedback. Exact interaction details, full voice scope and food data source remain open.
- **Implemented first increment:** Converted the local interface's color styling to monochrome, simplified the workspace shell, and added a searchable Quick add dialog. It opens existing entry screens and focuses their input fields; it does not save inside the dialog. The existing voice draft and personal food library are unchanged in capability.
- **Verification:** JavaScript syntax and voice parser checks passed; 21 non-HTTP Python tests passed. Five HTTP tests could not bind their localhost sockets in this execution environment (WinError 10013). Avik's browser feedback on the new interactions is pending.

## 2026-11-17 - Static deployment preview

- **Decision:** Avik wants a page to open on Vercel now and the complete app hosted eventually.
- **Implemented:** A public, read-only preview page and Vercel static output configuration. It describes the local prototype but does not offer login, logging, or record storage.
- **Future work:** Hosting the working Python app requires a request-based server entry point, an appropriate origin policy, and persistent storage for accounts and records. The local SQLite file cannot serve as durable Vercel storage.

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
# 22 November 2026 — hosted phone preparation (not deployed)

Created a Mumbai free-tier Supabase project and applied owner-scoped PostgreSQL schema with forced RLS across 13 private tables. Prepared Python hosted transport and PostgreSQL adapter, private email-link sign-in limited to the approved email, and hosted UI copy; hosted photo routes and photo backups are denied until a secure unlock/storage flow exists. The active Vercel deployment remains the static preview because automated review rejected sending the new database login to Vercel. Ten hosted boundary tests and privileged rollback-only SQL checks pass; restricted-role, actual hosting and real phone acceptance are pending. The local SQLite app and its uncommitted work remain in place. See `markdowns/HOSTED_HANDOFF.md` for exact gates.

# 23 November 2026 - hosted database certificate setup

After Avik's restricted-role test reached the Supabase pooler but failed TLS certificate verification, changed the PostgreSQL adapter to require the project CA certificate at `backend/supabase-ca.crt` while retaining `verify-full`, and included that file in the candidate Vercel function bundle. Copied the dashboard-downloaded public Supabase Root 2021 CA certificate into the working tree and parsed it locally. Restricted-role and hosted deployment checks remain pending.

On the laptop, two restricted-role integration tests passed; a forged-owner insert in the third returned a generic operational error, likely because RLS permission denials were not mapped to SQLite integrity errors. Map only PostgreSQL `InsufficientPrivilege` to SQLite integrity error and check that neither account received the forged favorite. All three live tests need rerunning.

Avik reran the three restricted-role integration tests with the updated adapter; all passed. Hosted Vercel and phone acceptance remain pending.

