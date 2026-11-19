# FitnessOS — the crossing-off list

**Started 19 November 2026.** This is the working checklist for getting the app from a local prototype to an app Avik can use and trust on his phone. Check a box only when the behavior works, survives a reload, and has been reviewed where the item calls for feedback. A feature existing in source code is not the same as being tested and accepted.

The project decisions in [AGENTS.md](AGENTS.md) take precedence. [The frontend master document](markdowns/frontend_master_document.md) explains the designs and implementation details behind many items here; [CHANGELOG.md](CHANGELOG.md) records what actually changed. Add or remove checklist items when the product scope changes. The **optional horizon** at the end does not block finishing the agreed app.

## 0. Decide what “complete” means

- [ ] Write down the first complete, useful workflow and its observable success criteria. Strength logging and history are the leading candidate, but the exact milestone has not been settled.
- [ ] Decide what must work without internet on the phone, and what “saved” means in that state.
- [ ] Choose the actual phone and browser for real-device testing.
- [ ] Decide the minimum privacy, export, and recovery standard before using this as the only copy of real records.
- [ ] Choose which of the prototype's broader tools belong in the first dependable release. Move excluded tools into a clearly labelled later list rather than leaving misleading empty screens.
- [ ] Decide what qualifies as **release complete**: the chosen journeys work on the phone, records survive relaunch, backup/restore is proven, and no known data-loss or blocking usability issue remains.

## 1. Preserve and verify the current foundation

Already built, though not all accepted or verified:

- [x] Local Python/SQLite backend and browser frontend exist.
- [x] Local account setup, sign-in, and Remember me are implemented.
- [x] Set logging, recent exercises, favourites, and a 75-exercise shared catalogue are implemented.
- [x] First feedback increment: darker canvas/lighter sidebar, navigation order controls, breadcrumb bar, Settings, compact Journal, and app-open reminders are present in the working tree. Browser acceptance is still open.
- [ ] Verify the new shell, Settings, Journal, enlarged catalogue and reminders in desktop and phone browsers; check both themes, direct URLs, Quick add, save/reload and existing flows.
- [ ] Persist reminder schedules and navigation preferences with the user's recoverable data, with multi-tab behavior and clear save feedback. Browser-local storage alone is not backed up.
- [ ] Implement reliable closed-app reminders if required: hosted scheduler and push, permission handling and actual phone support.
- [ ] Finish user-configurable reminder patterns, quiet hours and snooze across supported browsers; measure delivery when the app is suspended.
- [x] Saved routines/days, workout sessions, calendar history, body logs, calorie logs, personal foods, daily journal, progress photos, and guarded JSON backup/restore are implemented as prototype flows.
- [x] Dark/light theme, basic font choices, existing section links, set-entry dialog and adjustable load buttons are implemented.
- [x] Initial custom pages, subpages, nested blocks, selection, movement controls and recent-set block are implemented in the working tree.
- [ ] Open the current app in a browser and walk through **every** existing screen; log broken, confusing or inconsistent interactions.
- [ ] Run all backend tests and frontend syntax/behavior checks in an environment where the HTTP tests can connect. Investigate any genuine failures; the last run here could not complete six HTTP tests because of `WinError 10013`.
- [ ] Verify every script and dynamic screen loads successfully after login, including the newer page canvas and nutrition screens.
- [ ] Test sign-in, remembered return, expired session, sign-out, and drafts during session expiry.
- [ ] Test one complete set, routine session, meal, body entry, daily entry, and photo flow in a disposable database; reload and confirm each record survives.
- [ ] Test export, preview, and restore into a separate empty database, then compare all data types and workspace settings. Do not use meaningful personal records as test fixtures.

## 2. Make the workspace genuinely customizable

**Navigation and page identity**

- [ ] Test page creation, renaming, icons, subpages, direct URLs, Back/Forward, reload, breadcrumbs, sidebar and phone page picker together.
- [ ] Consolidate old section shortcuts and new pages into a clear Pages / Tools navigation. Preserve access to every existing tool during the transition.
- [ ] Add useful page search, pinned/recent pages, and a reliable way back to an active workout or selected day.
- [ ] Make page hierarchy legible on a narrow phone, including deeply nested pages and long names.
- [ ] Finish consistent page typography, width options, emoji handling, colours, empty states, focus and selected states across dark and light themes.

**Content blocks**

