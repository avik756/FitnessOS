# Testing routine for the local app

Use invented exercise data in a separate local database. Keep the server terminal open so request errors are visible. The database under `databases/` is ignored by Git, but check `git status` before staging any files.

## 1. Automated checks

From `C:\FitnessOS` in PowerShell:

```powershell
python -m unittest -v backend.test_app backend.test_http
```

All tests should say `ok`. A failure shows `FAIL` or `ERROR` and a traceback. The HTTP test opens a temporary loopback server, so it needs local socket access.

## 2. Start with an empty trial database

Choose a database filename that does not exist yet, then run:

```powershell
python backend/app.py --database databases/manual-check.sqlite3 --port 8001
```

Open <http://127.0.0.1:8001>. If you have used that filename before, choose another one rather than clearing any records. A fresh database should take you to **Create your local account**.

## 3. Account and remember me

1. Create a trial account with a name and password you can remember for this test. Leave **Remember me** unchecked. Expect the overview to open. Use **Sign out**; expect the sign-in page and no access to history until signing in again.
2. Sign in with the trial account and check **Remember me**. Reload the page, then visit <http://127.0.0.1:8001/login>. Expect to return to the app without entering credentials again. Sign out when finished; the remembered session should end.
3. Use invented credentials only in this trial database. The account is local and does not encrypt SQLite or backups.

## 4. Repeated-set flow

1. Open **Log a set**. Enter `Goblet squat`, `8` reps, `20` kg, `total`, and save. Expect a success message, one **History** row, a **Just saved** card, and a recent-exercise button.
2. Press **Repeat values**. Expect the date, exercise, reps, load, unit, and load convention to fill the form. Check that history still has one row: copying values does not save.
3. Change to `9` reps and `0` kg, then save. Repeat again, change to `10` reps, clear the load field, and save. Expect exactly three history rows. The second row should read `0 kg total`; the third should read `load unknown`.
4. Reload the page, then stop and restart the server and reload again. Expect all three rows to remain. The **Just saved** card is for the current page session; history and recent exercises come from the database after reload.

## 5. Recent-exercise and favorite flow

1. Enter `Dumbbell row`, `12` reps, `15` lb, `per hand`, and save. Expect it above Goblet squat in recent exercises.
2. Select **Goblet squat** in recent exercises. Expect its name, kg unit, and total convention in the form. Reps and load stay unchanged; no new history row appears.
3. Press **Copy last reps and load**. Expect `10` reps and a blank load from Goblet squat's latest saved set. Change them if desired, then save explicitly. Expect exactly one additional history row.
4. Type a different exercise name manually. The copy button should disappear. Manual entry should remain usable even if recent exercises fail to load.
5. Open **Exercises**, add Goblet squat as a favorite, and return to **Log a set**. Expect a Goblet squat shortcut. Reload and confirm it remains. Removing the favorite should remove the shortcut without deleting any sets.

## 6. History, progress, and planned areas

1. In **History**, choose Goblet squat. Expect only its saved sets and an accurate matching count. **All recent sets** should return to the latest-100 view.
2. In **Progress**, choose Goblet squat. Check that set and recorded-day counts match history. The bars show set counts by activity date; they do not claim fitness improvement.
3. Open **More**, then a planned area such as **Meals & nutrition**. Expect **This feature is coming soon!**. Return to Overview.

## 7. Failure and recovery

1. With the page still open, stop the server using Ctrl+C. Enter a new unsaved set and press **Save set**.
2. Expect an error that says the save could not be confirmed. The typed fields should remain. The **Just saved** card, if visible, still refers to the earlier confirmed save.
3. Restart the server and press **Refresh** in history. Check whether the attempted set exists before retrying. If it is absent, press **Save set** again. Expect one new row and a success message.

This check matters because a lost response can leave a save's outcome unknown. The app tells you to inspect history before retrying so you do not create a duplicate.

## 8. Recovery and phone-width check

Download a backup, preview it in another empty trial database, restore it, and compare the sets and favorites using `RUN_APP.md`. Create a new local account for that database; credentials are not in the backup. At a narrow browser width (about 360 px), check the login form, navigation, recent-exercise buttons, copy action, fields, and save feedback. Record any keyboard or focus problems on a real phone when phone access is available; desktop resizing alone cannot verify them.

## What to note during a real workout trial

For each attempt, note time from opening the page to the first confirmed save, taps to log the next set or exercise, corrections, confusing labels, failed or uncertain saves, and whether the last set was easy to find. Do this with a few invented sets before using meaningful personal records. Export and restore need a successful hands-on check first.
