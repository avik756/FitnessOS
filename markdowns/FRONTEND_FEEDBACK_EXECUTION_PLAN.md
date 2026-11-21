# Frontend feedback: execution plan

19 November 2026. Planning only; no application changes in this pass. Read AGENTS.md first. This updates the earlier frontend master plan with Avik's first hands-on feedback. Specific visual values and interaction details below are proposals to try, not designs he has already accepted.

**Visual reference added by Avik:** a screenshot of his own Notion page, “The Avik Bhargava Project.” The observations below describe that image, not an exact Notion design specification. Its personal cover art and embedded video are Avik's page content; do not copy those assets into FitnessOS.

### What the reference actually shows

| In the screenshot | Design implication for FitnessOS |
| --- | --- |
| Sidebar is a slightly *lighter* charcoal than the nearly black page canvas, separated by a fine vertical edge | Make the sidebar distinct through subtle luminance, not a bright panel or thick outline; keep the content canvas quiet |
| A very narrow top bar carries the page icon/name and privacy state on the left, with small actions on the right | Use a stable, compact breadcrumb/action bar; the current location should remain legible without taking over the viewport |
| Search sits near the top; personal pages are grouped and the selected row has a soft rounded fill | Place search, Pages, tools and the active location in a clear hierarchy; let users reorder their pages and tool shortcuts |
| The page has optional full-width cover art, a large emoji, a prominent serif title and a short personal note | Offer an optional page cover, emoji and description. Save cover position and show an elegant text-only state when absent |
| Main content has generous side margins, thin dividers, and two balanced columns with links beside an embedded video | Offer a constrained reading width, optional columns and media blocks; stack columns in reading order on phones |
| Navigation labels and utility text are compact sans serif; the large title and personal note supply the literary character | Start with serif page titles/content and compact sans navigation. Treat serif navigation as a user-selectable trial, not something the screenshot demonstrates |
| The view contains several colours because of art, emojis, and the video, while interface chrome stays restrained | Let authored content and restrained accents add warmth; avoid scattering competing bright UI colours throughout forms |

The screenshot's sidebar reaches the window edges; Avik's **floating sidebar** request is a further design choice. Prototype both a subtly inset sidebar and an edge-aligned version with the same surface hierarchy, then compare them at desktop and phone sizes. The promotional banner and Notion's collaboration/privacy buttons are product-specific and do not belong in the FitnessOS shell by default. A cover on every short logging screen would add scrolling: reserve it for user-authored pages and allow a compact cover or no cover.

## 1. What changes in direction

Customization must cover the main working surface across the app, not just the Overview workspace panel. Aim for roughly 80% of ordinary screen content to be composable: summaries, record views, notes, charts, launchers and sections. The navigation shell, authentication, save confirmation and validation remain dependable shared controls. Moving a view must never move or delete its underlying records.

Avik wants a lighter floating sidebar against a darker content area, smaller potentially serif navigation text, sidebar reordering, an always-visible location trail, Settings, less visual noise and less unnecessary vertical scrolling. Login needs stronger composition and natural copy; a logo is undecided. Reminders and an illustrative body mesh are now requested work. ML is explicitly deferred.

## 2. Why the current interface feels flat

Source inspection shows fixed screens built from repeated cards/forms, alongside a separate small page editor. That gives customization little influence over the actual daily experience. Similar large headings, explanatory paragraphs and exposed fields compete for attention. Hardcoded pale surfaces remain in styles, including authentication and reminder components; Quick add needs a complete theme audit rather than another isolated colour override. This is a source-based diagnosis plus Avik's observations, not a measured visual comparison with live Notion.

Premium feel should come from consistent surface depth, restrained borders, typography, density, spacing and predictable interactions. Adding colours alone will not solve the layout. Build one coherent shell and carry its controls through every screen, modal, menu, empty state and error.

## 3. Visual foundation, login and Quick add

Proposed dark tokens to preview together against the supplied image: canvas #191919, sidebar #202020, top bar #1B1B1B, raised panel #242424, selected/hover #2C2C2C, primary text #EDECE9, secondary text #A4A4A4, subtle border #343434. These are *eyeballed starting points*, not pixel-sampled Notion values. Reserve muted sage, ochre, blue and rose for meaningful categories, charts and statuses; pair colour with labels/icons. Check contrast before accepting tokens and provide equally complete light tokens. The original greener proposal should not be treated as the chosen palette.

