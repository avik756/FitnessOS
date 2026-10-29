# Run FitnessOS locally

This first build lets you enter a strength set, read it in history, reuse its values for the next set, download a JSON backup, and restore that backup into an empty database. It uses only Python's standard library and runs on this computer. The strength-only scope is the current build experiment, not a final product decision.

## Start it

From `C:\FitnessOS` in PowerShell:

```powershell
python app.py
```

Open <http://127.0.0.1:8000> on the same computer. Stop the server with Ctrl+C. The ignored database is created at `data/fitnessos.sqlite3` after the first request. If port 8000 is busy, the terminal reports an address-in-use error.

Run the storage and HTTP checks with `python -m unittest -v test_app.py test_http.py`.

## Check that it really saves

1. Enter an invented exercise, reps, and load; press **Save set**.
2. Look for the success message and the new history row. A blank load appears as **load unknown**; a typed `0` appears as **0 kg/lb**.
3. Reload the page. Stop and restart Python, then reload again. The row should still be there.
4. Press **Use again** on a history row. It fills the form without saving another set. Review or change the values, then save explicitly.
5. For a failure check, stop Python while the page stays open, change the form, and press **Save set**. The page should report failure and keep the entered values. Restart Python before retrying.

## Check backup and restore

1. Press **Download backup** and confirm `fitnessos-sets.json` is on your computer. Open it in a text editor and verify that it contains the sets you expected. Keep personal backup files outside the Git repository.
2. Stop the server. Start a second, empty local database with `python app.py --database data/restore-check.sqlite3 --port 8001`, then open <http://127.0.0.1:8001>.
3. Choose the downloaded JSON file and press **Preview restore**. Check the set count and date range. Press **Restore these sets** only if they match. Reload the page and verify the history.
4. Attempting to restore again should be refused because the second database is no longer empty. Existing records remain in place.

The restore recreates database save timestamps. It preserves exercise, activity date, reps, load, unit, and total/per-hand meaning. It will not merge backups into a database that already has sets.

At narrow browser width, check whether each field and button is comfortable to use. A real-phone test still needs a way for the phone to reach the running server; this prototype listens only on this computer, so it is not yet a phone-accessible deployment.

## Follow one set through the code

`static/index.html` defines the form. `static/style.css` makes it usable at phone width. `static/app.js` sends the form as JSON to `POST /api/sets`. `app.py` validates the values, inserts a row into SQLite, commits it, and only then responds with success. The browser loads `GET /api/sets` to show the latest 100 sets; export includes **all** sets. A page value by itself is only a draft; a successful server response means it reached this computer's database.

Try changing the button label or history wording yourself, then explain which file you changed. Inspect `git diff` and `git status` before deciding what to commit. No commit or push is made by this prototype.

## Current boundary

The app listens only on `127.0.0.1`, so another device cannot connect. It has no account system and is not a public deployment server. Export and restore now have automated checks, but test a backup yourself before relying on meaningful records. A real-phone test and offline behavior remain later decisions; a Python server with SQLite cannot save from a disconnected phone browser.
