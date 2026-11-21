# FitnessOS phone experience: execution plan

21 November 2026. Status: first local increment implemented; see `PHONE_TEST_GUIDE.md` for verified checks and remaining acceptance work. Avik approved PWA implementation, Chrome on OnePlus 11R, and a new free-tier Supabase project. Hosted migration and real-device verification remain pending. AGENTS.md remains authoritative. The stages below retain the intended completion criteria; they are not all complete.

## Direction and scope

Avik wants phone usability prioritized before further feature expansion. Keep the existing JavaScript/browser frontend and Python backend. Recommend an installable progressive web app (PWA), not a framework migration or native rewrite. Retain the desktop experience and existing features. Installation, responsive interactions, hosted persistence, and offline behavior are separate deliverables.

Recommended first acceptance workflow: open on phone -> sign in -> choose a recent exercise -> log and repeat sets -> inspect History -> close/reopen -> confirm saved records. This is the phone milestone proposed here, not a declaration of the final product's first-release scope. Body, nutrition, journal, custom pages, workouts, settings, backup and photos also need a mobile regression pass.

Primary target: Chrome on OnePlus 11R. New free-tier Supabase project selected. Laptop-independent HTTPS hosting remains the release goal; USB/local testing is an intermediate route. Do not claim real-device checks without the actual device. Supabase sign-in is currently required to provision the project.

## Source audit and constraints

- `vercel.json` deploys `public/`. The functioning app is `frontend/` plus `backend/`; changing preview CSS will not improve the functioning app. Live URL retrieval was unsuccessful during planning, so deployment state is inferred from repository configuration, not verified remotely.
- `backend/app.py` binds to 127.0.0.1. `valid_host()` permits only localhost/127.0.0.1 and mutation Origin checks assume HTTP. Merely using the laptop IP on a phone will fail. Preserve these protections while making deployment-specific origins configurable.
- `frontend/index.html` already includes viewport metadata and mobile navigation. `style.css` has multiple mobile breakpoints, collapsed columns and dialog sizing. Audit the cascade before adding further overrides.
- Hash navigation and route listeners span `app.js`, `features.js`, `journal.js`, `workspace.js` and `workspace_pages.js`. Avoid creating a second router or duplicate modal-open behavior.
- Panel touch handling exists in `screen_layouts.js`; page blocks and legacy sections use different movement systems. Phone behavior must cover all three, rather than assuming panel support fixes everything.
- Workspace writes already use revisions, a queue, undo and sessionStorage recovery. This is not durable offline record sync. Existing form failure handling is not sufficient protection against a mobile tab being killed.
- No manifest or service worker is present in the inspected frontend. Backend static-file allowlists must serve any added assets.
- The database is single-account SQLite. Hosted Google identity, per-user ownership and private photos require the work in `HOSTING_AND_IDENTITY_PLAN.md`; a login button does not supply isolation.
- The working tree contains substantial existing edits and new files. Preserve them. No commit, push or deployment is implied by this planning request.

## Implementation order

Each stage should end with a reviewable diff, a list of visible changes, checks run and remaining limitations. Stages 1-3 can proceed locally before cloud credentials are available. Prepare hosted code during that work; do not let provisioning block mobile UX progress.

### 1. Establish a reproducible phone test environment

Files: `backend/app.py`, `demo.ps1`, `markdowns/TESTING_ROUTINE.md`, new phone-test instructions if needed.

1. Record baseline Git status, current API/static routes and failing/passing checks. Use the fictional database only. Check export/restore in a separate disposable database.
2. Add explicit development bind/allowed-host/allowed-origin configuration while retaining localhost defaults. Validate exact origins and ports; never solve access by permitting every Host or Origin. Keep public proxy handling distinct from local development.
3. Provide one documented PowerShell launch command and the phone URL. Local LAN HTTP is only a preliminary layout/input test, needs the laptop awake and may be blocked by campus Wi-Fi isolation or firewall policy.
4. For install, microphone and secure-context checks use a private HTTPS test environment. An authenticated tunnel is a temporary alternative if already available; exposing the local setup endpoint or publicly sharing demo credentials is not acceptable. Do not make router/firewall changes automatically.

Acceptance: a phone can reach the actual app and log a fictional set that appears in laptop History. Rejected hosts/origins still fail. If networking is blocked, record the blocker and continue emulator/local work; do not mark phone access verified.

### 2. Make the phone shell and entry workflows comfortable

Files: `frontend/index.html`, `login.html`, `style.css`, `app.js`, `shell.js`, `workspace.js`, `entry_experience.js`, `features.js`, `journal.js`, `nutrition.js` as needed.

