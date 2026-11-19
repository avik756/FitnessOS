# FitnessOS: hands-on manual test guide

**19 November 2026 · local prototype · test with a disposable account and database**

This is a walkthrough of what the current working tree **implements**, not a claim that the whole [frontend plan](frontend_master_document.md) or [completion checklist](../missing.md) is finished. The new page canvas, microphone, food lookup and real-phone behavior still need human testing. If a step below fails, record it as a bug; do not tick the corresponding item in `missing.md` merely because its controls are visible.

## 1. Start a clean test run

Open PowerShell and run:

```powershell
cd C:\FitnessOS
$testDb = "databases\manual-$(Get-Date -Format 'yyyyMMdd-HHmmss').sqlite3"
python -m backend.app --database $testDb --port 8001
```

Keep that window open. On **this same computer**, visit <http://127.0.0.1:8001> in a browser. Create a test-only account, then sign in. The timestamp gives this run its own SQLite file; it does not touch the normal database. If port 8001 is occupied, use a free port in both the command and URL. Stop the server with **Ctrl+C** when finished. Use a fake photo and fake measurements; a downloaded backup is readable JSON, not encrypted.

**Important:** `aviksfitnessos.vercel.app` is a static public preview. It cannot log in or store these records. The local server listens on the computer's loopback address; entering that URL on your phone will not reach the computer. A real-phone test needs a separate reachable, protected setup.

**Every save test follows the same rule:** wait for the success message, reload the page, revisit the record, and, for a stronger check, restart the server with the **same** `$testDb` path and port and sign back in. If a save times out or its result is unclear, check History before trying again so you do not create duplicates.

## 2. Where everything lives

The left sidebar is the main navigation on desktop. On a narrow screen, use the bottom navigation (**Home**, **Log**, **History**, **Pages**, **More**) and the page picker or menu for other tools. The interface may use slightly shorter labels in individual forms.

| What to find | Where to open it | What you will see |
| --- | --- | --- |
| Overview, existing workspace shortcuts, visual preferences | **Overview** / **Home** | A dark workspace, **Your workspace** section links, appearance controls, and **Your pages** |
| Custom page canvas | **Your pages** on Home, a custom page in the sidebar, or **Pages** on narrow screens | Page heading, breadcrumbs, **Edit page**, **+ Subpage**, blocks and an **Open page** selector |
| Fast entry | **Quick add** or **Ctrl+K** | Shortcuts to existing forms; this dialog does not itself save a record |
| Strength | **Log a set** or **Log** | A dedicated pop-up set editor, recent values and four load-step buttons |
| Recorded days | **History** | Calendar, day details and saved sets |
| Exercise and workout setup | **Make a routine**, **Exercises** | Saved exercises, workouts, days, day exercises, favourites and the built-in catalogue |
| Active training | **Workout sessions** | Start a saved day, enter its exercises and finish the session |
| Food | **Nutrition**, **Food library** | Manual calorie/nutrient entry, database search, daily totals; reusable personal foods in Food library |
| Body and daily life | **Body**, **Daily journal** | Weight/measurements and profile; water, sleep, steps and check-ins |
| Charts and private media | **Progress**, **Photos** | Recorded exercise/body trends; password-gated photo calendar |
| Recovery | **Backup** | Export JSON, preview restore and restore into an empty records database |

The old **Your workspace** sections are movable *links to fixed screens*. A page's content blocks live in the newer **Your pages** area. Changing a shortcut does not move the actual workout or food data.

## 3. Quick tour: the new Pages canvas

Start on **Home → Your pages**. On a fresh test database, existing workspace sections should seed starter pages (normally Training, Nutrition and Journal), with links back to their tools; Training should include a section and **Recent sets**. Page creation is an initial prototype; do not expect a full Notion editor.

