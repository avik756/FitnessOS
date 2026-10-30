import tempfile
import unittest
from pathlib import Path

from backend.app import ROOT, export_sets, list_sets, preview_restore, recent_exercises, restore_sets, save_set


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
        backup = export_sets(self.database)
        replacement = Path(self.temp.name) / "replacement.sqlite3"
        preview = preview_restore(backup, replacement)
        self.assertEqual(preview["import_count"], 1)
        self.assertTrue(preview["can_restore"])
        self.assertEqual(restore_sets(backup, replacement), 1)
        restored = list_sets(replacement)[0]
        self.assertEqual(restored["exercise"], "Goblet squat")
        self.assertEqual(restored["load"], "0")
        self.assertEqual(restored["unit"], "kg")

    def test_restore_refuses_to_replace_existing_sets(self):
        save_set(self.example, self.database)
        backup = export_sets(self.database)
        self.assertFalse(preview_restore(backup, self.database)["can_restore"])
        with self.assertRaisesRegex(ValueError, "empty database"):
            restore_sets(backup, self.database)
        self.assertEqual(len(list_sets(self.database)), 1)

    def test_invalid_backup_never_writes_partial_rows(self):
        backup = {"format": "fitnessos-sets", "version": 1, "sets": [
            self.example, {**self.example, "reps": 0},
        ]}
        with self.assertRaises(ValueError):
            restore_sets(backup, self.database)
        self.assertEqual(list_sets(self.database), [])


if __name__ == "__main__":
    unittest.main()
