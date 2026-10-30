# Testing routine for the set-entry experiment

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

Open <http://127.0.0.1:8001>. If you have used that filename before, choose another one rather than clearing any records. A fresh page should say there are no saved sets and no recent exercises.

## 3. Repeated-set flow

1. Enter `Goblet squat`, `8` reps, `20` kg, `total`, and save. Expect a success message, one history row, a **Just saved** card, and a recent-exercise button.
2. Press **Repeat values**. Expect the date, exercise, reps, load, unit, and load convention to fill the form. Check that history still has one row: copying values does not save.
3. Change to `9` reps and `0` kg, then save. Repeat again, change to `10` reps, clear the load field, and save. Expect exactly three history rows. The second row should read `0 kg total`; the third should read `load unknown`.
4. Reload the page, then stop and restart the server and reload again. Expect all three rows to remain. The **Just saved** card is for the current page session; history and recent exercises come from the database after reload.

## 4. Recent-exercise flow

1. Enter `Dumbbell row`, `12` reps, `15` lb, `per hand`, and save. Expect it above Goblet squat in recent exercises.
2. Select **Goblet squat** in recent exercises. Expect its name, kg unit, and total convention in the form. Reps and load stay unchanged; no new history row appears.
3. Press **Copy last reps and load**. Expect `10` reps and a blank load from Goblet squat's latest saved set. Change them if desired, then save explicitly. Expect exactly one additional history row.
4. Type a different exercise name manually. The copy button should disappear. Manual entry should remain usable even if recent exercises fail to load.

## 5. Failure and recovery

1. With the page still open, stop the server using Ctrl+C. Enter a new unsaved set and press **Save set**.
2. Expect an error that says the save could not be confirmed. The typed fields should remain. The **Just saved** card, if visible, still refers to the earlier confirmed save.
3. Restart the server and press **Refresh** in history. Check whether the attempted set exists before retrying. If it is absent, press **Save set** again. Expect one new row and a success message.

This check matters because a lost response can leave a save's outcome unknown. The app tells you to inspect history before retrying so you do not create a duplicate.

## 6. Recovery and phone-width check

Download a backup, preview it in another empty trial database, restore it, and compare the records using `RUN_APP.md`. At a narrow browser width (about 360 px), check that recent-exercise buttons, the copy action, all fields, and save feedback remain readable and easy to tap. Record any keyboard or focus problems on a real phone when phone access is available; desktop resizing alone cannot verify them.

## What to note during a real workout trial

For each attempt, note time from opening the page to the first confirmed save, taps to log the next set or exercise, corrections, confusing labels, failed or uncertain saves, and whether the last set was easy to find. Do this with a few invented sets before using meaningful personal records. Export and restore need a successful hands-on check first.
