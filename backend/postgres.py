"""PostgreSQL storage for the existing domain functions; SQLite stays local-only.

Only trusted, repository-owned SQL goes through this small dialect adapter.
Every connection uses a restricted role and a transaction-local verified owner.
No SQLite files or database snapshots are used in hosted mode.
"""
import re
import sqlite3
import uuid
from dataclasses import dataclass
from pathlib import Path


SUPABASE_CA = Path(__file__).with_name('supabase-ca.crt')


@dataclass(frozen=True)
class PostgresDatabase:
    dsn: str
    user_id: str

    def connect(self):
        return Connection(self.dsn, str(uuid.UUID(self.user_id)))


class Row(dict):
    def __getitem__(self, key):
        return tuple(self.values())[key] if isinstance(key, int) else super().__getitem__(key)


class Cursor:
    def __init__(self, cursor, inserted=False):
        self.cursor = cursor
        self.lastrowid = cursor.fetchone()[0] if inserted else None

    def _row(self, values):
        if values is None:
            return None
        return Row((col.name, value) for col, value in zip(self.cursor.description, values)
                   if col.name != 'user_id')

    def fetchone(self):
        return self._row(self.cursor.fetchone())

    def fetchall(self):
        return [self._row(row) for row in self.cursor.fetchall()]

    def __iter__(self):
        return iter(self.fetchall())


IMPLICIT_COLUMNS = {
    'journal': 'id, kind, data, created_at',
    'workspace': 'id, data',
    'workspace_meta': 'id, revision',
    'set_requests': 'request_id, payload, result',
}
GENERATED_IDS = {'sets', 'body_entries', 'calorie_entries', 'workouts', 'plan_days', 'day_exercises'}


def translate(query):
    """Translate the limited SQLite idioms used by our domain modules."""
    query = query.strip().rstrip(';')
    if query.upper() == 'BEGIN IMMEDIATE':
        return None, False
    query = query.replace(' COLLATE NOCASE', '')
    query = re.sub(r'\browid\b', 'sort_id' if re.search(r'\bFROM journal\b', query, re.I) else 'id', query)
    query = query.replace("COALESCE(json_extract(data, '$.undone'), 0) = 0",
                          "COALESCE((data::jsonb ->> 'undone')::boolean, false) = false")
    query = query.replace('ON CONFLICT(id)', 'ON CONFLICT(user_id, id)')
    query = query.replace('revision=revision+1', 'revision=workspace_meta.revision+1')
    query = query.replace('?', '%s')
    replace = query.upper().startswith('INSERT OR REPLACE INTO ')
    ignore = query.upper().startswith('INSERT OR IGNORE INTO ')
    query = query.replace('INSERT OR REPLACE INTO ', 'INSERT INTO ').replace('INSERT OR IGNORE INTO ', 'INSERT INTO ')
    match = re.match(r'INSERT INTO (\w+)\b', query, re.I)
    table = match.group(1) if match else None
    if table in IMPLICIT_COLUMNS:
        query = re.sub(rf'INSERT INTO {table}\s+VALUES',
                       f'INSERT INTO {table} ({IMPLICIT_COLUMNS[table]}) VALUES', query, flags=re.I)
    if replace:
        columns = re.search(r'INSERT INTO \w+\s*\(([^)]+)\)', query).group(1)
        updates = ', '.join(f'{column.strip()}=EXCLUDED.{column.strip()}'
                            for column in columns.split(',') if column.strip() != 'id')
        query += ' ON CONFLICT(user_id, id) DO UPDATE SET ' + updates
    if ignore:
        query += ' ON CONFLICT DO NOTHING'
    inserted = table in GENERATED_IDS
    if inserted:
        query += ' RETURNING id'
    return query, inserted


class Connection:
    def __init__(self, dsn, user_id):
        import psycopg
        if not SUPABASE_CA.is_file():
            raise sqlite3.OperationalError(
                'Supabase CA certificate missing at backend/supabase-ca.crt. '
                'Download it from the project Database Settings before connecting.')
        self.driver = psycopg
        self.owner = user_id
        self.locked = False
        self.raw = None
        try:
            self.raw = psycopg.connect(dsn, connect_timeout=10, prepare_threshold=None,
                                      sslmode='verify-full', sslrootcert=str(SUPABASE_CA))
            role = self.raw.execute('SELECT current_user, rolbypassrls, rolsuper FROM pg_roles WHERE rolname=current_user').fetchone()
            if role != ('fitnessos_app', False, False):
                raise sqlite3.OperationalError('Hosted storage requires the restricted fitnessos_app role.')
            self.raw.execute("SELECT set_config('search_path', 'fitnessos,pg_catalog', true), "
                             "set_config('fitnessos.user_id', %s, true), "
                             "set_config('statement_timeout', '15000', true)", (user_id,))
        except Exception:
            if self.raw is not None:
                self.raw.close()
            raise sqlite3.OperationalError('Hosted database connection failed.') from None

    def execute(self, query, values=()):
        sql, inserted = translate(query)
        if sql is None:
            self._lock()
            return None
        try:
            return Cursor(self.raw.execute(sql, values or None), inserted)
        except self.driver.IntegrityError:
            raise sqlite3.IntegrityError('The record conflicts with existing data or ownership rules.') from None
        except self.driver.errors.InsufficientPrivilege:
            # RLS rejects a row with another owner using SQLSTATE 42501, not a
            # PostgreSQL constraint error. Preserve the SQLite-side denial contract.
            raise sqlite3.IntegrityError('The record conflicts with existing data or ownership rules.') from None
        except self.driver.Error:
            raise sqlite3.OperationalError('Hosted database operation failed.') from None

    def executemany(self, query, rows):
        for row in rows:
            self.execute(query, row)

    def _lock(self):
        if not self.locked:
            # Serialize this owner's writes, including idempotent retries and first-layout saves.
            try:
                self.raw.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))', (self.owner,))
            except self.driver.Error:
                raise sqlite3.OperationalError('Hosted data is busy. Keep the draft and retry.') from None
            self.locked = True

    def __enter__(self):
        self._lock()
        return self

    def __exit__(self, kind, value, traceback):
        try:
            self.raw.rollback() if kind else self.raw.commit()
        except self.driver.Error:
            raise sqlite3.OperationalError('Hosted commit was not confirmed. Retry with the same request ID.') from None

    def close(self):
        self.raw.close()