- [ ] Test note, heading, divider, nested section, tool link, quick action, and recent-set blocks after save, reload, and restore.
- [ ] Make adding/editing blocks fast: contextual insert menu, clear block-type controls, and comfortable editing of longer notes.
- [ ] Make movement predictable: visible before/inside/after drop targets on desktop, plus explicit Move to, Move up and Move down controls that work on touch and keyboard.
- [ ] Verify selecting a parent and child moves the subtree exactly once; reject moves into descendants and preserve the order of multiple selected blocks.
- [ ] Refine region selection on the page canvas so ordinary clicks, text selection, scrolling and touch gestures are unaffected.
- [ ] Support moving a block between pages without changing its underlying fitness records; verify page ancestry and child blocks after reload.
- [ ] Add duplicate layout, reversible removal, and layout undo. Decide whether persistent trash and a retention period are required.
- [ ] Decide whether two-column pages would improve real use. If added, stack them in a stable order on the phone.
- [ ] Decide if richer inline text formatting is useful after testing plain notes and headings; avoid letting an editor rewrite structured fitness data as prose.

**Persistence and recovery**

- [ ] Replace whole-workspace last-write-wins behavior with a revision-aware save contract so two open tabs cannot silently overwrite one another.
- [ ] Show Saving, Saved, Failed and uncertain outcomes accurately; provide retry while keeping the unsaved layout in view.
- [ ] Make rapid edits, interrupted saves, reloads and two-tab conflicts recoverable.
- [ ] Version the page/block schema and make migration from legacy section links repeat-safe and testable.
- [ ] Include the new layout and preferences in backup validation, export and restore; verify older backup versions still work.
- [ ] Keep removing a page or view separate from deleting the actual workout, nutrition, body or journal records.

## 3. Make daily fitness entry feel finished

**Strength and sessions**

- [ ] Test every set-editor entry point: Quick add, recent, favourite, exercise library, routine session, history repeat, page action, and voice draft. Each must create **one** correctly dated set and refresh relevant views.
- [ ] Check last-entered values for the selected exercise, kg/lb, and per-hand/total convention while changing exercise or typing quickly.
- [ ] Test the four load adjustments with the user-set step (default 2.5 kg), including blank/zero loads, fractional steps, unit changes, and invalid steps.
- [ ] Check Save, Save & add another, cancel, failed save and uncertain save; keep the draft when the server has not confirmed it.
- [ ] Make routine sessions easy to resume; preserve the session association and refuse linked sets after finishing a session.
- [ ] Evaluate earlier set-field ideas within the workout flow: warm-up, subjective reps from failure, timed/editable rest, and the choice to confirm each set or a whole prefilled workout. Implement only the accepted behavior with explicit units and labels.
- [ ] Measure taps, time and corrections during repeated workouts; improve the slowest step.

**Nutrition and daily journal**

- [ ] Try FoodData Central with foods Avik actually eats. Record missing items, poor matches, confusing serving units, and any API-key/unavailable states.
- [ ] Make the common meal flow compact: search / personal foods / manual, visible food source and quantity, calories/macros first, optional micronutrients on expansion.
- [ ] Verify gram and personal-portion scaling against a label for 50 g, 100 g, 250 g and fractional portions.
- [ ] Preserve unknown nutrients as unknown; label daily totals as partial when some entries lack a value.
- [ ] Check a saved food, its logged meal snapshot, daily totals, history and journal all agree. Editing a food definition must not rewrite older logged meals.
- [ ] Verify water, sleep across midnight, steps including zero, and mood/energy/bloating including blank-versus-zero states.
- [ ] Decide which daily data belongs on Home and which belongs in a customizable page view, keeping ordinary entry short.

**Voice**

- [ ] Test the current typed strength command and actual microphone on the chosen phone/browser; distinguish unavailable, denied, listening, transcript, parser error and corrected draft states.
- [ ] Handle speech without punctuation, number words, exercise names, omitted units/conventions and uncertain recognition without silently saving or inventing a value.
- [ ] Give the voice draft an easy review screen with editable fields and small adjustment controls; save only after explicit confirmation.
- [ ] Decide the next voice intents (for example water, body weight or a known food) and add them one at a time with realistic utterance checks.

## 4. Make history useful and honest