Use a consistent spacing scale, subtle elevation, modest radii and one clear page title. Start with small sans sidebar labels, serif titles, and readable 16px body text, reflecting the screenshot; trial serif navigation as an optional setting because Avik requested it. Preserve readable form labels and touch targets. Settings should allow serif/sans choices and comfortable/compact density. Never shrink touch targets merely to reduce visual density.

Login: replace the large promotional story and three-part slogan with a quieter composition, an understated product name, a single useful line such as “Pick up where you left off.”, and a focused sign-in form. Give the form visual depth through surface contrast and spacing. Preserve setup, returning-user, loading, error and Remember me states. Reserve no conspicuous empty logo box; revisit branding later.

Quick add: use shared popup tokens for its background, input, options, keyboard hint, focus, hover and empty results. One compact searchable action list; show only short supporting text where it clarifies an action. Preserve keyboard navigation, Escape, focus return, contextual defaults and all existing entry routes.

Files affected later: frontend/style.css, appearance.js, login.html, login.js, index.html and app.js. Consolidate competing overrides into semantic surface/text/control tokens before adding new components.

## 4. One workspace across the site

Convert Training, Nutrition, Journal, Body and History into starter pages using the same page/block system as user pages. Supply useful default arrangements and a recoverable Reset layout action. Existing tools stay reachable while migrated, but remove duplicate navigation once equivalent flows work. Keep Make's working forms largely intact initially; apply the shared shell and colours.

New block renderers should include workout launcher/active session, filtered sets, meal summary/list, body trend, journal summary, calendar/day detail, reminder list, optional image/cover and safe media embeds. A block stores layout and query configuration, not copied fitness records. A shared record cache invalidates after successful writes so every copy of a view refreshes. Paginate records and bound queries; do not fetch years of history for every block. Treat media embeds as optional page content, with privacy and loading behavior reviewed before implementation.

Provide contextual Add, Move, Duplicate and Remove view controls, nested sections, desktop drag targets and explicit keyboard/touch movement. Removing a view leaves the data intact. Add reversible removal and undo before making the whole surface editable. On desktop allow useful columns; phone layouts stack in a saved reading order. Layout editing should be deliberate, so normal scrolling or using a form does not start dragging.

Before broad migration, introduce schema versions, repeat-safe migration and a workspace revision. Save changes against an expected revision; conflicts preserve the draft and offer reload/reapply instead of overwriting another tab. Backups include page layouts, sidebar ordering and settings. Existing section shortcuts migrate to links without duplicating pages on each startup.

Proposed contracts (JavaScript browser, Python backend):

| Contract | Inputs | Output and method |
| --- | --- | --- |
| renderBlock(block, context) | Block type/configuration; selected day/session | DOM/controller using a shared renderer registry; clean up event subscriptions when removed |
| queryRecords(view, cursor) | Record kind, filters, sort, page size | Canonical rows plus next cursor; server validates filters and stable ordering |
| moveBlocks(ids, destination) | Selected roots, parent/page and insertion position | Validated layout; remove selected descendants from root list, prevent cycles, retain subtree order |
| saveWorkspace(expectedRevision, changes) | Current revision and validated edits | New revision or conflict; SQLite transaction compares revision before updating |
| buildBreadcrumbs(route, context) | Stable page ancestry and active editor/session | Ordered labelled links; resolve real parents, not arbitrary slash-separated text |

## 5. Floating sidebar and location trail

Inset the sidebar from the window with a subtle border and rounded container, lighter than the main canvas. Allow collapse and width adjustment within reasonable limits. Organize Pages and Tools with reorderable entries/groups, pin/hide controls and a visible Settings entry. Offer Move up/down alongside dragging. Hidden tools remain discoverable through search/Settings. Persist IDs and order, not labels as identifiers.

Put breadcrumbs in the shared top bar across tools, custom pages and editors: for example “My workspace / Training / Upper day / Log set / Bench press”. Each ancestor is actionable. The editor inherits its actual launching context; opening it from Quick add must not fabricate a workout parent. Preserve browser Back/Forward, direct links and return to the previous selected day/session. Long trails collapse the middle into a menu on phones. The set dialog can show its contextual trail directly above its title.

## 6. Settings is a real destination

Use sections/tabs with individual editors rather than one very long form:

