import json
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from backend.app import Handler, ROOT


class LocalHttpTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=ROOT)
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.server.database = Path(self.temp.name) / "http-test.sqlite3"
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base = f"http://127.0.0.1:{self.server.server_port}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def get(self, path, cookie=None):
        headers = {"Cookie": cookie} if cookie else {}
        return urlopen(Request(self.base + path, headers=headers))

    def post(self, path, data, cookie=None):
        headers = {"Content-Type": "application/json"}
        if cookie:
            headers["Cookie"] = cookie
        return urlopen(Request(
            self.base + path, data=json.dumps(data).encode("utf-8"),
            headers=headers, method="POST",
        ))

    def setup_account(self, remember=False):
        with self.post("/api/auth/setup", {
            "name": "Avik", "password": "correct horse", "remember": remember,
        }) as response:
            self.assertEqual(response.status, 201)
            cookie_header = response.headers["Set-Cookie"]
        return cookie_header.split(";", 1)[0], cookie_header

    def test_login_remember_and_protected_routes(self):
        with self.get("/") as response:
            self.assertIn(b'id="auth-form"', response.read())
            self.assertEqual(response.url, self.base + "/login")
        with self.assertRaises(HTTPError) as error:
            self.get("/api/sets")
        self.assertEqual(error.exception.code, 401)
        error.exception.close()

        cookie, header = self.setup_account()
        self.assertNotIn("Max-Age", header)
        self.assertIn("HttpOnly", header)
        self.assertIn("SameSite=Strict", header)
        with self.get("/", cookie) as response:
            self.assertIn(b"Move, record, return.", response.read())
        with self.get("/app.js") as response:
            self.assertIn(b"loadRecentExercises", response.read())
        with self.get("/login.js") as response:
            self.assertIn(b"showAuthForm", response.read())
        with self.get("/style.css") as response:
            self.assertIn(b".mobile-nav", response.read())

        with self.post("/api/auth/logout", {}, cookie) as response:
            self.assertIn("Max-Age=0", response.headers["Set-Cookie"])
        with self.assertRaises(HTTPError) as error:
            self.get("/api/overview", cookie)
        self.assertEqual(error.exception.code, 401)
        error.exception.close()
        with self.post("/api/auth/login", {
            "name": "Avik", "password": "correct horse", "remember": True,
        }) as response:
            self.assertIn("Max-Age=", response.headers["Set-Cookie"])

    def test_save_filter_favorite_and_backup(self):
        cookie, _ = self.setup_account()
        first_set = {
            "activity_date": "2026-10-23", "exercise": "Goblet squat",
            "reps": 8, "load": "20", "unit": "kg", "load_type": "total",
        }
        with self.post("/api/sets", first_set, cookie) as response:
            self.assertEqual(response.status, 201)
        with self.post("/api/sets", {**first_set, "exercise": "Dumbbell row"}, cookie):
            pass
        with self.get("/api/sets?exercise=Goblet%20squat", cookie) as response:
            history = json.load(response)
        self.assertEqual([row["exercise"] for row in history], ["Goblet squat"])
        with self.get("/api/overview", cookie) as response:
            overview = json.load(response)
        self.assertEqual((overview["set_count"], overview["active_days"]), (2, 1))
        with self.get("/api/exercises", cookie) as response:
            exercises = json.load(response)
        self.assertEqual(len(exercises), 2)
        with self.post("/api/favorites", {"exercise": "Goblet squat", "favorite": True}, cookie) as response:
            self.assertEqual(json.load(response)["favorites"], ["Goblet squat"])
        with self.get("/api/export", cookie) as response:
            backup = json.load(response)
        self.assertEqual(backup["version"], 2)
        self.assertEqual(len(backup["sets"]), 2)
        self.assertEqual(backup["favorites"], ["Goblet squat"])
        with self.post("/api/restore/preview", backup, cookie) as response:
            self.assertFalse(json.load(response)["can_restore"])
        with self.assertRaises(HTTPError) as error:
            self.post("/api/restore", backup, cookie)
        self.assertEqual(error.exception.code, 400)
        error.exception.close()


if __name__ == "__main__":
    unittest.main()
