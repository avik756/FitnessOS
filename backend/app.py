"""The local FitnessOS server: account, records, and browser pages."""

import argparse
import hashlib
import hmac
import json
import secrets
import sqlite3
from contextlib import closing
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from http.cookies import CookieError, SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from time import time
from urllib.parse import parse_qs, urlsplit

try:
    from backend import features
except ModuleNotFoundError:  # Also supports `python backend/app.py`.
    import features


ROOT = Path(__file__).resolve().parent.parent
STATIC = ROOT / "frontend"
DATABASE = ROOT / "databases" / "fitnessos.sqlite3"
COOKIE_NAME = "fitnessos_session"
SESSION_SECONDS = 12 * 60 * 60
REMEMBER_SECONDS = 30 * 24 * 60 * 60
PASSWORD_ITERATIONS = 400_000


def connect(database=DATABASE):
    database.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(database)
    connection.row_factory = sqlite3.Row
    connection.execute("""
        CREATE TABLE IF NOT EXISTS sets (
            id INTEGER PRIMARY KEY,
            activity_date TEXT NOT NULL,
            exercise TEXT NOT NULL,
            reps INTEGER NOT NULL,
            load TEXT,
            unit TEXT NOT NULL,
            load_type TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    connection.execute("""
        CREATE TABLE IF NOT EXISTS account (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            name TEXT NOT NULL,
            salt BLOB NOT NULL,
            password_hash BLOB NOT NULL
        )
    """)
    connection.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            token_hash TEXT PRIMARY KEY,
            expires_at INTEGER NOT NULL,
            remembered INTEGER NOT NULL
        )
    """)
    connection.execute("""
        CREATE TABLE IF NOT EXISTS favorites (
            exercise TEXT PRIMARY KEY COLLATE NOCASE
        )
    """)
    features.ensure_schema(connection)
    return connection


def account_exists(database=DATABASE):
    with closing(connect(database)) as connection:
        return connection.execute("SELECT 1 FROM account WHERE id = 1").fetchone() is not None


def validate_credentials(data, creating=False):
    if not isinstance(data, dict):
        raise ValueError("Send account details as an object.")
    name = data.get("name")
    password = data.get("password")
    remember = data.get("remember", False)
    if not isinstance(name, str) or not 1 <= len(name.strip()) <= 50:
        raise ValueError("Enter a name (up to 50 characters).")
    if not isinstance(password, str) or (creating and not 8 <= len(password) <= 256):
        raise ValueError("Use a password of 8 to 256 characters.")
    if not isinstance(remember, bool):
        raise ValueError("Remember me must be true or false.")
    return name.strip(), password, remember


def new_session(connection, remember):
    token = secrets.token_urlsafe(32)
    lifetime = REMEMBER_SECONDS if remember else SESSION_SECONDS
    connection.execute(
        "INSERT INTO sessions (token_hash, expires_at, remembered) VALUES (?, ?, ?)",
        (hashlib.sha256(token.encode()).hexdigest(), int(time()) + lifetime, int(remember)),
    )
    return token


def create_account(data, database=DATABASE):
    name, password, remember = validate_credentials(data, creating=True)
    salt = secrets.token_bytes(16)
    password_hash = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PASSWORD_ITERATIONS)
    with closing(connect(database)) as connection:
        with connection:
            connection.execute("BEGIN IMMEDIATE")
            if connection.execute("SELECT 1 FROM account WHERE id = 1").fetchone():
                raise ValueError("A local account already exists. Sign in instead.")
            connection.execute(
                "INSERT INTO account (id, name, salt, password_hash) VALUES (1, ?, ?, ?)",
                (name, salt, password_hash),
            )
            token = new_session(connection, remember)
    return name, token, remember


def login_account(data, database=DATABASE):
    name, password, remember = validate_credentials(data)
    with closing(connect(database)) as connection:
        account = connection.execute("SELECT * FROM account WHERE id = 1").fetchone()
        if account is None or account["name"].casefold() != name.casefold():
            raise ValueError("Name or password is incorrect.")
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), account["salt"], PASSWORD_ITERATIONS)
        if not hmac.compare_digest(candidate, account["password_hash"]):
            raise ValueError("Name or password is incorrect.")
        with connection:
            token = new_session(connection, remember)
    return account["name"], token, remember


