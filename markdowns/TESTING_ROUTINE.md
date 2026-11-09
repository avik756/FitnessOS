# Local testing routine

Run from `C:\FitnessOS` in PowerShell. Use a disposable database for manual checks so your own records stay untouched.

## Automated checks after code changes

```powershell
python -m unittest discover -s backend -v
node --check frontend/app.js
node --check frontend/features.js
node --check frontend/journal.js
node --check frontend/voice.js
node frontend/test_voice.cjs
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

## Additional pass for the 10 November prototype increment

9. Start a saved workout day in Workout sessions. Open its exercise, save a set, return to the session, and confirm the set is listed. Finish the session; the set must remain visible and the session must refuse new linked sets.
10. In Daily journal, add and undo water, save sleep crossing midnight, enter bloating zero with mood blank, and set a daily step total of zero then update it. Reload and compare the day view. Water reminders should only appear while this page stays open.
11. Save a food and portion, then log a fractional number of portions with a meal time. Check the computed calories in Calories and the selected day's journal.
12. On Photos, use a **synthetic test image**, save it under a custom category and confirm its calendar day. Lock the gallery; it should ask for the password and `/api/photos` should return HTTP 403. Re-enter the test password, then download a backup through Backup's separate photo-export unlock. The JSON is not encrypted; handle it accordingly.
13. Restore the downloaded v4 backup into a fresh disposable database and compare workout links, meal times, journal entries and photo bytes. On Progress, select an exercise and check that the chart never mixes kg/lb or total/per-hand loads. On Log, prepare a voice or typed draft and confirm it changes fields without saving a set.

If a save times out or returns an unreadable response, check History before retrying so you do not create a duplicate. Keep meaningful personal records in the default database only after the backup and restore check succeeds.
