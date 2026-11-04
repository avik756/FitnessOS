import tempfile
import unittest
from pathlib import Path

from backend.app import (ROOT, create_account, export_sets, get_session, list_favorites,
                         list_sets, login_account, logout_account, preview_restore,
                         recent_exercises, restore_sets, save_set, set_favorite)


class SetStorageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=ROOT)
        self.database = Path(self.temp.name) / "sets.sqlite3"
        self.example = {
            "activity_date": "2026-10-23",
            "exercise": "Goblet squat",
            "reps": 8,
            "load": "0",
            "unit": "kg",
            "load_type": "total",
        }

    def tearDown(self):
        self.temp.cleanup()

    def test_saved_row_survives_a_new_connection(self):
        saved = save_set(self.example, self.database)
        history = list_sets(self.database)
        self.assertEqual(history[0]["id"], saved["id"])
        self.assertEqual(history[0]["load"], "0")
        self.assertEqual(history[0]["activity_date"], "2026-10-23")

    def test_unknown_load_is_distinct_from_zero(self):
        self.example["load"] = ""
        save_set(self.example, self.database)
        self.assertIsNone(list_sets(self.database)[0]["load"])

    def test_invalid_set_does_not_add_a_row(self):
        self.example["reps"] = 0
        with self.assertRaises(ValueError):
            save_set(self.example, self.database)
        self.assertEqual(list_sets(self.database), [])

    def test_recent_exercises_use_latest_save_even_for_an_older_activity_date(self):
        save_set(self.example, self.database)
        save_set({**self.example, "exercise": "Deadlift", "reps": 5}, self.database)
        save_set({**self.example, "activity_date": "2026-10-01", "exercise": "goblet squat", "reps": 10}, self.database)
        recent = recent_exercises(self.database)
        self.assertEqual([row["exercise"] for row in recent], ["goblet squat", "Deadlift"])
        self.assertEqual(recent[0]["reps"], 10)

    def test_export_restores_into_an_empty_database(self):
        save_set(self.example, self.database)
        set_favorite({"exercise": "Goblet squat", "favorite": True}, self.database)
        backup = export_sets(self.database)
        self.assertEqual(backup["version"], 3)
        replacement = Path(self.temp.name) / "replacement.sqlite3"
        preview = preview_restore(backup, replacement)
        self.assertEqual(preview["import_count"], 1)
        self.assertEqual(preview["favorite_count"], 1)
        self.assertTrue(preview["can_restore"])
        self.assertEqual(restore_sets(backup, replacement), 1)
        restored = list_sets(replacement)[0]
        self.assertEqual(restored["exercise"], "Goblet squat")
        self.assertEqual(restored["load"], "0")
        self.assertEqual(restored["unit"], "kg")
        self.assertEqual(list_favorites(replacement), ["Goblet squat"])

    def test_restore_refuses_to_replace_existing_sets(self):
        save_set(self.example, self.database)
        backup = export_sets(self.database)
        self.assertFalse(preview_restore(backup, self.database)["can_restore"])
        with self.assertRaisesRegex(ValueError, "empty records"):
            restore_sets(backup, self.database)
        self.assertEqual(len(list_sets(self.database)), 1)

    def test_invalid_backup_never_writes_partial_rows(self):
        backup = {"format": "fitnessos-sets", "version": 1, "sets": [
            self.example, {**self.example, "reps": 0},
        ]}
        with self.assertRaises(ValueError):
            restore_sets(backup, self.database)
        self.assertEqual(list_sets(self.database), [])

    def test_version_one_backup_still_restores(self):
        backup = {"format": "fitnessos-sets", "version": 1, "sets": [self.example]}
        self.assertEqual(restore_sets(backup, self.database), 1)
        self.assertEqual(list_favorites(self.database), [])

    def test_favorite_only_backup_restores_without_inventing_sets(self):
        set_favorite({"exercise": "Goblet squat", "favorite": True}, self.database)
        backup = export_sets(self.database)
        replacement = Path(self.temp.name) / "favorites-only.sqlite3"
        preview = preview_restore(backup, replacement)
        self.assertEqual((preview["import_count"], preview["favorite_count"]), (0, 1))
        self.assertIsNone(preview["first_date"])
        self.assertEqual(restore_sets(backup, replacement), 0)
        self.assertEqual(list_favorites(replacement), ["Goblet squat"])
        self.assertEqual(list_sets(replacement), [])
        with self.assertRaisesRegex(ValueError, "invalid favorite"):
            restore_sets({"format": "fitnessos-sets", "version": 2, "sets": [self.example]}, replacement)

    def test_account_sessions_and_existing_records(self):
        save_set(self.example, self.database)
        name, token, remember = create_account(
            {"name": "Avik", "password": "correct horse", "remember": False}, self.database)
        self.assertEqual((name, remember), ("Avik", False))
        self.assertEqual(get_session(token, self.database)["name"], "Avik")
        self.assertEqual(len(list_sets(self.database)), 1)
        with self.assertRaisesRegex(ValueError, "already exists"):
            create_account({"name": "Other", "password": "long password"}, self.database)
        with self.assertRaisesRegex(ValueError, "incorrect"):
            login_account({"name": "Avik", "password": "wrong"}, self.database)
        _, remembered_token, remembered = login_account(
            {"name": "avik", "password": "correct horse", "remember": True}, self.database)
        self.assertTrue(remembered)
        self.assertEqual(get_session(remembered_token, self.database)["remembered"], 1)
        logout_account(remembered_token, self.database)
        self.assertIsNone(get_session(remembered_token, self.database))


if __name__ == "__main__":
    unittest.main()
