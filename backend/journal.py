"""Validated daily records, workout sessions, and private photos (SQLite only)."""

import base64
import binascii
import json
import sqlite3
import uuid
from contextlib import closing
from datetime import datetime, timezone

try:
    from backend import features
except ModuleNotFoundError:
    import features

KINDS = ('water', 'sleep', 'checkin', 'steps', 'food', 'workout', 'photo')
PHOTO_LIMIT = 20_000_000  # Encoded library size; keeps a complete backup manageable.


def ensure_schema(connection):
    connection.execute('''CREATE TABLE IF NOT EXISTS journal (
        id TEXT PRIMARY KEY, kind TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL)''')


def db(database):
    connection = sqlite3.connect(database)
    connection.row_factory = sqlite3.Row
    ensure_schema(connection)
    return connection


def integer(value, label, low, high, optional=False):
    if optional and value in (None, ''):
        return None
    if type(value) is not int or not low <= value <= high:
        raise ValueError(f'{label} must be a whole number from {low} to {high}.')
    return value


def clock(value):
    if value in (None, ''):
        return None
    if not isinstance(value, str) or len(value) != 5:
        raise ValueError('Use a time in HH:MM format.')
    try:
        datetime.strptime(value, '%H:%M')
    except ValueError:
        raise ValueError('Use a valid time.') from None
    return value


def local_datetime(value):
    if not isinstance(value, str) or len(value) != 16:
        raise ValueError('Choose a date and time.')
    try:
        parsed = datetime.strptime(value, '%Y-%m-%dT%H:%M')
    except ValueError:
        raise ValueError('Choose a valid date and time.') from None
    return parsed


def photo_bytes(value):
    if not isinstance(value, str) or len(value) > 2_800_000:
        raise ValueError('Each photo must be under 2 MB.')
    try:
        raw = base64.b64decode(value, validate=True)
    except (ValueError, binascii.Error):
        raise ValueError('Invalid photo data.') from None
    if len(raw) > 2_000_000 or not (raw.startswith(b'\xff\xd8\xff') and raw.endswith(b'\xff\xd9')):
        raise ValueError('Use a JPEG photo under 2 MB.')
    return raw


def validate(kind, data):
    if kind not in KINDS or not isinstance(data, dict):
        raise ValueError('Choose a supported journal entry.')
    if kind == 'food':
        return {'name': features.name(data.get('name'), 'a food name'),
                'portion': features.name(data.get('portion'), 'a portion description'),
                'kcal': integer(data.get('kcal'), 'Calories per portion', 0, 20000)}
    result = {'activity_date': features.valid_date(data.get('activity_date'))}
    if kind in ('water', 'checkin'):
        result['time'] = clock(data.get('time'))
    if kind == 'water':
        result['ml'] = integer(data.get('ml'), 'Water in ml', 1, 5000)
        if type(data.get('undone', False)) is not bool:
            raise ValueError('Invalid undo state.')
        result['undone'] = data.get('undone', False)
    elif kind == 'sleep':
        start, end = local_datetime(data.get('start')), local_datetime(data.get('end'))
        duration = int((end - start).total_seconds() / 60)
        if not 1 <= duration <= 1440 or end.date().isoformat() != result['activity_date']:
            raise ValueError('Wake time must follow bedtime by at most 24 hours, on the selected wake date.')
        result.update(start=data['start'], end=data['end'], minutes=duration,
                      quality=integer(data.get('quality'), 'Sleep quality', 1, 5, True))
    elif kind == 'checkin':
        for key, low, high in [('bloating', 0, 4), ('mood', 1, 5), ('energy', 1, 5)]:
            result[key] = integer(data.get(key), key.capitalize(), low, high, True)
        notes = data.get('notes', '')
        if not isinstance(notes, str) or len(notes) > 1000:
            raise ValueError('Notes must be at most 1000 characters.')
        result['notes'] = notes.strip()
        if all(result[key] is None for key in ('bloating', 'mood', 'energy')):
            raise ValueError('Choose at least one check-in rating.')
    elif kind == 'steps':
        result['count'] = integer(data.get('count'), 'Steps', 0, 200000)
    elif kind == 'workout':
        result['name'] = features.name(data.get('name'), 'a workout name', 180)
        exercises = data.get('exercises')
        if not isinstance(exercises, list) or not 1 <= len(exercises) <= 1000:
            raise ValueError('The workout day needs at least one exercise.')
        result['exercises'] = [features.name(item, 'an exercise name') for item in exercises]
        if data.get('status') not in ('active', 'finished'):
            raise ValueError('Invalid workout state.')
        result['status'] = data['status']
    elif kind == 'photo':
        result['category'] = features.name(data.get('category'), 'a photo category', 50)
        photo_bytes(data.get('image'))
        result['image'] = data['image']
    return result