| Area | Controls |
| --- | --- |
| Appearance | Dark/light/system, font, text size/density, restrained accent, sidebar width |
| Workspace | Navigation order/visibility, page defaults, layout reset with confirmation and recovery |
| Logging | Default units/convention and load increment; changing defaults never rewrites saved records |
| Reminders | Permission/status, quiet hours, timezone, vibration test and defaults |
| Body/profile | Measurements and optional avatar appearance; explain use of each field |
| Account/data | Remembered session information, sign-out, links to backup/restore and photo privacy controls |

Use save feedback, draft preservation and shared settings validation. Distinguish device-only choices (permissions) from exported account preferences. Do not imply login provides database encryption or cloud sync.

## 7. Screen changes and less scrolling

| Screen | Proposed change | Acceptance check |
| --- | --- | --- |
| Log a set | Exercise heading, small previous-set line, reps/load and four adjustment buttons as primary controls; date/unit/convention and voice in clearly labelled secondary controls | Common repeat set fits above the keyboard on the target phone; last-value semantics and explicit units remain clear |
| History | Calendar with adjacent day detail on desktop; day/list modes on phone; small filter bar and contextual record editor | Change day, inspect and repeat a set without traversing a long page or losing the date |
| Nutrition | Compact day totals, meal list and Add food action; Search / My foods / Manual inside one editor; macros first, micronutrients expandable | Log a familiar food quickly; unavailable values and coverage remain visible |
| Journal | Date header with summary links for water, sleep, steps and check-in; open only the selected editor; separate timeline tab | Daily overview fits in an ordinary desktop viewport; phone opens one focused editor without stacking every form |
| Body | Summary and measurement action, trend tab, optional lazy-loaded model tab/block | Measurements remain useful without downloading or rendering the mesh |
| Make | Retain current workflow and apply shared visual controls | Routines, days and sessions still connect correctly |

Minimize scrolling through progressive disclosure and focused views, not clipped content or many nested scrollbars. Long history and large text settings legitimately need scrolling. Track clicks as well as scroll distance so collapsing everything does not make common tasks slower.

## 8. Detailed nutrition: already implemented scope

The current nutrition.js and backend support calorie entries plus protein, carbohydrate, fat, fibre, sugar, saturated fat, sodium, calcium, iron, potassium, vitamin C and vitamin D. Macro values are grams; most minerals/vitamin C are milligrams; vitamin D is micrograms. Entries retain source information and nutrient snapshots, personal foods can store per-portion values, quantities scale those values, and daily totals report partial coverage. FoodData Central search is implemented but requires USDA_API_KEY in the Python server. Real-food coverage and live lookup quality still need evaluation.

This does not mean complete dietary analysis: no guaranteed coverage of every food/nutrient, no automatic intake targets, no deficiency diagnosis, no photo recognition and no ML nutrition advice. Missing nutrients must stay unknown.

The sidebar currently places a working #calories link labelled “Detailed nutrition” under “On the horizon”; a second duplicate appears in the feature directory. In the first implementation batch remove that horizon entry and consolidate into the normal Nutrition destination. This planning-only pass intentionally queues the HTML edit. Keep remaining nutrient UX/testing items open; they do not make the entire feature future work.

## 9. More exercises

Expand the shared catalogue from 24 to a proposed 70–100 reviewed common movements, covering bodyweight, dumbbell/barbell, cable, machine and unilateral variations. Add stable IDs, searchable aliases, equipment and movement tags, without fabricated logged history. Include examples such as push-up, dips, incline barbell press, goblet squat, split squat, lunges, assisted pull-up, seated calf raise, hip abduction, reverse fly, plank and hanging knee raise. Support timed movements deliberately: do not force plank seconds into a repetitions field. Initial catalogue expansion should only expose logging modes actually supported; stage duration logging separately.

Keep user-created names and existing logs valid. Aliases improve search, not silently merge different exercises. Use the same API/search selector for favourites, routines, recent entry and voice review. Test duplicates, renamed custom exercises and unit conventions.

## 10. Body mesh: an illustrative feature with explicit limits

Prototype a rotatable, stylized mesh driven by recorded height and available waist/chest/hip/limb measurements. Allow an optional appearance/base-shape choice alongside gender information; do not assume gender determines anatomy or use it as an automatic stand-in for missing measurements. Weight alone cannot determine body shape. Label the model “Illustration from your measurements”; show which inputs are missing. Do not infer body fat or promise an accurate scan.

Use a licensed base mesh with documented morph targets; select the rendering dependency after a small compatibility/performance spike. Proposed mapping: convert units, select the dated measurement snapshot, normalize measured differences against the base mesh, clamp supported morph weights and blend vertices. Height applies global scale; girth targets adjust relevant regions. Weight may inform a clearly labelled coarse illustration only after a defined mapping is reviewed; do not invent a precise scientific formula. Never alter saved measurements to fit the mesh.

