"""Hosted request-boundary checks without requiring local network sockets."""
import io
import json
import os
import unittest
from unittest.mock import patch
from backend import hosted
from backend.postgres import translate

USER = {'id': '11111111-1111-4111-8111-111111111111', 'email': 'owner@example.test',
        'email_confirmed_at': '2026-11-22T00:00:00Z'}


class HostedTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {'FITNESSOS_ORIGIN': 'https://fitness.example',
            'FITNESSOS_ALLOWED_EMAILS': 'owner@example.test', 'FITNESSOS_DATABASE_URL': 'test-only'})
        self.env.start()
        self.addCleanup(self.env.stop)

    def handler(self, path, body=None, cookie=''):
        h = object.__new__(hosted.HostedHandler)
        h.path = path
        h.headers = {'Host': 'fitness.example', 'Origin': 'https://fitness.example',
                     'Cookie': cookie, 'Content-Type': 'application/json'}
        raw = json.dumps(body if body is not None else {}).encode()
        h.headers['Content-Length'] = str(len(raw))
        h.rfile = io.BytesIO(raw)
        self.responses = []
        h.send_json = lambda status, data, **kw: self.responses.append((status, data))
        h.send_bytes = lambda status, data, mime, **kw: self.responses.append((status, mime))
        h._prepare()
        return h

    def test_identity_requires_verified_invited_email(self):
        self.assertEqual(hosted.allowed_user(USER)['id'], USER['id'])
        for changes in ({'email': 'other@example.test'}, {'email_confirmed_at': None},
                        {'is_anonymous': True}, {'id': 'invalid'}, {'email': None}):
            with self.assertRaises(hosted.AuthError):
                hosted.allowed_user({**USER, **changes})

    def test_exact_origin_and_forwarded_headers(self):
        h = self.handler('/')
        self.assertTrue(h.valid_origin())
        for origin in ('https://evil.example', 'null', 'http://fitness.example', None):
            h.headers['Origin'] = origin
            h.headers['X-Forwarded-Host'] = 'fitness.example'
            self.assertFalse(h.valid_origin())

    def test_local_setup_is_never_exposed(self):
        h = self.handler('/api/auth/setup', {'name': 'attacker', 'password': 'password'})
        h.do_POST()
        self.assertEqual(self.responses[-1][0], 403)

    def test_anonymous_api_denied_and_static_assets_public(self):
        h = self.handler('/api/sets'); h.do_GET()
        self.assertEqual(self.responses[-1][0], 401)
        h = self.handler('/mobile.css')
        with patch.object(hosted, 'auth_request', side_effect=AssertionError('Static asset used auth')):
            h.do_GET()
        self.assertEqual(self.responses[-1][0], 200)

    def test_forged_owner_does_not_choose_database(self):
        h = self.handler('/api/auth/status', {'user_id': 'attacker'}, hosted.ACCESS + '=valid')
        with patch.object(hosted, 'auth_request', return_value=USER):
            user = h.current_user()
        self.assertEqual(h.server.database.user_id, USER['id'])
        self.assertEqual(user['draft_scope'], USER['id'])

    def test_expired_access_refreshes_then_revalidates(self):
        h = self.handler('/', cookie=hosted.ACCESS + '=expired; ' + hosted.REFRESH + '=refresh')
        with patch.object(hosted, 'auth_request', side_effect=[hosted.AuthError('expired'),
                {'access_token': 'new', 'refresh_token': 'new-refresh'}, USER]) as provider:
            self.assertEqual(h.current_user()['id'], USER['id'])
            self.assertEqual(provider.call_count, 3)
        self.assertTrue(all('Secure; HttpOnly; SameSite=Lax; Path=/' in value for _, value in h._cookies_out))

    def test_rejected_refresh_identity_cannot_access_records(self):
        h = self.handler('/', cookie=hosted.ACCESS + '=expired; ' + hosted.REFRESH + '=refresh')
        with patch.object(hosted, 'auth_request', side_effect=[hosted.AuthError('expired'),
                {'access_token': 'new', 'refresh_token': 'new-refresh'}, {**USER, 'email':'other@example.test'}]):
            self.assertIsNone(h.current_user())
        self.assertIsNone(h.server.database)

    def test_uninvited_email_sends_nothing(self):
        h = self.handler('/api/auth/email', {'email':'other@example.test'})
        with patch.object(hosted, 'auth_request') as provider:
            h.do_POST()
            provider.assert_not_called()
        self.assertEqual(self.responses[-1][0], 403)

    def test_photos_and_large_restore_are_blocked(self):
        for path in ('/api/photos', '/api/photos/unlock', '/api/photos/lock'):
            h = self.handler(path)
            h.do_POST()
            self.assertEqual(self.responses[-1][0], 403)
        h = self.handler('/api/restore')
        h.headers['Content-Length'] = '3500001'
        h.do_POST()
        self.assertEqual(self.responses[-1][0], 413)
        h = self.handler('/api/restore/preview', {'journal':[{'kind':'photo'}]})
        h.do_POST()
        self.assertEqual(self.responses[-1][0], 400)

    def test_sql_keeps_owner_conflicts_and_journal_cursor(self):
        sql, _ = translate('INSERT OR REPLACE INTO workspace VALUES (1, ?)')
        self.assertIn('ON CONFLICT(user_id, id)', sql)
        self.assertIn('(id, data)', sql)
        self.assertIn('sort_id', translate('SELECT rowid AS cursor, * FROM journal ORDER BY rowid DESC')[0])
        self.assertNotIn('RETURNING', translate('INSERT INTO journal VALUES (?, ?, ?, ?)')[0])
        self.assertIn('RETURNING id', translate('INSERT INTO sets (reps) VALUES (?)')[0])


if __name__ == '__main__':
    unittest.main()