- Start with five bottom actions: Home, Log, History, Pages, More. Log opens the existing quick-entry chooser; More exposes all remaining tools, Settings and sign-out. Validate this proposal on the device before treating it as settled navigation.
- Preserve page URLs, current location and back navigation. Back closes an open overlay before leaving its underlying screen; navigation must not silently discard a draft. Restore focus when closing dialogs and retain selected history date.
- Use single-column content at phone widths, compact titles, readable record rows and restrained spacing. Keep literary type for headings if selected; labels and numbers must remain legible. Shared desktop layout order remains authoritative; phone stacking must not write over desktop column preferences.
- Aim for 44-48 CSS-pixel primary touch controls. Ensure calendar cells fit the actual screen. No page-wide horizontal scroll at 320/360/390/430 CSS pixels; any unavoidable data-region scrolling must be bounded and labelled.
- Account for safe-area insets, browser chrome and the software keyboard. Use dynamic viewport sizing with fallbacks; focused fields and Save must remain reachable without fixed navigation covering them. Do not disable pinch zoom. Use at least 16px form text and appropriate numeric/decimal keyboards.
- Adapt the existing set/food editors to a full-width phone sheet or near-full-screen dialog; keep units, load convention and last values visible. Preserve the four load adjustment buttons and user increment. Make repeated logging efficient without bypassing explicit saving.
- Keep advanced fields behind disclosures. Voice remains optional with typed fallback. Do not promise voice support or background reminders across browsers.

Acceptance: complete a ten-set fictional workout one-handed, correct a value, navigate back and inspect History. Repeat with keyboard open, landscape, 200% text/zoom where applicable, and long exercise/page names. No hidden action, accidental submission or lost draft. Smoke-test every existing route and desktop widths as well.

### 3. Make customization safe on touch

Files: `screen_layouts.js`, `workspace_pages.js`, `workspace.js`, `workspace_store.js`, `style.css`.

- Normal mode prioritizes scrolling and entry; explicit Customize mode exposes grips and editing controls. Do not require desktop rectangle selection or Shift-to-nest on phones.
- Provide Move up/down and Move into/out of section as dependable alternatives. Keep selection and hierarchy visible. Dragging is an enhancement: visible destination, edge scrolling if feasible, clean cancellation, and no page scrolling suppressed outside the grip.
- Test pointer cancellation, lifting outside a target, nested sections and collapsed panels. A cancelled gesture must not commit a move.
- Preserve revision conflicts, undo, restore-hidden controls and recovery. Phone and laptop use the same saved workspace, with responsive presentation only.

Acceptance: reorder an Overview panel, restore a hidden panel, move a custom block into/out of a section, undo, reload, and reproduce a two-tab revision conflict without losing either draft. Ordinary touch scrolling must never rearrange content.

### 4. Host the functioning app with durable account data

Recommended default for the later execution request: Vercel browser assets + Python request handlers + Supabase managed PostgreSQL/Auth, initially restricted to Avik's approved identity. This is still a proposal, not a provisioned or selected provider. Inspect existing connected projects before requesting missing setup details. Verify current quotas, costs and runtime compatibility before provisioning; no paid resources are assumed.

Follow `HOSTING_AND_IDENTITY_PLAN.md` for the full contracts. Required work:

1. Separate Python HTTP transport from domain/storage operations, preserve local SQLite mode and introduce tested PostgreSQL migrations. Do not copy SQLite into a function's temporary filesystem as persistent storage.
2. Implement Google authentication, server-validated sessions, exact callback URLs, CSRF protection, secure cookies, renewal/logout and account-scoped drafts. Refuse public first-visitor setup.
3. Add ownership to all records and relationships, queries, layouts, exports and restores. Verify RLS with the actual database role/token path; a privileged server key can bypass it.
4. Establish a same-origin `/api` boundary and serve the real frontend. Keep secrets server-side; update misleading localhost-only storage copy. Preserve the static preview until a separate hosted test deployment passes.
5. Implement private photo storage and an appropriate recent-authentication unlock for Google users. If that cannot be completed in the first hosted slice, explicitly disable hosted photo routes/UI and photo-inclusive exports while retaining local support; do not silently expose them.
6. Import only an explicitly selected backup, preview effects, preserve IDs/relations transactionally, and retain the original. Start with fictional data. Verify export/restore before personal records.

Acceptance: laptop off, phone on mobile data, sign in, create/reload records, redeploy/restart and confirm persistence. Two test identities must not read, change, export, restore or link each other's data. Test expired sessions, forged owner IDs and failed restores. No insecure route may remain reachable just because its UI is hidden.

This is the largest infrastructure stage, not a CSS task. A separately hosted Python service with durable SQLite storage is an alternative if Avik prioritizes minimal migration and accepts its operations/costs; do not implement both architectures or switch away from Python silently.

### 5. Add installation and dependable interrupted-use behavior

Files: proposed `frontend/manifest.webmanifest`, icons, `sw.js`, `pwa.js`, `draft_store.js`; backend static routes and record endpoints; existing save handlers.