- [ ] Turn sets, meals, body entries and journal events into reusable views that read canonical records instead of copying them into page layouts.
- [ ] Add useful filters, sorts and presentation choices to views; keep the same record consistent on all pages and fixed screens.
- [ ] Verify calendar navigation and the selected day's details across sets, body, meals and daily journal.
- [ ] Make exercise trends keep units and load conventions separate; show the underlying recorded values and distinguish entry spacing from elapsed time.
- [ ] Make charts readable in both themes and on phones, with tables or text values available alongside them.
- [ ] Review earlier proposed best-set and estimated-one-rep-max views. If implemented, show the calculation and limitations instead of presenting a prediction as fact.
- [ ] Add pagination or bounded queries before years of records make repeated page blocks slow.

## 5. Feedback and polish rounds

For **each** round, record the date, device, what Avik tried, specific friction, resulting changes and what was retested. List every user-visible visual or interaction change after each implementation set.

- [ ] **Round 1 — workspace structure:** Avik tries pages, nested blocks, moving content, sidebar, dark/light mode and a real set-history view. Capture what feels unlike the intended Notion-like experience.
- [ ] Implement Round 1 feedback and retest the affected flows, including save and restore.
- [ ] **Round 2 — speed of entry:** Avik logs a workout and meals using popups, recent values, load buttons, Quick add and voice review. Count taps and corrections.
- [ ] Implement Round 2 feedback and retest all alternate paths into the same editors.
- [ ] **Round 3 — phone reality:** Avik uses the chosen real phone through keyboard opening, scrolling, rotation, app relaunch, slow/failed connection, and history lookup.
- [ ] Implement Round 3 feedback and retest the actual device, not only desktop responsive mode.
- [ ] **Final polish round:** Check copy, visual density, typography, animation, empty/error states, touch targets, accessibility and anything that still feels tedious.
- [ ] Leave room for another feedback/implementation round if a blocking issue appears; do not declare completion simply because three rounds happened.

## 6. Phone, data safety and release

- [ ] Decide whether the first phone experience is browser-only, installable web app, or later wrapper based on a tested need.
- [ ] Make a reachable, protected test environment for the phone. The current localhost server binds to `127.0.0.1` on the computer.
- [ ] Test touch targets, decimal/date keyboards, editor height above the keyboard, safe-area spacing, scroll behavior, and long labels on the real phone.
- [ ] Test reload, browser close, phone relaunch, interrupted request, and session expiry; confirm saved records and recoverable drafts behave as promised.
- [ ] Decide the offline entry requirement. If required, implement durable local writes, a sync queue, conflict handling and distinct **saved on this device** / **synced or backed up** states. A service worker alone does not satisfy this.
- [ ] Prove backup and restore after a simulated lost/replacement device; confirm photos and their unlock rules, workout links, layout and nutrients return correctly.
- [ ] Verify photo access expires and relocks across every view, including duplicated or embedded blocks. Keep password and personal data out of logs/source control.
- [ ] Make the full working app available online only after choosing a durable hosted database and Python request entry point; the current Vercel page is a static preview.
- [ ] Verify hosted authentication, private records, upload/export, failure recovery and running costs before relying on the hosted app.
- [ ] Run the complete automated suite and manual browser/phone checklist on the release candidate; investigate unresolved failures.
- [ ] Complete a five-workout trial: record first-save time, taps, corrections, confusing labels, failures, history access, restart and restore.
- [ ] Fix all data-loss, incorrect-save, inaccessible-history and blocking phone issues found in the trial.
- [ ] Review the release checklist together, choose the actual product name if desired, and mark the agreed version complete.

## Optional horizon — decide separately

These are ideas from earlier discussions, not automatic conditions for completing the first dependable app.

- [ ] Decide whether cardio and sports logging belongs in a later release; define manual duration/distance before adding GPS or wearables.
- [ ] Explore rest-time reminders or on-screen workout guidance after the basic timer is useful and the claims can be supported.
- [ ] Explore opt-in reminders that work while the app is closed, with quiet hours and a clear off switch.
- [ ] Explore a recovery window for deletions and older backup versions.
- [ ] Explore gamification that makes recorded progress satisfying without obscuring actual data.
- [ ] Evaluate any ML insight with a defined target, baseline, data quality check and prospective test before displaying it as guidance.
- [ ] Explore wearables, richer research-based planning, and deeper platform integration only when a tested workflow needs them.

## Crossing-off rule

When an item is done, change `[ ]` to `[x]` and add a brief note or link to the relevant test, feedback, or changelog entry if the result is not obvious. If work reveals a new dependency, add a checkbox near the affected item. Keep “implemented,” “verified,” and “accepted by Avik” distinct.
