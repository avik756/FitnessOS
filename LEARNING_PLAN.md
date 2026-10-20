# Learning plan for a web-first fitness app

## Direction and how to use this plan

Build a **web app first**, with a good phone experience. The earlier preference for Python in the data/backend layer is assumed here; the web framework, storage architecture, and eventual phone packaging are still choices to test. The exercises below teach the tools through a tiny workout-logging example. They are **learning exercises**, not a commitment to the app's final feature list or architecture.

Use a **learn → do → explain** loop: spend roughly 30–45 minutes on one lesson, make a small change yourself, and explain how the result works. You can ask AI to help, but read the changed files and reproduce the behavior before moving on. You do not need to finish a whole course before building anything.

## 0. Get comfortable saving and sharing progress with Git

Follow [the Git and GitHub crash course](GIT_GITHUB_CRASH_COURSE.md). Make the first commit, push it from Ubuntu WSL, and then make and push one more small edit without following every instruction word for word. Know the difference between a file edit, a staged change, a local commit, and a push.

**Move on when:** You can find your latest commit locally and on GitHub and explain why they match.

## 1. Learn what runs in the browser

Work through the relevant parts of [MDN's first website guide](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Your_first_website): HTML for structure, CSS for layout and appearance, and JavaScript for interaction. Focus on forms, inputs, labels, buttons, basic responsive layout, simple DOM updates, and the browser's developer tools. Learn what a browser sends to a server and what it receives back; you do not need a JavaScript framework yet.

**Do:** Make one phone-width exercise card in a browser with exercise name, reps, load, and a Save button. Make the button show the entered values on the page. This is only an interface exercise: the values may disappear on reload.

**Move on when:** You can explain which parts came from HTML, CSS, and JavaScript, and why a value visible on the page is not necessarily saved.

## 2. Learn SQL with SQLite

**SQL** is the language for asking a relational database to store and retrieve data. **SQLite** is a database engine that understands an SQL dialect and stores a database in a file. Start with SQLite because it needs no separate database server and Python has a built-in [`sqlite3` module](https://docs.python.org/3/library/sqlite3.html#tutorial). This is a learning and prototype choice, not a final decision about every deployment or future user count. Read [SQLite's guidance on where it fits](https://www.sqlite.org/whentouse.html) when that decision becomes concrete.

Study [CS50 SQL's Querying, Designing, and Writing lessons](https://cs50.harvard.edu/sql/) selectively. Learn `CREATE TABLE`, `INSERT`, `SELECT`, `WHERE`, `ORDER BY`, `UPDATE`, `DELETE`, and a simple `JOIN`. Then use Python's `sqlite3` tutorial to learn connections, parameter placeholders (`?`), commits, and transactions. Use placeholders for user-entered values; do not build SQL by joining user input into a string.

**Do:** Make a **toy** database with a workout and its sets. Insert two sets, close the Python process, reopen it, and query the same two sets. Change one value and verify the result. Use invented data, not your only copy of a real workout.

**Move on when:** You can explain what a table, row, primary key, query, transaction, and commit mean. In this section, a database commit saves a transaction; a **Git commit** is a different kind of snapshot.

## 3. Connect a browser page to Python

Learn the basic HTTP path: browser form → request → Python handler → validation → database write → response → updated page. A small Python web framework such as [FastAPI](https://fastapi.tiangolo.com/tutorial/) is a candidate, but choose it when you actually build this connection. When you install your first Python package, use a project [`venv`](https://docs.python.org/3/library/venv.html) so the package versions belong to this project; `.venv/` is already ignored by Git.

**Do:** Turn the browser exercise into a tiny end-to-end prototype. Submit one set, show a clear success or failure message, restart the server, and show the saved set in a history view. First make it work on your computer. Keep the interface and data model narrow enough that you can explain every file.

**Move on when:** You can trace one set from a browser input through Python into storage and back to the browser. You can show what happens when a save fails without claiming success.

## 4. Test the phone and resolve the offline question

Try the same entry task at phone width and on a real phone when available. Check tap targets, keyboard overlap, loading time, save feedback, and whether the history survives a reload. Browser responsive mode is useful, but it does not prove the actual phone experience.

A Python server using SQLite can save data **when the browser can reach that server**. It does not automatically make a hosted web app work offline. If offline entry is required, investigate browser storage such as [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) and the [offline mechanisms used by PWAs](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation). Decide where the authoritative record lives, how a local save is acknowledged, and what happens when the device reconnects. Do this with a small experiment before committing to sync or a hosting architecture.

**Do:** Write down the exact behavior you need with airplane mode on. Test the prototype against it. Record what works, what fails, and what architecture question that result answers.

**Move on when:** You can distinguish “saved in a server database,” “saved in this browser,” and “backed up elsewhere.”

## 5. Verify records and recovery before real use

Use [pytest's getting-started guide](https://docs.pytest.org/en/stable/getting-started.html) for a few valuable checks around validation and save/read behavior. Make a local export and a restore preview before relying on the app for meaningful personal records. Test an interrupted or invalid restore against a copy of the toy database. Preserve units, dates, and the difference between an unknown value and zero.

**Do:** Save a toy set, restart, export it, and confirm you can read the same values back. Try one invalid input and one failed write. Show that a failed save does not falsely claim success or erase the user's draft.

**Move on when:** You can demonstrate what survives a restart, what survives a failed save, and how you would recover the data.

## Kivy and other technologies

You can finish your current Kivy beginner tutorial if it is helping you understand event handling and Python UI code. Treat that as **optional background learning**. More Kivy screens, Android packaging, and BeeWare comparisons are not prerequisites for the web-first project. If browser capabilities later fail a concrete phone requirement, compare a native wrapper or native UI against the same task then.

Do **not** study Docker, React, cloud deployment, authentication, notifications, or a full PWA course just to feel ready to start. Add a tool when a task needs it. A likely early set is **Git/GitHub, HTML, CSS, JavaScript, Python, SQLite, SQL, `venv`, and a small web framework**. The exact framework and storage design remain open.

## How to work with AI while learning

For each change, ask for the data flow, the files changed, and how to reproduce a failure. Read the diff before accepting it. Change one small behavior yourself. Commit a working increment with a message describing what changed. Ask for tests where a wrong result could lose records or misstate a trend. Write down questions you still have for the next coding-cafe check-in.

## Study later, when the feature enters the plan

- Browser installation details, service workers, and advanced offline sync.
- Hosting, accounts, cloud backups, and encryption.
- Voice input and editable confirmation.
- Notifications and background behavior.
- Nutrition data and nutrient estimation.
- Exercise research, uncertainty, and evaluation of personal predictions.
- Native wrappers, widgets, wearables, and sport integrations.
