"""Regression checks for optional nutrients and user-authored workspace layouts."""
import json
import tempfile
import unittest
from pathlib import Path
from backend import app, features


class WorkspaceNutritionTests(unittest.TestCase):
    def test_pages_blocks_backup_and_invalid_nesting(self):
        with tempfile.TemporaryDirectory() as folder:
            database = Path(folder) / 'pages.sqlite3'
            restored = Path(folder) / 'restored.sqlite3'
            layout = {'theme': 'dark', 'sections': [],
                      'pages': [{'id': 'training', 'title': 'Training'},
                                {'id': 'chest', 'title': 'Chest', 'parent': 'training'}],
                      'blocks': [{'id': 'today', 'page': 'chest', 'kind': 'section', 'title': 'Today'},
                                 {'id': 'sets', 'page': 'chest', 'parent': 'today', 'kind': 'sets', 'exercise': 'Bench'},
                                 {'id': 'note', 'page': 'chest', 'kind': 'text', 'text': 'Keep form steady.'}]}
            features.save_workspace(layout, database)
            app.restore_sets(app.export_sets(database), restored)
            self.assertEqual(features.get_workspace(restored), layout)
            invalid = json.loads(json.dumps(layout))
            invalid['blocks'][0]['parent'] = 'sets'
            with self.assertRaises(ValueError):
                features.save_workspace(invalid, database)
            invalid = json.loads(json.dumps(layout))
            invalid['pages'][0]['parent'] = 'chest'
            with self.assertRaises(ValueError):
                features.save_workspace(invalid, database)
            invalid = json.loads(json.dumps(layout))
            invalid['blocks'][1]['page'] = 'training'
            with self.assertRaises(ValueError):
                features.save_workspace(invalid, database)
            invalid = json.loads(json.dumps(layout))
            invalid['blocks'][1]['kind'] = []
            with self.assertRaises(ValueError):
                features.save_workspace(invalid, database)
            invalid = json.loads(json.dumps(layout))
            invalid['pages'][1]['parent'] = {'id': 'training'}
            with self.assertRaises(ValueError):
                features.save_workspace(invalid, database)
            self.assertEqual(features.get_workspace(database), layout)

    def test_backup_round_trip_keeps_layout_and_unknown_nutrients(self):
        with tempfile.TemporaryDirectory() as folder:
            original = Path(folder) / 'original.sqlite3'
            restored = Path(folder) / 'restored.sqlite3'
            layout = {'theme': 'dark', 'sections': [
                {'id': 'training', 'title': 'Training'},
                {'id': 'gym', 'title': 'Gym', 'parent': 'training'}]}
            features.save_workspace(layout, original)
            features.save_calories({'activity_date': '2026-11-18', 'label': 'Oats',
                                   'kcal': 150, 'nutrition': {'protein': 5, 'source': 'Label'}}, original)
            features.save_calories({'activity_date': '2026-11-18', 'label': 'Old meal',
                                   'kcal': 100}, original)
            app.restore_sets(app.export_sets(original), restored)
            self.assertEqual(features.get_workspace(restored), layout)
            rows = features.list_calories(restored)
            self.assertIsNone(rows[0]['nutrition'])
            nutrition = json.loads(rows[1]['nutrition'])
            self.assertEqual(nutrition['protein'], 5)
            self.assertIsNone(nutrition['fat'])

    def test_bad_nutrients_and_cyclic_layout_leave_saved_data_intact(self):
        with tempfile.TemporaryDirectory() as folder:
            database = Path(folder) / 'records.sqlite3'
            features.save_workspace({'sections': []}, database)
            with self.assertRaises(ValueError):
                features.save_workspace({'sections': [{'id': 'a', 'title': 'A', 'parent': 'a'}]}, database)
            self.assertEqual(features.get_workspace(database), {'sections': []})
            with self.assertRaises(ValueError):
                features.save_calories({'activity_date': '2026-11-18', 'label': 'Bad', 'kcal': 10,
                                       'nutrition': {'protein': float('nan')}}, database)
            self.assertEqual(features.list_calories(database), [])