- [ ] Click **+ New page**. Enter title `Test dashboard` and an emoji, save, and confirm the page opens, appears on Home and in the desktop sidebar. Copy its `#page/...` URL, reload, and check the same page reopens.
- [ ] Click **+ Subpage** on that page. Make `Strength notes`; check its parent in the breadcrumbs and that the **Open page** picker can switch between the two. Use **Edit page** to rename it or change the emoji; reload and verify both locations update. Try browser Back and Forward.
- [ ] On `Test dashboard`, use **+ Add block** to add a **Heading**, a **Note** with two sentences, a **Divider**, and a **Section** called `My training`. Add a child note with the section's **+ Inside** button. Edit a note, collapse/expand the section, then reload; content and order should survive.
- [ ] Add a **Tool link** for **Body** and click it; it should open the existing Body screen. Return to the page and add a **Quick action** for **Log a set**; it should open the shared set editor. Links/actions do not create their own copies of records.
- [ ] Add a **Set history** block. Before logging any sets it should say no sets recorded. After the set test below, use **Refresh records** or reopen the page: it should list recent sets. Edit its **Exercise filter** to an exact exercise name and confirm it shows only that exercise; clearing the filter shows the latest eight again.
- [ ] Select blocks with their checkboxes and click **Move selected**. Move a note inside `My training`, then move it to the other page using the destination page and section selectors. Reload both pages to check it appears once in the new place. Try the per-block up/down controls to reorder sibling blocks. On desktop, drag from *empty page-canvas space* across blocks to try rectangle selection; regular text selection and scrolling should still work.
- [ ] Narrow the browser and use **Pages** and **Open page** to reach your subpage. Check buttons, long text, and editor dialogs with a touch-sized viewport. This is only a desktop simulation; do the actual phone trial later.

**Known scope limits to watch:** There is no inline rich-text editor, full linked database view, page-canvas drag-and-drop, undo/trash, or conflict-safe simultaneous editing. The block dialog exposes generic fields even where a block type does not use them. If moving or adding a block shows a saved state but disappears on reload, report it as a persistence failure.

## 4. Existing Overview workspace and appearance

- [ ] On **Overview → Your workspace**, press **+ Section**. Give the shortcut a name, emoji, colour and a destination tool. Confirm its link opens the tool, and use its edit/collapse controls. Its child links should appear and disappear when collapsed.
- [ ] Select shortcuts with checkboxes, then **Move selected** to reorder/nest them. On desktop, try dragging a shortcut before another; Shift-drag is intended to nest it. Try region selection from empty workspace space. Confirm the sidebar, breadcrumb path and links still work after reload.
- [ ] Toggle **Dark** and **Light**, then **Serif**, **Sans**, and **Mono**. Check pages, charts, calendars, inputs, dialogs and login after sign-out for legible contrast. Reload to see whether the choice persists.

These shortcut sections remain separate from the new custom pages; report any duplicate-looking navigation or place you cannot find a feature.

## 5. A complete strength and history loop

- [ ] Open **Log a set** from the sidebar/Log tab, then again from **Quick add** or **Ctrl+K**. Check both open the same editor. Enter `Bench Press`, 8 reps, 60 kg, **total**, and today's activity date. Press **Save**. Expect one confirmed set, then find **one** matching entry in **History** and in Training's **Recent sets** block.
- [ ] Reopen `Bench Press` and check the previous compatible reps/load display and prefill. Change kg to lb or total to per-hand: the previous value should only come from a set with that same unit **and** convention. Switch back, and try another exercise. A stale asynchronous lookup should not overwrite what you are typing.
- [ ] Set **Load step** to 2.5 kg. With a numeric load entered, test the four buttons: −5, −2.5, +2.5, +5 kg. Change the step to 1.25 and check the buttons recalculate; try an empty load, a negative result and an invalid step to see that they cannot silently create a bad value. A step is remembered per exercise and unit.
- [ ] Try **Save & add another**: save a second set, confirm the editor remains available for a repeated set, and verify exactly one new record per click. Cancel a changed draft and verify no extra record was created. Test other entry points: a recent exercise, a favourite, an exercise library link, a routine day exercise, History's Repeat action, and a page quick action. They should all use the same editor.
- [ ] In **History**, click the test date on the calendar, move to another month and back, and inspect the records. Confirm date, exercise, reps, weight, units and total/per-hand convention agree with what you submitted. Reload and compare again.

