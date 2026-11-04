# Local testing routine

Run from `C:\FitnessOS` in PowerShell. Use a disposable database for manual checks so your own records stay untouched.

## Automated checks after code changes

```powershell
python -m unittest discover -s backend -v
node --check frontend/app.js
node --check frontend/features.js
git diff --check
```

The Python tests cover saving and reopening records, validation, old database compatibility, calendar contents, BMI/resting-energy calculations, login and protected HTTP routes, and backup/restore into an empty database. A failed assertion, HTTP status, or syntax error means the change needs attention before using the app.

## Manual browser pass

1. Start the app with `python -m backend.app --database databases/manual-test.sqlite3 --port 8001`, then open `http://127.0.0.1:8001`.
2. Create a **test-only** local account or sign in to a previously created test account. Check Remember me both off and on, then sign out.
3. Log one set, one body entry (including a measurement), and one calorie entry. Confirm each save message. Reload and confirm the entries remain.
4. Add height, age, and a formula variant. Check BMI and the resting-energy estimate against a hand calculation. Change the body trend selector; only recorded measurements should appear. Leave body-fat percentage blank and confirm it stays unknown.
5. Open History. Check that the chosen date has S/B/C markers, click it, and compare the set, body, and calorie details. Navigate to another month and back.
6. In Make, create an exercise, a workout, a day, and a day exercise. Use the exercise shortcut to open the set logger, then save a real test set.
7. Download the JSON backup. Preview it in the same database; restore must be refused because records exist. Make a second empty test database, preview and restore there, and compare all record types and workout days.
8. Try a narrow phone-sized browser viewport. Check touch target size, keyboard behavior, scrolling, navigation, form feedback, and access to history. A real-phone check is still needed: this localhost server binds to the computer only.

If a save times out or returns an unreadable response, check History before retrying so you do not create a duplicate. Keep meaningful personal records in the default database only after the backup and restore check succeeds.
