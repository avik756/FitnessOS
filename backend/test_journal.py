import base64
import copy
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

from backend import app, features, journal


class JournalTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=app.ROOT)
        self.database = Path(self.temp.name) / 'journal.sqlite3'
        with closing(app.connect(self.database)):
            pass
        self.day = '2026-11-10'

    def tearDown(self):
        self.temp.cleanup()

    def workout(self):
        plans = features.make({'name': 'Test split'}, 'workout', self.database)
        plans = features.make({'name': 'Day 1', 'workout_id': plans['workouts'][0]['id']}, 'day', self.database)
        day_id = plans['workouts'][0]['days'][0]['id']
        features.make({'exercise': 'Row', 'day_id': day_id}, 'day-exercise', self.database)
        return journal.start_workout({'day_id': day_id, 'activity_date': self.day}, self.database)

    def test_water_undo_and_step_total_are_persistent(self):
        water = journal.save('water', {'activity_date': self.day, 'time': '14:15', 'ml': 250}, self.database)
        journal.save('steps', {'activity_date': self.day, 'count': 0}, self.database)
        journal.save('steps', {'activity_date': self.day, 'count': 1200}, self.database)
        journal.update_state(self.database, water['id'], 'water')
        rows = journal.list_entries(self.database)
        self.assertEqual(len(rows), 2)
        self.assertTrue(next(row for row in rows if row['kind'] == 'water')['data']['undone'])
        self.assertEqual(next(row for row in rows if row['kind'] == 'steps')['data']['count'], 1200)

    def test_sleep_crosses_midnight_and_rejects_bad_intervals(self):
        data = {'activity_date': self.day, 'start': '2026-11-09T23:30', 'end': '2026-11-10T07:00'}
        saved = journal.save('sleep', data, self.database)
        self.assertEqual(saved['data']['minutes'], 450)
        self.assertIsNone(saved['data']['quality'])
        for change in [{'end': '2026-11-09T22:00'}, {'end': '2026-11-12T07:00'}, {'activity_date': '2026-11-09'}]:
            with self.assertRaises(ValueError):
                journal.save('sleep', {**data, **change}, self.database)
        self.assertEqual(len(journal.list_entries(self.database)), 1)

    def test_unknown_ratings_and_meal_times(self):
        row = journal.save('checkin', {'activity_date': self.day, 'bloating': 0, 'mood': None}, self.database)
        self.assertEqual(row['data']['bloating'], 0)
        self.assertIsNone(row['data']['mood'])
        with self.assertRaises(ValueError):
            journal.save('checkin', {'activity_date': self.day}, self.database)
        features.save_calories({'activity_date': self.day, 'label': 'Dal', 'kcal': 200, 'meal_time': '13:30'}, self.database)
        self.assertEqual(features.list_calories(self.database)[0]['meal_time'], '13:30')

    def test_session_sets_keep_snapshot_and_refuse_wrong_or_finished_session(self):
        session = self.workout()
        data = {'activity_date': self.day, 'exercise': 'Row', 'reps': 8, 'load': '20', 'unit': 'kg',
                'load_type': 'total', 'session_id': session['id'], 'session_exercise': 0}
        app.save_set(data, self.database)
        for change in [{'exercise': 'Squat'}, {'activity_date': '2026-11-09'}, {'session_exercise': 1}]:
            with self.assertRaises(ValueError):
                app.save_set({**data, **change}, self.database)
        journal.update_state(self.database, session['id'], 'workout')
        with self.assertRaises(ValueError):
            app.save_set(data, self.database)
        self.assertEqual(len(app.list_sets(self.database)), 1)

    def test_every_new_record_round_trips_and_invalid_backup_is_atomic(self):
        session = self.workout()
        app.save_set({'activity_date': self.day, 'exercise': 'Row', 'reps': 8, 'load': None, 'unit': 'kg',
                     'load_type': 'per_hand', 'session_id': session['id'], 'session_exercise': 0}, self.database)
        samples = {
            'water': {'activity_date': self.day, 'ml': 500},
            'sleep': {'activity_date': self.day, 'start': '2026-11-09T23:00', 'end': '2026-11-10T07:00'},
            'checkin': {'activity_date': self.day, 'bloating': 0, 'energy': 3, 'notes': 'test'},
            'steps': {'activity_date': self.day, 'count': 0},
            'food': {'name': 'Test dal', 'portion': '150 g', 'kcal': 180},
            'photo': {'activity_date': self.day, 'category': 'Test', 'image': base64.b64encode(b'\xff\xd8\xfftest\xff\xd9').decode()},
        }
        for kind, data in samples.items():
            journal.save(kind, data, self.database)
        features.save_calories({'activity_date': self.day, 'label': 'Dal (2 × 150 g)', 'kcal': 360, 'meal_time': '12:00'}, self.database)
        backup = app.export_sets(self.database)
        destination = Path(self.temp.name) / 'restored.sqlite3'
        preview = app.preview_restore(backup, destination)
        self.assertEqual((preview['journal_count'], preview['photo_count']), (7, 1))
        broken = copy.deepcopy(backup)
        broken['journal'][-1]['data']['exercises'] = []
        with self.assertRaises(ValueError):
            app.restore_sets(broken, destination)
        self.assertEqual(app.list_sets(destination), [])
        self.assertEqual(journal.list_entries(destination, photos=True), [])
        app.restore_sets(backup, destination)
        exported = app.export_sets(destination)
        self.assertEqual({row['id']: row for row in exported['journal']}, {row['id']: row for row in backup['journal']})
        self.assertEqual(exported['sets'], backup['sets'])
        self.assertEqual(exported['calories'], backup['calories'])
        self.assertFalse(app.preview_restore(backup, destination)['can_restore'])
        self.assertEqual(len(journal.list_entries(destination)), 6)  # Photos are excluded by default.

    def test_photo_unlock_is_session_bound_expires_and_locks(self):
        _, token, _ = app.create_account({'name': 'Test', 'password': 'local-test-password'}, self.database)
        _, other, _ = app.login_account({'name': 'Test', 'password': 'local-test-password'}, self.database)
        self.assertFalse(app.photo_access(token, self.database))
        with self.assertRaises(ValueError):
            app.photo_access(token, self.database, password='wrong')
        until = app.photo_access(token, self.database, password='local-test-password')
        self.assertTrue(until)
        self.assertFalse(app.photo_access(other, self.database))
        with patch('backend.app.time', return_value=until+1):
            self.assertFalse(app.photo_access(token, self.database))
        app.photo_access(token, self.database, lock=True)
        self.assertFalse(app.photo_access(token, self.database))

    def test_legacy_v3_restores_with_no_journal(self):
        features.save_body({'activity_date': self.day, 'weight': '70', 'weight_unit': 'kg', 'measure_unit': 'cm'}, self.database)
        backup = app.export_sets(self.database)
        backup['version'] = 3
        del backup['journal']
        destination = Path(self.temp.name) / 'old.sqlite3'
        app.restore_sets(backup, destination)
        self.assertEqual(features.list_body(destination)[0]['weight'], '70')
        self.assertEqual(journal.list_entries(destination), [])


if __name__ == '__main__':
    unittest.main()
