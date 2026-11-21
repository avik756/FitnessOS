# Month-long demo database

`databases/fitnessos-demo-month.sqlite3` is a **fictional**, separate local database spanning 21 October to 19 November 2026. It has a test account, four rotating saved workout days and sessions with sets, meals and a personal food library, body measurements, sleep, water, steps and check-ins. It contains no actual user records or progress photos. It is ignored by Git.

Current counts: 192 sets across 16 completed sessions, 66 meals, 6 body entries, 72 water entries, 20 step totals, 22 sleep entries, 10 check-ins and 6 personal foods.

From PowerShell in `C:\FitnessOS`, run:

```powershell
. .\demo.ps1
```

The leading dot and space preserve `$testDb` in your PowerShell session. The script sets `$testDb` to the demo file and starts the local server on port 8001. Open `http://127.0.0.1:8001`, then sign in as **Demo Athlete** with password **DemoPass123!**. Stop the server with Ctrl+C. If another server is already on port 8001, stop it first, or start manually on a free port:

```powershell
$testDb = (Resolve-Path .\databases\fitnessos-demo-month.sqlite3).Path
python -m backend.app --database $testDb --port 8002
```

Use **History** to inspect dates, **Make → Workout sessions** for the four-day rotation, **Nutrition** for meals, **Food library** for six saved portions, and **Daily journal** for water, steps, sleep and check-ins. There are deliberately some days with no workout, missing meals and unknown nutrients/body-fat values; these are missing records rather than recorded zeroes.

To generate a **new** database at a different path, run `python -m backend.create_demo_database --database databases/my-other-demo.sqlite3`. The generator refuses to overwrite an existing file. To clear this demo, stop the server, move the file to a backup location, then run `python -m backend.create_demo_database` to make a fresh copy. Never point the generator at your personal database.
