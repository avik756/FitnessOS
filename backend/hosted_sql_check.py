"""Generate a rollback-only Postgres integration check from real domain SQL.

Run with python -m backend.hosted_sql_check. Execute the emitted SQL on a fresh
test project. This does not connect to PostgreSQL or read any personal database.
"""
import json
import sqlite3
import tempfile
from contextlib import closing
from pathlib import Path
from unittest.mock import patch
from backend import app, features, journal
from backend.postgres import translate


def generate():
    statements = []
    original = sqlite3.connect

    def connect(*args, **kwargs):
        connection = original(*args, **kwargs)
        connection.set_trace_callback(statements.append)
        return connection

    with tempfile.TemporaryDirectory() as directory, patch.object(sqlite3, 'connect', connect):
        database = Path(directory) / 'fictional.sqlite3'
        with closing(app.connect(database)):
            pass
        statements.clear()
        payload = dict(activity_date='2026-11-22', exercise='Squat', reps=8, load='40', unit='kg', load_type='total')
        app.save_set(payload, database, 'hosted-check-123456')
        app.save_set(payload, database, 'hosted-check-123456')
        app.set_favorite({'exercise':'Squat', 'favorite':True}, database)
        app.set_favorite({'exercise':'squat', 'favorite':True}, database)
        features.save_profile({'height_cm':'174', 'age_years':25, 'formula_variant':'male'}, database)
        features.save_body({'activity_date':'2026-11-22','weight':'80','weight_unit':'kg','measure_unit':'cm'},database)
        features.save_calories({'activity_date':'2026-11-22','label':'Fictional meal','kcal':400},database)
        features.make({'name':'Fictional exercise'}, 'exercise', database)
        features.make({'name':'Test plan'}, 'workout', database)
        features.make({'name':'Day one','workout_id':1}, 'day', database)
        features.make({'exercise':'Squat','day_id':1}, 'day-exercise', database)
        workout = journal.start_workout({'day_id':1,'activity_date':'2026-11-22'}, database)
        app.save_set({**payload,'session_id':workout['id'],'session_exercise':0}, database)
        water = journal.save('water', {'activity_date':'2026-11-22', 'ml':250}, database)
        journal.update_state(database, water['id'], 'water')
        journal.save('steps', {'activity_date':'2026-11-22', 'count':4000}, database)
        journal.save('steps', {'activity_date':'2026-11-22', 'count':4500}, database)
        features.save_workspace_state({'revision':0,'workspace':{'schema_version':2}},database)
        features.save_workspace_state({'revision':1,'workspace':{'schema_version':2}},database)
        app.list_sets(database, 'squat'); app.recent_exercises(database); app.list_exercises(database)
        app.overview(database); features.calendar_month('2026-11',database); features.calendar_day('2026-11-22',database)
        features.body_stats(database); features.workspace_state(database)
        for kind in ('sets','meals','body','journal','workouts'):
            app.record_view(kind,database)
        backup = app.export_sets(database)
        first = list(statements)
        second_db = Path(directory) / 'restore.sqlite3'
        with closing(app.connect(second_db)):
            pass
        statements.clear()
        app.preview_restore(backup, second_db)
        app.restore_sets(backup,second_db)
        app.export_sets(second_db)
        second = list(statements)

    output = ['BEGIN;', "DO $$ BEGIN IF EXISTS(SELECT FROM fitnessos.sets) OR EXISTS(SELECT FROM fitnessos.journal) OR EXISTS(SELECT FROM fitnessos.workouts) THEN RAISE EXCEPTION 'Run only on an empty test project'; END IF; END $$;",
              "SET LOCAL search_path=fitnessos,pg_catalog;"]
    for owner, queries in [('11111111-1111-4111-8111-111111111111', first), ('22222222-2222-4222-8222-222222222222', second)]:
        # Reproduce the SQLite fixture's numeric IDs for each owner. Rolled back.
        output.append('SET CONSTRAINTS ALL IMMEDIATE;')
        output.append('RESET ROLE;')
        for table in ('sets','body_entries','calorie_entries','workouts','plan_days','day_exercises'):
            output.append(f'ALTER TABLE fitnessos.{table} ALTER COLUMN id RESTART WITH 1;')
        output.append('SET LOCAL ROLE fitnessos_app;')
        output.append('SET CONSTRAINTS ALL DEFERRED;')
        output.append(f"SELECT set_config('fitnessos.user_id','{owner}',true);")
        output.append('DO $check$ BEGIN')
        for query in queries:
            if not query.lstrip().upper().startswith(('SELECT ', 'INSERT ', 'UPDATE ', 'DELETE ')):
                continue
            sql, _ = translate(query)
            output.append('EXECUTE $query$' + sql + '$query$;')
        output.extend([
            "IF (SELECT count(*) FROM sets) != 2 THEN RAISE EXCEPTION 'set count or isolation failed'; END IF;",
            "IF (SELECT count(*) FROM favorites) != 1 THEN RAISE EXCEPTION 'case insensitive favorites failed'; END IF;",
            "IF (SELECT count(*) FROM journal) != 3 THEN RAISE EXCEPTION 'journal update or restore failed'; END IF;",
            'END $check$;'])
    output.extend(["SELECT 'domain SQL, restore, retries and owner separation passed' AS result;", 'ROLLBACK;'])
    return '\n'.join(output)


if __name__ == '__main__':
    print(generate())