def get_session(token, database=DATABASE):
    if not token or len(token) > 256:
        return None
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    with closing(connect(database)) as connection:
        row = connection.execute(
            """SELECT account.name, sessions.remembered FROM sessions
               JOIN account ON account.id = 1
               WHERE sessions.token_hash = ? AND sessions.expires_at > ?""",
            (token_hash, int(time())),
        ).fetchone()
    return dict(row) if row else None


def logout_account(token, database=DATABASE):
    if not token:
        return
    with closing(connect(database)) as connection:
        with connection:
            connection.execute("DELETE FROM sessions WHERE token_hash = ?", (hashlib.sha256(token.encode()).hexdigest(),))


def session_cookie(token, remember=False):
    value = f"{COOKIE_NAME}={token}; HttpOnly; SameSite=Strict; Path=/"
    return value + (f"; Max-Age={REMEMBER_SECONDS}" if remember else "")


def validate_set(data):
    if not isinstance(data, dict):
        raise ValueError("Send one set as an object.")

    activity_date = data.get("activity_date")
    try:
        if not isinstance(activity_date, str):
            raise ValueError
        date.fromisoformat(activity_date)
        if date.fromisoformat(activity_date).isoformat() != activity_date:
            raise ValueError
    except ValueError:
        raise ValueError("Choose a valid activity date.") from None

    exercise = data.get("exercise")
    if not isinstance(exercise, str) or not 1 <= len(exercise.strip()) <= 80:
        raise ValueError("Enter an exercise name (up to 80 characters).")

    reps = data.get("reps")
    if type(reps) is not int or not 1 <= reps <= 1000:
        raise ValueError("Reps must be a whole number from 1 to 1000.")

    raw_load = data.get("load")
    if raw_load in (None, ""):
        load = None  # Unknown is different from a measured zero.
    else:
        try:
            load_number = Decimal(str(raw_load))
        except InvalidOperation:
            raise ValueError("Load must be a number or left blank.") from None
        if not load_number.is_finite() or not 0 <= load_number <= 10000:
            raise ValueError("Load must be between 0 and 10000.")
        load = str(load_number)

    unit = data.get("unit")
    if unit not in ("kg", "lb"):
        raise ValueError("Choose kg or lb.")

    load_type = data.get("load_type")
    if load_type not in ("total", "per_hand"):
        raise ValueError("Choose total or per hand.")

    return (activity_date, exercise.strip(), reps, load, unit, load_type)


