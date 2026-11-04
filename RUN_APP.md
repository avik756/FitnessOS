# Run FitnessOS locally

This local build has a single account sign-in, overview, strength-set entry, filtered history, favorite exercises, a record-count progress view, and JSON backup and restore. Planned areas open a page that says **This feature is coming soon!** It uses Python's standard library and runs on this computer. The current scope is an experiment, not a final product plan. Use `TESTING_ROUTINE.md` for a hands-on check.

## Start it

From `C:\FitnessOS` in PowerShell:

```powershell
python backend/app.py
```

Open <http://127.0.0.1:8000> on the same computer. Stop the server with Ctrl+C. The ignored database is created at `databases/fitnessos.sqlite3` after the first request. If port 8000 is busy, the terminal reports an address-in-use error.

On the first visit, create a local name and password. The account protects browser access to this one database. **Remember me** keeps the browser signed in for up to 30 days; leaving it unchecked uses a browser-session cookie with a 12-hour server limit. **Sign out** ends that session. The password is hashed in SQLite, but the database and exported backups are not encrypted. This is not a cloud account or a multi-user system. If you forget the password, there is no in-app reset yet, so keep a tested backup of your records.

Run the storage and HTTP checks with `python -m unittest -v backend.test_app backend.test_http`.

## Check that it really saves

1. Open **Log a set**, enter an invented exercise, reps, and load; press **Save set**.
2. Look for the success message, then open **History** to find the row. A blank load appears as **load unknown**; a typed `0` appears as **0 kg/lb**.
3. Reload the page. Stop and restart Python, then reload again. The row should still be there.
4. After saving, press **Repeat values** in the **Just saved** card. It fills the form without saving another set. Recent exercises fill the name and load convention; **Copy last reps and load** is a separate choice. Review or change the values, then save explicitly. **Use again** on a history row also fills the form without saving.
5. For a failure check, stop Python while the page stays open, change the form, and press **Save set**. The page should say the result could not be confirmed and keep the entered values. Restart Python, refresh history, and check whether the set exists before retrying.

## Check backup and restore

1. Open **Backup**, press **Download backup**, and confirm `fitnessos-sets.json` is on your computer. Open it in a text editor and verify that it contains the sets and favorites you expected. Keep personal backup files outside the Git repository.
2. Stop the server. Start a second, empty local database with `python backend/app.py --database databases/restore-check.sqlite3 --port 8001`, then open <http://127.0.0.1:8001>.
3. Create a new local account for the second database. Choose the downloaded JSON file and press **Preview restore**. Check the set and favorite counts and date range. Press **Restore these records** only if they match. Reload the page and verify history and favorites.
4. Attempting to restore again should be refused because the second database is no longer empty. Existing records remain in place.

The version 2 backup includes sets and favorites; version 1 set backups are still accepted. Account passwords and sessions are never exported. Restore recreates database save timestamps. It preserves exercise, activity date, reps, load, unit, and total/per-hand meaning. It will not merge into a database that already has sets or favorites.

At narrow browser width, check whether each field and button is comfortable to use. A real-phone test still needs a way for the phone to reach the running server; this prototype listens only on this computer, so it is not yet a phone-accessible deployment.

## Follow one set through the code

`frontend/login.html` and `frontend/login.js` handle account setup and sign-in. `backend/app.py` hashes the password, stores sessions, and checks the session before serving records. `frontend/index.html` lays out the app; `frontend/style.css` handles phone width; `frontend/app.js` sends a set as JSON to `POST /api/sets`. The Python code validates it, inserts a row into SQLite, commits it, and only then responds with success. History initially shows the latest 100 sets; choosing an exercise queries all its sets. Export includes **all** sets and favorites. A page value by itself is only a draft; a successful server response means it reached this computer's database.

Try changing the button label or history wording yourself, then explain which file you changed. Inspect `git diff` and `git status` before deciding what to commit. No commit or push is made by this prototype.

## Current boundary

The app listens only on `127.0.0.1`, so another device cannot connect. Its local login is a prototype and the server is not a public deployment server. Export and restore have automated checks, but test a backup yourself before relying on meaningful records. A real-phone test and offline behavior remain later decisions; a Python server with SQLite cannot save from a disconnected phone browser.
