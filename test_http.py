import json
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from app import Handler, ROOT


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

    def test_page_save_history_and_export(self):
        with urlopen(self.base + "/") as response:
            self.assertIn(b"Log one set", response.read())

        set_data = {
            "activity_date": "2026-10-23",
            "exercise": "Goblet squat",
            "reps": 8,
            "load": "20",
            "unit": "kg",
            "load_type": "total",
        }
        request = Request(
            self.base + "/api/sets",
            data=json.dumps(set_data).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(request) as response:
            self.assertEqual(response.status, 201)

        with urlopen(self.base + "/api/sets") as response:
            history = json.load(response)
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]["exercise"], "Goblet squat")

        with urlopen(self.base + "/api/export") as response:
            backup = json.load(response)
        self.assertEqual(backup["version"], 1)
        self.assertEqual(len(backup["sets"]), 1)

        preview_request = Request(
            self.base + "/api/restore/preview",
            data=json.dumps(backup).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(preview_request) as response:
            preview = json.load(response)
        self.assertFalse(preview["can_restore"])

        restore_request = Request(
            self.base + "/api/restore",
            data=json.dumps(backup).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with self.assertRaises(HTTPError) as error:
            urlopen(restore_request)
        self.assertEqual(error.exception.code, 400)
        error.exception.close()


if __name__ == "__main__":
    unittest.main()