For a realistic second pass, create a workout and day under **Make a routine**, assign the test exercise, open **Workout sessions**, start the day, save a set from its exercise, then finish. Check the set stays linked in the session history and cannot be added as a new linked set after the session is finished.

## 6. Voice draft, without automatic saving

- [ ] Inside the set editor, expand the voice controls. Type a simple strength command (for example, `Bench press 8 reps at 60 kg`) and choose **Prepare draft**. Review the parsed exercise, reps, load, date and convention. **History must remain unchanged until you explicitly press Save.** Correct a field and save once.
- [ ] If your browser offers the microphone, try **Start mic**, speak a strength set, then **Stop**; check permission-denied and unavailable behavior as well as a good transcript. Browser speech recognition may use a remote provider. The current parser supports strength-set drafts only; voice entry for meals, water, workouts and body logs is not implemented.

## 7. Nutrition and personal foods

- [ ] In **Food library**, add a test food called `Test oats`, portion `100 g`, 400 kcal, 20 g protein and 10 g fat (optional other nutrients). Save, reload, and select it for a meal of 0.5 portions at a chosen meal time. Expect 200 kcal, 10 g protein and 5 g fat in **Nutrition** and the selected date's **Daily journal**. Use a real food label for additional scaling checks.
- [ ] In **Nutrition**, log another meal manually with a description, date, calories and optional protein/carbs/fat/micronutrients; leave an unavailable nutrient blank. Verify **Nutrition day** totals and coverage counts: unknown values should say unknown/partial rather than zero. Check that meal's detail in daily history and after reload.
- [ ] If you have a USDA FoodData Central API key, set it in the *server process* before starting the app, e.g. `$env:USDA_API_KEY = "your-key"` in that PowerShell window, then start the server. Search from **Nutrition → Find a food**, select a result, set **Grams to log** to 50 then 250, inspect scaling from the listed per-100-g values, optionally **Save selected portion to food library**, and explicitly submit the calorie entry. Try several foods you actually eat; note poor matches and missing values. Without a valid key, search should show an unavailable/error state; manual entry and personal foods are still usable. Do not put the key in a repository file.

## 8. Body, daily journal, photos and trends

- [ ] In **Body**, record height/age in the profile and a dated test weight plus one measurement; leave body-fat percentage blank. Save, reload, then use **Progress** to see recorded body measurements. BMI/resting-energy estimates are calculations; a blank body-fat value should not become zero.
- [ ] In **Daily journal**, pick a date, add water, use its undo, log sleep across midnight, enter a step total of **zero**, and save a check-in with some fields blank and one field set to zero. Reload and compare values and the timeline. Water reminders only run while this page remains open.
- [ ] In **History**, open the date containing a set, body entry and meal. Look for its calendar markers and compare the day details with **Daily journal**. If a screen only shows a subset, record which data is absent rather than assuming the record has been lost.
- [ ] In **Photos**, unlock using the *test account* password. Upload a fake/synthetic test image, choose a category and date, and confirm it appears on the photo calendar. Press **Lock** and verify opening it asks for the password again; repeat after the five-minute unlock expires. Do not upload a real photo during this walkthrough.
- [ ] In **Progress**, select your test exercise and inspect the strength chart and values. If you have logged kg/lb or total/per-hand variants, they must stay separate. A plotted record is a measurement, not a strength forecast.

## 9. Sign-in, backup and recovery

