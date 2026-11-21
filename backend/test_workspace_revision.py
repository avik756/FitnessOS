"""Workspace concurrency, backup fidelity and bounded linked-view queries."""
import copy
import io
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from backend import app, features, journal


class WorkspaceRevisionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.database = Path(self.temp.name) / 'app.sqlite3'
        self.layout = {'schema_version': 2, 'theme': 'dark', 'font': 'serif',
                       'sections': [], 'pages': [], 'blocks': [], 'density': 'compact',
                       'navigation': ['history', 'home'],
                       'screen_layouts': {'home': {'columns': 2, 'panels': [
                           {'id': 'home-quick', 'hidden': False, 'collapsed': False, 'span': 2},
                           {'id': 'home-sets', 'hidden': False, 'collapsed': False},
                           {'id': 'home-pages', 'hidden': True, 'collapsed': False}]},
                                          'history': {'columns': 2, 'panels': [
                           {'id': 'calendar-month', 'hidden': True, 'collapsed': False},
                           {'id': 'extra', 'kind': 'sets', 'hidden': False}]}}}

    def test_stale_tab_and_legacy_writer_cannot_overwrite(self):
        initial = features.workspace_state(self.database)
        self.assertEqual(initial['revision'], 0)
        first = features.save_workspace_state({'revision': 0, 'workspace': self.layout}, self.database)
        self.assertEqual(first['revision'], 1)
        stale = copy.deepcopy(self.layout)
        stale['theme'] = 'light'
        with self.assertRaises(features.WorkspaceConflict):
            features.save_workspace_state({'revision': 0, 'workspace': stale}, self.database)
        with self.assertRaises(features.WorkspaceConflict):
            features.save_workspace(stale, self.database)
        self.assertEqual(features.workspace_state(self.database), first)
        second = features.save_workspace_state({'revision': 1, 'workspace': stale}, self.database)
        self.assertEqual(second['revision'], 2)

    def test_backup_roundtrip_and_restore_invalidates_old_tab(self):
        features.save_workspace_state({'revision': 0, 'workspace': self.layout}, self.database)
        restored = Path(self.temp.name) / 'restored.sqlite3'
        app.restore_sets(app.export_sets(self.database), restored)
        self.assertEqual(features.get_workspace(restored), self.layout)
        self.assertGreater(features.workspace_state(restored)['revision'], 0)
        with self.assertRaises(features.WorkspaceConflict):
            features.save_workspace_state({'revision': 0, 'workspace': self.layout}, restored)

    def test_invalid_edits_leave_revision_and_layout_unchanged(self):
        features.save_workspace_state({'revision': 0, 'workspace': self.layout}, self.database)
        for edit in ({'density': 'tiny'}, {'navigation': ['home', 'home']},
                     {'screen_layouts': {'history': {'columns': True}}},
                     {'screen_layouts': {'home': {'columns': 2, 'panels': [{'id': 'home-quick', 'span': 3}]}}}):
            invalid = {**self.layout, **edit}
            with self.assertRaises(ValueError):
                features.save_workspace_state({'revision': 1, 'workspace': invalid}, self.database)
        self.assertEqual(features.workspace_state(self.database)['revision'], 1)
        self.assertEqual(features.get_workspace(self.database), self.layout)

    def test_record_views_page_without_duplicates_and_exclude_photos(self):
        for index in range(19):
            app.save_set({'activity_date': '2026-11-19', 'exercise': 'Squat',
                          'reps': index+1, 'load': '20', 'unit': 'kg', 'load_type': 'total'}, self.database)
        first = app.record_view('sets', self.database)
        second = app.record_view('sets', self.database, first['next_cursor'])
        third = app.record_view('sets', self.database, second['next_cursor'])
        ids = [row['id'] for page in (first, second, third) for row in page['rows']]
        self.assertEqual(len(ids), 19)
        self.assertEqual(len(set(ids)), 19)
        self.assertIsNone(third['next_cursor'])
        self.assertEqual(app.record_view('sets', self.database, exercise='No matches')['rows'], [])
        with self.assertRaises(ValueError):
            app.record_view('sets', self.database, before='9' * 40)
        journal.save('water', {'activity_date': '2026-11-19', 'ml': 250}, self.database)
        self.assertEqual([r['kind'] for r in app.record_view('journal', self.database)['rows']], ['water'])
        entry = journal.list_entries(self.database, 'water')[0]
        journal.update_state(self.database, entry['id'], 'water')
        self.assertEqual(app.record_view('journal', self.database)['rows'], [])
        for kind in ('photo', 'account', "sets; DROP TABLE sets"):
            with self.assertRaises(ValueError):
                app.record_view(kind, self.database)

    def test_handler_routes_without_network_transport(self):
        # Exercise the real request handlers when this sandbox cannot open client sockets.
        handler = object.__new__(app.Handler)
        handler.server = SimpleNamespace(database=self.database)
        handler.valid_host = lambda: True
        handler.current_user = lambda: {'name': 'Test'}
        result = []
        handler.send_json = lambda status, data, **kwargs: result.append((status, data))
        handler.send_bytes = lambda status, data, content_type, **kwargs: result.append((status, data))
        handler.path = '/api/workspace/state'
        handler.do_GET()
        self.assertEqual(result[-1], (200, {'workspace': {}, 'revision': 0}))
        body = json.dumps({'revision': 0, 'workspace': self.layout}).encode()
        handler.headers = {'Host': 'localhost', 'Content-Type': 'application/json', 'Content-Length': str(len(body))}
        handler.rfile = io.BytesIO(body)
        handler.do_POST()
        self.assertEqual(result[-1][0], 200)
        handler.rfile = io.BytesIO(body)
        handler.do_POST()
        self.assertEqual(result[-1][0], 409)
        handler.path = '/api/record-view?kind=sets'
        handler.do_GET()
        self.assertEqual(result[-1][0], 200)
        handler.current_user = lambda: None
        handler.do_GET()
        self.assertEqual(result[-1][0], 401)
        for script in ('workspace_store', 'record_views', 'entry_experience', 'screen_layouts'):
            handler.path = f'/{script}.js'
            handler.do_GET()
            self.assertEqual(result[-1][0], 200)


if __name__ == '__main__':
    unittest.main()