Contract: buildBodyShape(measurements, appearance, modelVersion) returns morph weights, scale, missingInputs and illustration notes. Compare a few known synthetic measurements, test extreme values, lazy load the model, stop rendering while hidden, and provide a static fallback if graphics fail. Save input references and model version for reproducibility. No ML, diagnostic claims or generated progress predictions.

## 11. Customizable reminders without ML

Add a Reminders page plus reusable reminder-list block and Quick add action. Editor: message, one-time date/time or repeat weekdays, timezone, enabled state, optional related tool, quiet hours, snooze and vibration preference. Provide Off / Short / Double / Custom pattern with a Test button; custom patterns use bounded pulse/pause durations. Saved reminders persist through restart and export/restore. Keep the existing water interval reminder available until migrated, avoiding double delivery.

Proposed storage: reminder ID, message, local time/date, IANA timezone, repeat rule, enabled, quiet-hours policy, vibration pattern and revision; separate occurrence IDs and delivery/snooze status. nextOccurrence(rule, now) returns the next UTC instant using timezone-aware Python calculations. Define skipped/repeated daylight-saving time policy, travel behavior and quiet-hour deferral explicitly. claimOccurrence(reminderId, scheduledAt) atomically creates a unique occurrence so multiple tabs/workers do not deliver twice. Show missed reminders after restart without firing a backlog of alarms.

Delivery has two stages. Local prototype: persisted schedules, in-app alerts, optional permitted system notifications, snooze and supported vibration while the app is running. Reconcile on focus/wake because browser timers can be suspended. Clearly label this limitation. Closed-app delivery: secure hosted origin, service worker, push subscription and an always-running Python scheduler sending Web Push; requires hosting work and real-device tests. A service worker alone is not an exact alarm scheduler. OS/browser policies can still delay or suppress delivery.

Vibration is device/browser dependent. Unsupported devices should show a clear status and use visual notifications; never claim a saved pattern will be physically reproduced everywhere. Ask for notification permission only after the user enables delivery, and offer a private notification message mode. No ML scheduling or recommendations.

Technical references checked for feasibility: [MDN Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API), [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API), [Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API). Verify the actual target phone during implementation.

## 12. Execution sequence and review gates

1. **Visual shell:** tokens, floating sidebar presentation, shared breadcrumbs, Settings scaffold, login and Quick add. Correct nutrition horizon labels. Review the same set of screens in both themes before proceeding.
2. **Workspace reliability:** versioned saves, migration, sidebar ordering/preferences, undo/removal and backup round trips. Verify reload, stale tabs and failed requests preserve data/drafts.
3. **Whole-site composition:** shared renderers and starter pages; migrate Training first, then History, Nutrition, Journal and Body. Exercise every old entry point during each migration. Review whether the majority of working content is now actually movable and configurable.
4. **Entry and density:** compact set/food editors, journal summary links, date-preserving history and expanded shared exercise search. Measure a repeated workout/meal flow against the current implementation.
5. **Reminders:** local persistence and scheduling first; hosted closed-app delivery only when its infrastructure is ready. Test timezones, quiet hours, snooze, duplicate tabs, restart, denied permissions and supported/unsupported vibration.
6. **Mesh prototype:** asset/mapping/performance spike, illustrative preview and feedback before expanding deformation complexity.
7. **Feedback rounds:** first appearance/navigation; second real workout/meals/journal; third actual phone and reminders; implement and retest each round. Carry unresolved usability and data-loss issues forward rather than declaring completion by round count.

For each batch record every user-visible change, backend/JS checks, manual browser outcomes and unverified device behavior. Update MANUAL_TEST_GUIDE.md and missing.md only as work is implemented and reviewed. Do not mark this plan complete merely because these items are written down.


## Implementation status — 20 November 2026

Execution steps 2–4 now have a working implementation: revision-aware layout persistence/recovery, live composable panels and shared record views, plus focused entry flows. This does not mark their review gates complete. The main tools preserve their existing form controllers; reusable record views share a renderer with custom pages. Form duplication is deliberately replaced by shared entry points to avoid competing unsaved drafts. Optional media/covers and a complete arbitrary nested-form canvas remain outside this increment. See the steps 2–4 appendix in MANUAL_TEST_GUIDE.md for each control and failure check; browser/phone review and before/after timing measurements are pending.
