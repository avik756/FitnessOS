# Fitness app follow-ups: proposed answers to review

These are **proposals**, not settled requirements. The discovery questionnaire describes the vision; this file narrows the choices that affect the first build. You can reply with “approve 1, change 2...” rather than filling another long form.

## 1. First useful release

**Proposed:** Make strength logging and history the first complete experience. Open the app, choose a recent or favorite exercise, see the last recorded working sets, adjust and save today's sets, then view the saved workout and one honest per-exercise trend. Include reusable workout templates if they reduce entry time in the first five workouts. Defer meal logging, sports, photos, voice, AI plans, notifications, and widgets until this flow is dependable.

**Please decide:** Is a strength-only first release useful enough for your five-workout trial, even though the full product vision includes nutrition and coaching?
Yes it is good enough for v1.

## 2. What the app saves

**Proposed:** A workout can have a title, local activity date, optional notes, and exercises. Each set has reps, load, explicit unit and load convention (for example, per hand or total), and an optional warm-up flag. Keep exercise variants separate for trends. Offer optional rest timing without making it a required field. Ask for extra detail only when the exercise needs it.

**Please decide:** Are reps and load enough as the default set fields? Which of effort, failure, and rest must be recorded for your early insights?
Failure and rest must be recorded. Rest, as i have described before, should be timed, but also should be editable. We can also add a feature that simply times the rest for you, perhaps gives advice like whether to hydrate, which stretch to do, show interesting live workout insights, perhaps even some nice animation, and have a "pocket mode" where it just vibrates in a certain pattern when the rest time is over. Failure I suppose can be recorded in "how many reps away do you think failure was" and 0 can mean it was hit. yes that is subjective. yes that is fine.  

## 3. Fast entry target

**Proposed:** Aim for one tap to add a *pre-filled exercise* from a template or recent workout; let the user confirm or adjust each set. Measure active taps and time in five real workouts. Treat “under seven taps for a whole workout” as an aspirational target for repeated, unchanged templates, since the user must still confirm what was actually done.

**Please decide:** Would you rather confirm each performed set, or confirm the whole pre-filled workout at the end?
simply make this a toggleable setting

## 4. Saving, offline use, and recovery

**Proposed:** Save each edit to durable local storage first, immediately show whether it succeeded, and queue cloud backup/sync when online. Keep all text workout history on the phone if storage permits; a one-month limit is unnecessary for this small data type. A success animation may accompany the acknowledgment, but the record should still be readable after force-closing and reopening the app. Export and a tested restore path should exist before the app becomes your only record. If a write fails, keep the draft visible and offer retry or export. Do not rely on pre-allocating unused space to prevent storage failure.

**Please decide:** Is “saved on this phone” a valid success state, with “backed up” shown separately? Yes.

## 5. Cloud and privacy

**Proposed:** Start with one device and versioned automatic backups. Add multi-device live editing only when you need it. A seven-day undo window should use recoverable deleted records; older backup versions should cover mistakes discovered later. A restore should preview contents and never silently replace current data. Do not resolve divergent offline edits solely by “latest timestamp”; preserve both copies for review when they conflict.

**Please decide:** Which matters more soon: restoring a replacement phone or live use on multiple devices? Is a Google account acceptable for backup if the exact privacy model is explained first? Restoring a replacement phont matters more. A google account is acceptable. 

**Encryption trade-off to decide later:** Provider-managed encryption is easier to restore through account recovery, but the provider may be able to access plaintext. End-to-end encryption protects data from the provider, but losing the recovery key can make a backup unrecoverable. We should choose with a concrete backup provider and recovery test, not from a slogan.

## 6. Insights and claims

**Proposed:** Start with auditable observations: best recorded set, reps at a given load, personal records, and a trend that names its calculation and shows the underlying entries. Avoid a single “hypertrophy achieved” score or a precise date for a future lift until we have a defined, validated model and enough consistent data. General research can inform explanations; it cannot by itself verify a personal “100 kg bench in 3.4 weeks” forecast. Future predictions should state uncertainty and cite both their research basis and the user's data used.

**Please decide:** For the first trend, would you prefer best working-set load at a fixed rep range, estimated one-rep max with a clear caveat, or both? Both, switchable

## 7. Python and Android

**Proposed:** Treat “as much Python as possible” as a strong preference and “proper phone app” as a requirement to test. Compare a small Python Android prototype (Kivy and BeeWare are candidates) with a mobile web prototype using the *same* logging flow. A Python backend does not make a web interface Python; browser UI still requires web technology. An Android package around a web app can provide an app icon and full-screen launch, but native widgets and deeper integrations need Android-specific work. Judge the prototypes on the OnePlus 11R: entry friction, visual quality, haptics, offline save, relaunch, and backup. Do not lock a framework yet.

**Please decide:** Does “built in Python” mean the on-phone interface itself must be Python, or is Python for data logic and any server enough if the phone experience is better? I'd prefer the on-phone interface to be python as well, as long as it doesnt significantly make the UI UX considerably worse. If that happens, I will consider andoid technlogoies for UIUX but python at the backend of the android app (and the webapp) is nonnegotiable.

## 8. Notifications, voice, and widgets

**Proposed:** Keep these visible in the roadmap and build them after repeated logging proves useful. First notification candidate: an opt-in reminder based on a schedule you set, with quiet hours and an easy off switch. First voice candidate: transcribe an exercise and sets into an editable confirmation card; never silently save inferred loads or units. First widget candidate: open directly into the quick logging flow.

**Please decide later:** Which one of reminder, voice entry, or a home-screen shortcut removes the most real friction after five workouts? Should a workout reminder be allowed while the app is closed and the phone locked? voice-entry most likely removes the most friction. the reminder (if cited to a real psychological study or theory) probably is the best feature of the app though. it helps with consistency. 

## 9. Five-workout experiment

**Proposed:** For each of five workouts, note: time from opening to first saved set, taps to log an exercise, corrections, save failures, confusing labels, and whether the last workout was visible when needed. After one session, close and reopen the app; after another, disconnect the phone and save; after another, simulate a new install and restore a backup. If any saved record changes or disappears, the prototype fails regardless of appearance.

**Please decide:** Does this test cover what would make you trust the first release? Yes. 

## Reference points for later architecture and claims

- [Kivy Android packaging](https://kivy.org/doc/stable/guide/packaging-android.html)
- [BeeWare Android tutorial](https://tutorial.beeware.org/tutorial/tutorial-5/android/)
- [Android Trusted Web Activities](https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities)
- [MDN browser storage persistence](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist)
- [Android app widgets](https://developer.android.com/develop/ui/views/appwidgets)
- [Resistance training response systematic review](https://pmc.ncbi.nlm.nih.gov/articles/PMC11067735/)