def save_set(data, database=DATABASE):
    values = validate_set(data)
    created_at = datetime.now(timezone.utc).isoformat()
    with closing(connect(database)) as connection:
        with connection:
            cursor = connection.execute(
                """INSERT INTO sets
                   (activity_date, exercise, reps, load, unit, load_type, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (*values, created_at),
            )
            row = connection.execute("SELECT * FROM sets WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(row)  # The transaction has committed before success is returned.


def list_sets(database=DATABASE, exercise=None):
    with closing(connect(database)) as connection:
        if exercise is None:
            rows = connection.execute(
                "SELECT * FROM sets ORDER BY activity_date DESC, id DESC LIMIT 100"
            ).fetchall()
        else:
            if not isinstance(exercise, str) or not 1 <= len(exercise.strip()) <= 80:
                raise ValueError("Choose a valid exercise.")
            rows = connection.execute(
                """SELECT * FROM sets WHERE exercise = ? COLLATE NOCASE
                   ORDER BY activity_date DESC, id DESC""",
                (exercise.strip(),),
            ).fetchall()
    return [dict(row) for row in rows]


def recent_exercises(database=DATABASE):
    with closing(connect(database)) as connection:
        rows = connection.execute(
            """SELECT * FROM sets
               WHERE id IN (
                   SELECT MAX(id) FROM sets GROUP BY exercise COLLATE NOCASE
               )
               ORDER BY id DESC LIMIT 5"""
        ).fetchall()
    return [dict(row) for row in rows]


def list_exercises(database=DATABASE):
    with closing(connect(database)) as connection:
        rows = connection.execute(
            """SELECT exercise, COUNT(activity_date) AS set_count, MAX(activity_date) AS last_date
               FROM (SELECT exercise, activity_date FROM sets UNION ALL
                     SELECT name AS exercise, NULL AS activity_date FROM custom_exercises)
               GROUP BY exercise COLLATE NOCASE ORDER BY MAX(activity_date) DESC, exercise COLLATE NOCASE"""
        ).fetchall()
    return [dict(row) for row in rows]


def overview(database=DATABASE):
    with closing(connect(database)) as connection:
        totals = connection.execute(
            "SELECT COUNT(*) AS set_count, COUNT(DISTINCT activity_date) AS active_days FROM sets"
        ).fetchone()
        latest = connection.execute(
            "SELECT * FROM sets ORDER BY id DESC LIMIT 3"
        ).fetchall()
    return {"set_count": totals["set_count"], "active_days": totals["active_days"],
            "recent_sets": [dict(row) for row in latest]}


def list_favorites(database=DATABASE):
    with closing(connect(database)) as connection:
        rows = connection.execute("SELECT exercise FROM favorites ORDER BY exercise COLLATE NOCASE").fetchall()
    return [row["exercise"] for row in rows]


def set_favorite(data, database=DATABASE):
    if not isinstance(data, dict) or not isinstance(data.get("exercise"), str):
        raise ValueError("Choose an exercise.")
    exercise = data["exercise"].strip()
    if not 1 <= len(exercise) <= 80 or not isinstance(data.get("favorite"), bool):
        raise ValueError("Choose an exercise and whether it is a favorite.")
    with closing(connect(database)) as connection:
        with connection:
            if data["favorite"]:
                connection.execute("INSERT OR IGNORE INTO favorites (exercise) VALUES (?)", (exercise,))
            else:
                connection.execute("DELETE FROM favorites WHERE exercise = ?", (exercise,))
    return {"favorites": list_favorites(database)}


def export_sets(database=DATABASE):
    with closing(connect(database)) as connection:
        rows = connection.execute(
            "SELECT activity_date, exercise, reps, load, unit, load_type FROM sets ORDER BY id"
        ).fetchall()
    return {"format": "fitnessos-sets", "version": 3,
            "sets": [dict(row) for row in rows], "favorites": list_favorites(database),
            **features.export_extra(database)}


def validate_backup(data):
    if not isinstance(data, dict) or data.get("format") != "fitnessos-sets" or data.get("version") not in (1, 2, 3):
        raise ValueError("This is not a supported FitnessOS set backup.")
    rows = data.get("sets")
    if not isinstance(rows, list) or len(rows) > 10000:
        raise ValueError("The backup must contain at most 10000 sets.")
    favorites = data.get("favorites") if data["version"] >= 2 else []
    if not isinstance(favorites, list) or len(favorites) > 10000 or any(
        not isinstance(name, str) or not 1 <= len(name.strip()) <= 80 for name in favorites
    ):
        raise ValueError("The backup has invalid favorite exercises.")
    if len({name.strip().casefold() for name in favorites}) != len(favorites):
        raise ValueError("The backup has duplicate favorite exercises.")
    extra = features.validate_extra(data) if data["version"] == 3 else features.validate_extra({
        "profile": {}, "body": [], "calories": [], "custom_exercises": [], "workouts": []})
    if not rows and not favorites and not any((extra["body"], extra["calories"], extra["exercises"],
                                               extra["workouts"], any(value is not None for value in extra["profile"]))):
        raise ValueError("The backup contains no records.")
    return [validate_set(row) for row in rows], [name.strip() for name in favorites], extra


def preview_restore(data, database=DATABASE):
    rows, favorites, extra = validate_backup(data)
    with closing(connect(database)) as connection:
        existing = connection.execute("SELECT COUNT(*) FROM sets").fetchone()[0]
        existing_favorites = connection.execute("SELECT COUNT(*) FROM favorites").fetchone()[0]
        existing_other = features.existing_extra(connection)
    dates = [row[0] for row in rows]
    return {
        "import_count": len(rows),
        "existing_count": existing,
        "favorite_count": len(favorites),
        "first_date": min(dates) if dates else None,
        "last_date": max(dates) if dates else None,
        "existing_favorite_count": existing_favorites,
        "body_count": len(extra["body"]), "calorie_count": len(extra["calories"]),
        "workout_count": len(extra["workouts"]), "exercise_count": len(extra["exercises"]),
        "existing_other_count": existing_other,
        "can_restore": existing == 0 and existing_favorites == 0 and existing_other == 0,
    }


def restore_sets(data, database=DATABASE):
    rows, favorites, extra = validate_backup(data)  # Validate everything before starting the write.
    with closing(connect(database)) as connection:
        with connection:
            connection.execute("BEGIN IMMEDIATE")
            if (connection.execute("SELECT COUNT(*) FROM sets").fetchone()[0]
                    or connection.execute("SELECT COUNT(*) FROM favorites").fetchone()[0]
                    or features.existing_extra(connection)):
                raise ValueError("Restore requires empty records and favorites; existing data was kept.")
            created_at = datetime.now(timezone.utc).isoformat()
            connection.executemany(
                """INSERT INTO sets
                   (activity_date, exercise, reps, load, unit, load_type, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                [(*row, created_at) for row in rows],
            )
            connection.executemany("INSERT INTO favorites (exercise) VALUES (?)", [(name,) for name in favorites])
            features.restore_extra(connection, extra, created_at)
    return len(rows)


class Handler(BaseHTTPRequestHandler):
    def send_bytes(self, status, content, content_type, disposition=None, extra_headers=()):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        if disposition:
            self.send_header("Content-Disposition", disposition)
        for name, value in extra_headers:
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(content)

    def send_json(self, status, data, extra_headers=()):
        self.send_bytes(status, json.dumps(data).encode("utf-8"), "application/json; charset=utf-8",
                        extra_headers=extra_headers)

    def redirect(self, location):
        self.send_response(302)
        self.send_header("Location", location)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def valid_host(self):
        port = self.server.server_port
        return self.headers.get("Host") in (f"127.0.0.1:{port}", f"localhost:{port}")

    def session_token(self):
        cookie = SimpleCookie()
        try:
            cookie.load(self.headers.get("Cookie", ""))
        except CookieError:
            return None
        morsel = cookie.get(COOKIE_NAME)
        return morsel.value if morsel else None

    def current_user(self):
        return get_session(self.session_token(), self.server.database)

    def do_GET(self):
        if not self.valid_host():
            self.send_json(403, {"error": "Invalid local host."})
            return
        parsed = urlsplit(self.path)
        path = parsed.path
        try:
            user = self.current_user()
            if path == "/api/auth/status":
                self.send_json(200, {"setup_required": not account_exists(self.server.database),
                                     "authenticated": user is not None,
                                     "name": user["name"] if user else None,
                                     "remembered": bool(user["remembered"]) if user else False})
                return
            if path == "/":
                if not user:
                    self.redirect("/login")
                    return
                self.send_bytes(200, (STATIC / "index.html").read_bytes(), "text/html; charset=utf-8")
                return
            if path == "/login":
                if user:
                    self.redirect("/")
                    return
                self.send_bytes(200, (STATIC / "login.html").read_bytes(), "text/html; charset=utf-8")
                return
            files = {
                "/app.js": ("app.js", "text/javascript; charset=utf-8"),
                "/features.js": ("features.js", "text/javascript; charset=utf-8"),
                "/login.js": ("login.js", "text/javascript; charset=utf-8"),
                "/style.css": ("style.css", "text/css; charset=utf-8"),
            }
            if path in files:
                filename, content_type = files[path]
                self.send_bytes(200, (STATIC / filename).read_bytes(), content_type)
                return
            if path not in ("/api/sets", "/api/recent-exercises", "/api/exercises", "/api/overview",
                            "/api/favorites", "/api/export", "/api/body", "/api/body/stats", "/api/profile",
                            "/api/calories", "/api/make", "/api/calendar", "/api/day"):
                self.send_json(404, {"error": "Not found."})
                return
            if not user:
                self.send_json(401, {"error": "Sign in to continue."})
                return
            if path == "/api/sets":
                query = parse_qs(parsed.query)
                exercise = query.get("exercise", [None])[0]
                self.send_json(200, list_sets(self.server.database, exercise))
            elif path == "/api/recent-exercises":
                self.send_json(200, recent_exercises(self.server.database))
            elif path == "/api/exercises":
                self.send_json(200, list_exercises(self.server.database))
            elif path == "/api/overview":
                self.send_json(200, overview(self.server.database))
            elif path == "/api/favorites":
                self.send_json(200, list_favorites(self.server.database))
            elif path == "/api/body":
                self.send_json(200, features.list_body(self.server.database))
            elif path == "/api/body/stats":
                self.send_json(200, features.body_stats(self.server.database))
            elif path == "/api/profile":
                self.send_json(200, features.get_profile(self.server.database))
            elif path == "/api/calories":
                self.send_json(200, features.list_calories(self.server.database))
            elif path == "/api/make":
                self.send_json(200, features.get_plans(self.server.database))
            elif path == "/api/calendar":
                self.send_json(200, features.calendar_month(parse_qs(parsed.query).get("month", [""])[0], self.server.database))
            elif path == "/api/day":
                self.send_json(200, features.calendar_day(parse_qs(parsed.query).get("date", [""])[0], self.server.database))
            else:
                content = json.dumps(export_sets(self.server.database), indent=2).encode("utf-8")
                self.send_bytes(200, content, "application/json; charset=utf-8",
                                "attachment; filename=fitnessos-backup.json")
        except ValueError as error:
            self.send_json(400, {"error": str(error)})
        except (sqlite3.Error, OSError):
            self.send_json(500, {"error": "Could not load local data. Try again."})

    def do_POST(self):
        if not self.valid_host() or self.headers.get("Origin", f"http://{self.headers.get('Host')}") != f"http://{self.headers.get('Host')}":
            self.send_json(403, {"error": "Invalid local origin."})
            return
        path = urlsplit(self.path).path
        if path not in ("/api/auth/setup", "/api/auth/login", "/api/auth/logout", "/api/sets",
                        "/api/favorites", "/api/restore/preview", "/api/restore", "/api/body",
                        "/api/profile", "/api/calories", "/api/make/exercise", "/api/make/workout",
                        "/api/make/day", "/api/make/day-exercise"):
            self.send_json(404, {"error": "Not found."})
            return
        if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
            self.send_json(415, {"error": "Send JSON with Content-Type: application/json."})
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            limit = 10_000_000 if path.startswith("/api/restore") else 4096
            if not 0 < size <= limit:
                raise ValueError("Request is missing or too large.")
            data = json.loads(self.rfile.read(size))
            if path in ("/api/auth/setup", "/api/auth/login"):
                name, token, remember = (create_account(data, self.server.database)
                                         if path.endswith("setup") else login_account(data, self.server.database))
                self.send_json(201 if path.endswith("setup") else 200, {"name": name},
                               (("Set-Cookie", session_cookie(token, remember)),))
                return
            if path == "/api/auth/logout":
                logout_account(self.session_token(), self.server.database)
                self.send_json(200, {"signed_out": True},
                               (("Set-Cookie", f"{COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"),))
                return
            if not self.current_user():
                self.send_json(401, {"error": "Sign in to continue."})
                return
            if path == "/api/sets":
                result = save_set(data, self.server.database)
                status = 201
            elif path == "/api/favorites":
                result = set_favorite(data, self.server.database)
                status = 200
            elif path == "/api/body":
                result, status = features.save_body(data, self.server.database), 201
            elif path == "/api/profile":
                result, status = features.save_profile(data, self.server.database), 200
            elif path == "/api/calories":
                result, status = features.save_calories(data, self.server.database), 201
            elif path.startswith("/api/make/"):
                result, status = features.make(data, path.rsplit("/", 1)[1], self.server.database), 201
            elif path == "/api/restore/preview":
                result = preview_restore(data, self.server.database)
                status = 200
            else:
                result = {"restored": restore_sets(data, self.server.database),
                          "favorites_restored": len(list_favorites(self.server.database))}
                status = 201
        except ValueError as error:
            self.send_json(400, {"error": str(error)})
            return
        except (sqlite3.Error, OSError):
            self.send_json(500, {"error": "Database operation failed. Nothing was confirmed; try again."})
            return
        self.send_json(status, result)


def main():
    parser = argparse.ArgumentParser(description="Run the local FitnessOS app.")
    parser.add_argument("--database", type=Path, default=DATABASE, help="SQLite database file")
    parser.add_argument("--port", type=int, default=8000, help="localhost port (default: 8000)")
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    server.database = args.database
    print(f"FitnessOS local app: http://127.0.0.1:{args.port}")
    print("Press Ctrl+C to stop. Export and test a backup before relying on saved records.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
