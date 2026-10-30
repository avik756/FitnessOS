"""A local strength-set logger for FitnessOS."""

import argparse
import json
import sqlite3
from contextlib import closing
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent.parent
STATIC = ROOT / "frontend"
DATABASE = ROOT / "databases" / "fitnessos.sqlite3"


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
    return connection


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


def list_sets(database=DATABASE):
    with closing(connect(database)) as connection:
        rows = connection.execute(
            "SELECT * FROM sets ORDER BY activity_date DESC, id DESC LIMIT 100"
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


def export_sets(database=DATABASE):
    with closing(connect(database)) as connection:
        rows = connection.execute(
            "SELECT activity_date, exercise, reps, load, unit, load_type FROM sets ORDER BY id"
        ).fetchall()
    return {"format": "fitnessos-sets", "version": 1, "sets": [dict(row) for row in rows]}


def validate_backup(data):
    if not isinstance(data, dict) or data.get("format") != "fitnessos-sets" or data.get("version") != 1:
        raise ValueError("This is not a FitnessOS set backup (version 1).")
    rows = data.get("sets")
    if not isinstance(rows, list) or not 1 <= len(rows) <= 10000:
        raise ValueError("The backup must contain 1 to 10000 sets.")
    return [validate_set(row) for row in rows]


def preview_restore(data, database=DATABASE):
    rows = validate_backup(data)
    with closing(connect(database)) as connection:
        existing = connection.execute("SELECT COUNT(*) FROM sets").fetchone()[0]
    dates = [row[0] for row in rows]
    return {
        "import_count": len(rows),
        "existing_count": existing,
        "first_date": min(dates),
        "last_date": max(dates),
        "can_restore": existing == 0,
    }


def restore_sets(data, database=DATABASE):
    rows = validate_backup(data)  # Validate everything before starting the write.
    with closing(connect(database)) as connection:
        with connection:
            connection.execute("BEGIN IMMEDIATE")
            if connection.execute("SELECT COUNT(*) FROM sets").fetchone()[0]:
                raise ValueError("Restore requires an empty database; existing sets were kept.")
            created_at = datetime.now(timezone.utc).isoformat()
            connection.executemany(
                """INSERT INTO sets
                   (activity_date, exercise, reps, load, unit, load_type, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                [(*row, created_at) for row in rows],
            )
    return len(rows)


class Handler(BaseHTTPRequestHandler):
    def send_bytes(self, status, content, content_type, disposition=None):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        if disposition:
            self.send_header("Content-Disposition", disposition)
        self.end_headers()
        self.wfile.write(content)

    def send_json(self, status, data):
        self.send_bytes(status, json.dumps(data).encode("utf-8"), "application/json; charset=utf-8")

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/api/sets":
            try:
                self.send_json(200, list_sets(self.server.database))
            except (sqlite3.Error, OSError):
                self.send_json(500, {"error": "Could not load history. Try again."})
            return

        if path == "/api/recent-exercises":
            try:
                self.send_json(200, recent_exercises(self.server.database))
            except (sqlite3.Error, OSError):
                self.send_json(500, {"error": "Could not load recent exercises. Try again."})
            return

        if path == "/api/export":
            try:
                content = json.dumps(export_sets(self.server.database), indent=2).encode("utf-8")
                self.send_bytes(200, content, "application/json; charset=utf-8", "attachment; filename=fitnessos-sets.json")
            except (sqlite3.Error, OSError):
                self.send_json(500, {"error": "Could not export sets. Try again."})
            return

        files = {
            "/": ("index.html", "text/html; charset=utf-8"),
            "/app.js": ("app.js", "text/javascript; charset=utf-8"),
            "/style.css": ("style.css", "text/css; charset=utf-8"),
        }
        if path not in files:
            self.send_json(404, {"error": "Not found."})
            return
        filename, content_type = files[path]
        self.send_bytes(200, (STATIC / filename).read_bytes(), content_type)

    def do_POST(self):
        path = urlsplit(self.path).path
        if path not in ("/api/sets", "/api/restore/preview", "/api/restore"):
            self.send_json(404, {"error": "Not found."})
            return
        if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
            self.send_json(415, {"error": "Send JSON with Content-Type: application/json."})
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            limit = 4096 if path == "/api/sets" else 10_000_000
            if not 0 < size <= limit:
                raise ValueError("Request is missing or too large.")
            data = json.loads(self.rfile.read(size))
            if path == "/api/sets":
                result = save_set(data, self.server.database)
                status = 201
            elif path == "/api/restore/preview":
                result = preview_restore(data, self.server.database)
                status = 200
            else:
                result = {"restored": restore_sets(data, self.server.database)}
                status = 201
        except ValueError as error:
            self.send_json(400, {"error": str(error)})
            return
        except (sqlite3.Error, OSError):
            self.send_json(500, {"error": "Database operation failed. Nothing was confirmed; try again."})
            return
        self.send_json(status, result)


def main():
    parser = argparse.ArgumentParser(description="Run the local FitnessOS set logger.")
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
