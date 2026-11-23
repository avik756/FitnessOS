"""Real restricted-role integration checks. Set FITNESSOS_TEST_DATABASE_URL explicitly.

Uses random fictional owners and deletes only those owners' test records afterward.
Never uses SQLite or administrator credentials as a substitute for this test.
"""
import os
import sqlite3
import unittest
import uuid
from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
from backend import app, features, journal
from backend.postgres import PostgresDatabase


@unittest.skipUnless(os.environ.get('FITNESSOS_TEST_DATABASE_URL'), 'Restricted PostgreSQL test connection is not configured')
class PostgresIntegrationTests(unittest.TestCase):
    def setUp(self):
        dsn = os.environ['FITNESSOS_TEST_DATABASE_URL']
        self.a = PostgresDatabase(dsn, str(uuid.uuid4()))
        self.b = PostgresDatabase(dsn, str(uuid.uuid4()))
        self.payload = dict(activity_date='2026-11-22',exercise='Fictional squat',reps=8,load='40',unit='kg',load_type='total')
        self.addCleanup(self.cleanup_records)

    def cleanup_records(self):
        for database in (self.a, self.b):
            with closing(database.connect()) as connection, connection:
                for table in ('set_requests','sets','day_exercises','plan_days','workouts','journal',
                              'favorites','body_entries','calorie_entries','profile','custom_exercises','workspace','workspace_meta'):
                    connection.execute(f'DELETE FROM {table} WHERE user_id = ?', (database.user_id,))

    def test_retry_concurrency_and_account_isolation(self):
        with ThreadPoolExecutor(max_workers=2) as pool:
            rows = list(pool.map(lambda _:app.save_set(self.payload,self.a,'same-request-123456'),range(2)))
        self.assertEqual(rows[0], rows[1])
        self.assertEqual(len(app.list_sets(self.a)),1)
        self.assertEqual(app.list_sets(self.b),[])
        with closing(self.b.connect()) as connection, connection:
            connection.execute('UPDATE sets SET reps=99 WHERE id=?',(rows[0]['id'],))
            connection.execute('DELETE FROM sets WHERE id=?',(rows[0]['id'],))
        self.assertEqual(app.list_sets(self.a)[0]['reps'],8)
        with self.assertRaises(sqlite3.IntegrityError):
            with closing(self.b.connect()) as connection, connection:
                connection.execute('INSERT INTO favorites (user_id,exercise) VALUES (?,?)',(self.a.user_id,'Forged'))
        self.assertNotIn('Forged', app.list_favorites(self.a))
        self.assertNotIn('Forged', app.list_favorites(self.b))
        app.save_set(self.payload,self.b,'same-request-123456')
        self.assertEqual(len(app.list_sets(self.b)),1)
        with self.assertRaises(ValueError):
            app.save_set({**self.payload,'reps':9},self.a,'same-request-123456')

    def test_cross_account_relationship_and_backup_restore(self):
        plan = features.make({'name':'Fictional plan'},'workout',self.a)['workouts'][0]
        with self.assertRaises(ValueError):
            features.make({'name':'Bad day','workout_id':plan['id']},'day',self.b)
        with self.assertRaises(sqlite3.IntegrityError):
            with closing(self.b.connect()) as connection, connection:
                connection.execute('INSERT INTO plan_days (workout_id,name) VALUES (?,?)',(plan['id'],'Forged parent'))
        app.save_set(self.payload,self.a)
        journal.save('water', {'activity_date':'2026-11-22','ml':250},self.a)
        backup = app.export_sets(self.a)
        self.assertTrue(app.preview_restore(backup,self.b)['can_restore'])
        app.restore_sets(backup,self.b)
        self.assertEqual(app.export_sets(self.b),backup)
        with self.assertRaises(ValueError):
            app.restore_sets(backup,self.b)
        self.assertEqual(len(app.list_sets(self.b)),1)

    def test_concurrent_workspace_saves_have_one_winner(self):
        def save(_):
            try:
                return features.save_workspace_state({'revision':0,'workspace':{'schema_version':2}},self.a)
            except features.WorkspaceConflict:
                return 'conflict'
        with ThreadPoolExecutor(max_workers=2) as pool:
            results=list(pool.map(save,range(2)))
        self.assertEqual(results.count('conflict'),1)
        self.assertEqual(features.workspace_state(self.a)['revision'],1)
        self.assertEqual(features.workspace_state(self.b)['revision'],0)


if __name__=='__main__':
    unittest.main()