def list_entries(database, kind=None, photos=False):
    with closing(db(database)) as connection:
        clauses, parameters = [], []
        if kind is not None:
            clauses.append('kind = ?')
            parameters.append(kind)
        if not photos:
            clauses.append("kind != 'photo'")
        where = ' WHERE ' + ' AND '.join(clauses) if clauses else ''
        rows = connection.execute('SELECT * FROM journal' + where + ' ORDER BY created_at DESC, rowid DESC', parameters).fetchall()
    return [dict(id=row['id'], kind=row['kind'], data=json.loads(row['data']), created_at=row['created_at'])
            for row in rows if (kind is None or row['kind'] == kind) and (photos or row['kind'] != 'photo')]


def get_entry(connection, entry_id, kind):
    row = connection.execute('SELECT * FROM journal WHERE id = ? AND kind = ?', (entry_id, kind)).fetchone()
    if not row:
        raise ValueError('That saved entry no longer exists.')
    return json.loads(row['data'])


def save(kind, data, database):
    clean = validate(kind, data)
    with closing(db(database)) as connection, connection:
        connection.execute('BEGIN IMMEDIATE')
        if kind == 'photo':
            total = connection.execute("SELECT COALESCE(SUM(LENGTH(data)), 0) FROM journal WHERE kind = 'photo'").fetchone()[0]
            if total + len(json.dumps(clean)) > PHOTO_LIMIT:
                raise ValueError('The local photo library has reached its 20 MB prototype limit.')
        if kind == 'steps':
            # One explicit total per day. UI calls this out before saving.
            rows = connection.execute("SELECT id, data FROM journal WHERE kind = 'steps'").fetchall()
            for row in rows:
                if json.loads(row['data'])['activity_date'] == clean['activity_date']:
                    connection.execute('UPDATE journal SET data = ? WHERE id = ?', (json.dumps(clean), row['id']))
                    return {'id': row['id'], 'kind': kind, 'data': clean}
        entry_id = str(uuid.uuid4())
        connection.execute('INSERT INTO journal VALUES (?, ?, ?, ?)',
                           (entry_id, kind, json.dumps(clean), datetime.now(timezone.utc).isoformat()))
    return {'id': entry_id, 'kind': kind, 'data': clean}


def update_state(database, entry_id, kind):
    with closing(db(database)) as connection, connection:
        connection.execute('BEGIN IMMEDIATE')
        data = get_entry(connection, entry_id, kind)
        if kind == 'water':
            data['undone'] = True
        elif kind == 'workout':
            data['status'] = 'finished'
        else:
            raise ValueError('Unsupported update.')
        connection.execute('UPDATE journal SET data = ? WHERE id = ?', (json.dumps(data), entry_id))
    return {'id': entry_id, 'kind': kind, 'data': data}


def start_workout(data, database):
    day_id = integer(data.get('day_id'), 'Day', 1, 2**63 - 1)
    for workout in features.get_plans(database)['workouts']:
        for day in workout['days']:
            if day['id'] == day_id:
                return save('workout', {'activity_date': data.get('activity_date'),
                    'name': workout['name'] + ' · ' + day['name'], 'exercises': day['exercises'],
                    'status': 'active'}, database)
    raise ValueError('Choose a saved workout day.')


def validate_backup(rows):
    if not isinstance(rows, list) or len(rows) > 20000:
        raise ValueError('Invalid journal backup (maximum 20000 entries).')
    clean, ids, step_dates = [], set(), set()
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError('Invalid journal record.')
        entry_id = row.get('id')
        if not isinstance(entry_id, str) or len(entry_id) != 36 or entry_id in ids:
            raise ValueError('Invalid or duplicate journal ID.')
        try:
            uuid.UUID(entry_id)
            stamp = datetime.fromisoformat(row.get('created_at', ''))
            if stamp.tzinfo is None:
                raise ValueError
        except (ValueError, TypeError):
            raise ValueError('Invalid journal ID or creation time.') from None
        ids.add(entry_id)
        data = validate(row.get('kind'), row.get('data'))
        if row['kind'] == 'steps':
            if data['activity_date'] in step_dates:
                raise ValueError('Duplicate daily step totals.')
            step_dates.add(data['activity_date'])
        clean.append({'id': entry_id, 'kind': row['kind'], 'data': data, 'created_at': row['created_at']})
    if sum(len(json.dumps(row['data'])) for row in clean if row['kind'] == 'photo') > PHOTO_LIMIT:
        raise ValueError('Photo backup exceeds the 20 MB library limit.')
    return clean


def restore(connection, rows):
    connection.executemany('INSERT INTO journal VALUES (?, ?, ?, ?)',
        [(row['id'], row['kind'], json.dumps(row['data']), row['created_at']) for row in rows])