- [ ] Sign out and sign in with **Remember me** off, then on. Close and reopen the browser to check remembered return. Use only your disposable account. Try an incorrect password; confirm it cannot open private photos or records.
- [ ] In **Backup**, download a JSON export. If it includes photos, complete the separate recent password unlock. Preview the backup while your current test database has records; replacing populated records should be refused. The export omits account credentials and is **unencrypted**.
- [ ] For a real restore test, stop the first server, then start a second **empty** database with a new filename (or keep the first running and use port 8002 in a second terminal):

  ```powershell
  $restoreDb = "databases\restore-$(Get-Date -Format 'yyyyMMdd-HHmmss').sqlite3"
  python -m backend.app --database $restoreDb --port 8002
  ```

  Open <http://127.0.0.1:8002>, create a new test account, go to **Backup**, preview the downloaded JSON and restore it. Reload and compare sets, session links, meals/nutrients, food definitions, photos, workspace pages/blocks, shortcuts and appearance with the original database. Account passwords are not part of the export. Do not restore over records you care about.

## 10. What you cannot check off yet

The following are **still work items**, so a missing control here is expected; see [`missing.md`](../missing.md) for the full crossing-off list:

| Not yet completed or established | Current boundary |
| --- | --- |
| Full Notion-like editing | Basic pages/blocks exist; no rich editor, linked database system, canvas drag-and-drop, undo or full layout customization |
| Reliable two-tab workspace editing | No revision-aware workspace save/conflict handling yet; avoid editing the same workspace in two tabs while evaluating data safety |
| Broader voice commands | Only a reviewable strength-set draft exists; microphone and phone support need hands-on checks |
| Complete offline phone workflow | No durable offline phone saves or sync guarantee; local Python server must be reachable for writes |
| Fully hosted working app | Vercel serves a static preview; hosted Python endpoint, database and private account/record storage remain to build |
| Real-phone approval and product completion | Touch, keyboard, relaunch, five-workout trial, backup/recovery and multiple feedback rounds remain open |

## 11. Report feedback and cross things off

### New feedback increment to check

- [ ] Open Overview, History, Nutrition, Journal and Quick add in both themes. Compare the lighter sidebar/darker canvas, popup contrast, small top breadcrumb and readable inputs. Check the login page after signing out.
- [ ] On desktop, choose **Arrange navigation**, move two tools with the up/down buttons, select **Done arranging**, then reload. On phone, open **More → Settings**; desktop has **Settings** in the sidebar. Change theme, page type and density, then reload and check appearance.
- [ ] On **Daily journal**, open Water, Sleep, Check-in and Steps in turn. The compact sections should expose all original forms, the same saved records and the timeline. Try Quick add → Water/Steps/Check-in and check that the appropriate section opens.
- [ ] On **Reminders**, save a message for the next minute, choosing weekdays or daily and an optional quiet period. Keep the app open: verify the in-app message arrives once. Try pause/resume, remove and Test vibration with Off, Short, Double and a custom pulse sequence. Browser support varies. Reminders and sidebar order currently live in this browser's local storage, so the JSON backup does not include them, and reminders do not run after the app closes.
- [ ] Search the expanded Exercises catalogue in Log, Make, and Exercises; the same 75 suggestions should appear without showing fabricated workout history.

The frontend plan's whole-site content blocks, conflict-safe edits, body mesh and closed-app reminders have not been implemented in this increment. Track these as open in `missing.md`.

## 12. Feedback notes

For each problem, write: **screen/page → action → expected → actual → date/browser/device → whether it survives reload → screenshot if useful**. For an entry problem, add the test exercise/food and exact units. Keep three labels distinct in `missing.md`: *implemented*, *I verified this on my device*, and *I accept this interaction*. A new source file or a green automated test establishes only the first of these.

If you want a short first pass, do Sections **1, 3, 5 and 9** first. They expose the main new page workflow, one complete log/history loop and whether your records can actually be recovered.
