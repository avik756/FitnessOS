import tempfile
import unittest
import sqlite3
from contextlib import closing
from pathlib import Path

from backend.app import ROOT, export_sets, list_sets, preview_restore, restore_sets, save_set
from backend import features


class FeatureTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=ROOT)
        self.database = Path(self.temp.name) / "features.sqlite3"

    def tearDown(self):
        self.temp.cleanup()

    def test_body_units_stats_and_calendar(self):
        features.save_profile({"height_cm": "180", "age_years": 30, "formula_variant": "male"}, self.database)
        features.save_body({"activity_date": "2026-11-05", "weight": "220.462262", "weight_unit": "lb",
                            "body_fat_pct": "20", "waist": "35", "measure_unit": "in"}, self.database)
        features.save_calories({"activity_date": "2026-11-05", "label": "Lunch", "kcal": 650}, self.database)
        save_set({"activity_date": "2026-11-05", "exercise": "Squat", "reps": 5,
                  "load": "50", "unit": "kg", "load_type": "total"}, self.database)
        stats = features.body_stats(self.database)
        self.assertAlmostEqual(float(features.weight_kg(stats["latest_weight"])), 100, places=3)
        self.assertEqual(stats["bmi"], 30.9)
        self.assertEqual(stats["rmr_kcal"], 1980)
        self.assertEqual(stats["latest_body_fat"]["body_fat_pct"], "20")
        features.save_profile({"height_cm": "180", "age_years": 80, "formula_variant": "male"}, self.database)
        self.assertIsNone(features.body_stats(self.database)["rmr_kcal"])
        self.assertEqual(features.calendar_month("2026-11", self.database)["2026-11-05"],
                         {"sets": 1, "body": 1, "calories": 1})
        day = features.calendar_day("2026-11-05", self.database)
        self.assertEqual((len(day["sets"]), len(day["body"]), len(day["calories"])), (1, 1, 1))

    def test_templates_and_complete_backup_round_trip(self):
        features.save_profile({"height_cm": "175", "age_years": None, "formula_variant": None}, self.database)
        features.save_body({"activity_date": "2026-11-04", "weight": "71.5", "weight_unit": "kg",
                            "body_fat_pct": "", "measure_unit": "cm"}, self.database)
        features.save_calories({"activity_date": "2026-11-04", "label": "Breakfast", "kcal": 400}, self.database)
        plans = features.make({"name": "Incline press"}, "exercise", self.database)
        self.assertEqual(plans["exercises"], ["Incline press"])
        plans = features.make({"name": "Split"}, "workout", self.database)
        workout_id = plans["workouts"][0]["id"]
        plans = features.make({"name": "Chest Day 1", "workout_id": workout_id}, "day", self.database)
        day_id = plans["workouts"][0]["days"][0]["id"]
        features.make({"day_id": day_id, "exercise": "Incline press"}, "day-exercise", self.database)
        backup = export_sets(self.database)
        replacement = Path(self.temp.name) / "replacement.sqlite3"
        preview = preview_restore(backup, replacement)
        self.assertTrue(preview["can_restore"])
        self.assertEqual((preview["body_count"], preview["calorie_count"], preview["workout_count"]), (1, 1, 1))
        self.assertEqual(restore_sets(backup, replacement), 0)
        self.assertEqual(features.get_profile(replacement)["height_cm"], "175")
        self.assertEqual(features.list_body(replacement)[0]["weight"], "71.5")
        self.assertEqual(features.list_calories(replacement)[0]["kcal"], 400)
        self.assertEqual(features.get_plans(replacement)["workouts"][0]["days"][0]["exercises"], ["Incline press"])
        self.assertFalse(preview_restore(backup, replacement)["can_restore"])
        with self.assertRaises(ValueError):
            restore_sets(backup, replacement)

    def test_invalid_entry_does_not_write(self):
        with self.assertRaises(ValueError):
            features.save_body({"activity_date": "2026-11-05", "weight": "", "weight_unit": "kg",
                                "measure_unit": "cm"}, self.database)
        self.assertEqual(features.list_body(self.database), [])
        with self.assertRaises(ValueError):
            features.save_calories({"activity_date": "2026-11-05", "label": "Lunch", "kcal": -1}, self.database)
        self.assertEqual(features.list_calories(self.database), [])

    def test_existing_set_database_is_extended_without_losing_sets(self):
        with closing(sqlite3.connect(self.database)) as connection:
            with connection:
                connection.execute("""CREATE TABLE sets (
                    id INTEGER PRIMARY KEY, activity_date TEXT NOT NULL, exercise TEXT NOT NULL,
                    reps INTEGER NOT NULL, load TEXT, unit TEXT NOT NULL,
                    load_type TEXT NOT NULL, created_at TEXT NOT NULL)""")
                connection.execute("""INSERT INTO sets
                    (activity_date, exercise, reps, load, unit, load_type, created_at)
                    VALUES ('2026-10-30', 'Row', 8, '25', 'kg', 'total', '2026-10-30T12:00:00Z')""")
        features.save_body({"activity_date": "2026-11-05", "weight": "72", "weight_unit": "kg",
                            "measure_unit": "cm"}, self.database)
        self.assertEqual(list_sets(self.database)[0]["exercise"], "Row")
        self.assertEqual(features.list_body(self.database)[0]["weight"], "72")


if __name__ == "__main__":
    unittest.main()