- Add manifest name, stable app identity, start URL, scope, standalone display, theme and suitable normal/maskable icons. Use temporary simple branding until logo decisions are made. Give browser-specific installation instructions; do not claim an install prompt is universally available.
- Cache only versioned public shell assets initially. Keep API responses, OAuth callbacks, login responses, private photos and backups out of service-worker caches. An offline shell must not imply records have synced.
- Offer an update notification and apply updates after drafts are safe. Avoid forced reloads or mixing stale JavaScript with incompatible APIs. Check cache cleanup and rollback.
- Persist supported form drafts promptly to account-scoped IndexedDB, not only on unload. Begin with sets, then meal/body/journal editors; handle quota/blocked-storage errors visibly. Restore after tab/process restart, retain date and units, and remove a draft only after acknowledged saving or explicit discard. Do not put photo bytes or credentials in drafts.
- Display distinct states: Draft on this phone; Saving; Saved to account; Save failed; Save result unknown. Browser storage is recoverable convenience, not a backup guarantee. Preserve local-mode wording where applicable.
- Add account-scoped idempotency keys for retryable record creation: reuse the key on retry; atomically return the original result for the same payload/key; reject a changed payload with the same key. Test the case where the server commits but its reply is lost. Disabling Save alone does not solve duplicate retries.
- First release is online-first with recoverable drafts and deliberate retry. Full offline record creation, cached history and automatic synchronization are a separate optional stage. Do not add a generic replay queue for deletions/restores or bypass layout revision conflicts. Do not rely on background sync or closed-app execution.
- On logout, clear private rendered state and prevent another account reading old drafts; explain any pending draft loss before an intentional discard. Session expiry may retain drafts for the same verified identity to recover after reauthentication.

Acceptance: install and relaunch; save, close and reopen; lose connection during editing; terminate/reopen the browser and recover a draft; lose a save response and retry without duplicating it; expire a session; reject local storage; sign out/switch accounts; update the installed app while editing. Verify both browser and installed modes on the primary device.

### 6. Validate in actual use before adding more features

Automated baseline (PowerShell from repository root):

```powershell
python -m unittest discover -s backend -v
Get-ChildItem frontend -Filter *.js | ForEach-Object { node --check $_.FullName }
node frontend/test_set_save.cjs
node frontend/test_voice.cjs
node frontend/test_workspace_store.cjs
git diff --check
```

Add focused tests for new origin configuration, idempotent saves, account isolation and durable draft recovery. Use browser automation for navigation/dialog/save regressions if available. A socket permission failure is a blocked check, not a pass. Deployment and physical-device checks remain required.

Record device/OS/browser, build, viewport, network, actions, observed result and unresolved issues. Test populated and empty data, slow/offline networks, phone sleep/relaunch, keyboard/back gestures, exported-file download and photo permissions where enabled. Check dates around midnight in the user's local timezone.

Proposed usability targets: reach an entry editor within two taps of Home; repeat a set in at most three taps after choosing its exercise; visible immediate saving feedback; no duplicate/vanished records. Measure baseline and result rather than inventing timing improvements. Aim for a usable first screen within three seconds on the actual test connection and prompt local interactions; measure before setting further performance budgets. Bound record rendering and avoid loading hidden routes eagerly where measured bottlenecks warrant changes.

Run five real workout trials only after recovery checks pass. Record taps/time, corrections, awkward reaches and failed saves. Fix those findings before returning to mesh/ML/wearables or broader feature expansion. Real-phone acceptance requires Avik's participation; an automated viewport screenshot cannot replace it.

## Instructions for the next execution turn

Read AGENTS.md, this plan and Git status first. Implement stages 1-3 and local portions of stage 5 in reviewable increments; prepare stage 4 against the chosen provider, then finish integrated hosting/PWA validation. Do not claim stage 4 complete without a running persistent backend. Keep local work moving if credentials or phone testing are unavailable, and report precise blockers. Ask only for genuinely missing decisions/access. Preserve Avik's uncommitted work and README; do not implement his separate learning exercise by accident. No automatic commit/push, paid provisioning or real-data migration. A request to execute this plan authorizes its code work; actual deployment should follow the user's stated deployment scope and a concrete reviewable result.

Update AGENTS.md and CHANGELOG.md as decisions become accepted and stages become implemented. Final handoff: changed files, every visible interaction change, commands to run, verified checks, phone installation/test steps and remaining blockers. Keep proposed, implemented, automated-tested and real-phone-verified statuses separate.

## Primary platform references checked during planning

- Vercel filesystem/runtime constraints: https://vercel.com/docs/functions/runtimes
- Supabase authentication and data authorization: https://supabase.com/docs/guides/auth
- PWA installation varies by platform: https://web.dev/learn/pwa/installation
- Service-worker lifecycle and caching: https://web.dev/learn/pwa/service-workers

Recheck platform-specific APIs and deployment limits at implementation time.
