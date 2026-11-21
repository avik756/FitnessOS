"""Phone access boundaries, static install assets, and lost-reply retry safety."""
import io
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from concurrent.futures import ThreadPoolExecutor
from backend import app


class PhoneTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.database = Path(self.temp.name) / 'phone.sqlite3'
        self.payload = dict(activity_date='2026-11-21', exercise='Squat', reps=8,
                            load='40', unit='kg', load_type='total')

    def handler(self):
        handler = object.__new__(app.Handler)
        handler.server = SimpleNamespace(database=self.database, server_port=8011,
                                         allowed_hosts={'localhost:8011', '192.168.1.8:8011'})
        handler.headers = {'Host': 'localhost:8011'}
        handler.client_address = ('127.0.0.1', 50000)
        handler.current_user = lambda: {'name': 'Demo', 'draft_scope': 'test', 'remembered': False}
        self.results=[]
        handler.send_json = lambda status, data, **kwargs: self.results.append((status, data))
        handler.send_bytes = lambda status, data, content_type, **kwargs: self.results.append((status, data, content_type))
        return handler

    def test_exact_host_origin_and_no_forwarded_trust(self):
        h=self.handler()
        self.assertTrue(h.valid_origin())
        h.headers={'Host':'192.168.1.8:8011','Origin':'http://192.168.1.8:8011'}
        self.assertTrue(h.valid_origin())
        for host, origin in [('evil.test:8011','http://evil.test:8011'),
                             ('192.168.1.8:8011','http://evil.test'),
                             ('192.168.1.8:8011','null'),
                             ('192.168.1.8:8011','https://192.168.1.8:8011'),
                             ('192.168.1.8:8012','http://192.168.1.8:8012')]:
            h.headers={'Host':host,'Origin':origin,'X-Forwarded-Host':'localhost:8011'}
            self.assertFalse(h.valid_origin())

    def test_remote_setup_is_denied(self):
        h=self.handler();h.client_address=('192.168.1.9',50000);h.path='/api/auth/setup'
        payload=json.dumps({'name':'Test','password':'test-password'}).encode()
        h.headers.update({'Content-Type':'application/json','Content-Length':str(len(payload))})
        h.rfile=io.BytesIO(payload);h.do_POST()
        self.assertEqual(self.results[-1][0],403)
        self.assertFalse(app.account_exists(self.database))

    def test_lost_reply_retry_returns_same_saved_record(self):
        key='retry-request-123456'
        first=app.save_set(self.payload,self.database,key)
        second=app.save_set(self.payload,self.database,key)
        self.assertEqual(first,second)
        self.assertEqual(len(app.list_sets(self.database)),1)
        with self.assertRaises(ValueError):
            app.save_set({**self.payload,'reps':9},self.database,key)
        self.assertEqual(len(app.list_sets(self.database)),1)
        app.save_set(self.payload,self.database,'new-request-123456')
        self.assertEqual(len(app.list_sets(self.database)),2)

    def test_concurrent_retry_is_atomic(self):
        # Initialize schema first so this tests competing writes, not schema migration.
        app.account_exists(self.database)
        with ThreadPoolExecutor(max_workers=2) as pool:
            results=list(pool.map(lambda _:app.save_set(self.payload,self.database,'concurrent-123456'),range(2)))
        self.assertEqual(results[0],results[1])
        self.assertEqual(len(app.list_sets(self.database)),1)

    def test_invalid_draft_does_not_consume_request_id(self):
        with self.assertRaises(ValueError):
            app.save_set({**self.payload,'reps':0},self.database,'correctable-123456')
        self.assertEqual(app.save_set(self.payload,self.database,'correctable-123456')['reps'],8)

    def test_request_header_reaches_storage(self):
        h=self.handler();h.path='/api/sets';payload=json.dumps(self.payload).encode()
        h.headers.update({'Content-Type':'application/json','Content-Length':str(len(payload)),
                          'Idempotency-Key':'http-request-123456'})
        for _ in range(2):
            h.rfile=io.BytesIO(payload);h.do_POST()
        self.assertEqual(self.results[0],self.results[1])
        self.assertEqual(len(app.list_sets(self.database)),1)

    def test_install_assets_served_without_private_data(self):
        h=self.handler();h.current_user=lambda:None
        for path in ['/manifest.webmanifest','/sw.js','/offline.html','/mobile.css','/mobile.js',
                     '/draft_store.js','/pwa.js','/icons/icon-192.png','/icons/icon-512.png']:
            h.path=path;h.do_GET();self.assertEqual(self.results[-1][0],200,path)
        h.path='/api/sets';h.do_GET();self.assertEqual(self.results[-1][0],401)
        manifest=json.loads((app.STATIC/'manifest.webmanifest').read_text())
        self.assertEqual(manifest['scope'],'/')
        for icon in manifest['icons']:
            data=(app.STATIC/icon['src'].lstrip('/')).read_bytes()
            self.assertEqual(data[:8],b'\x89PNG\r\n\x1a\n')

    def test_draft_identity_is_stable_and_not_a_secret(self):
        _,token,_=app.create_account({'name':'Demo','password':'demo-password'},self.database)
        user=app.get_session(token,self.database)
        self.assertEqual(len(user['draft_scope']),64)
        self.assertNotIn('salt',user)
        self.assertEqual(app.get_session(token,self.database)['draft_scope'],user['draft_scope'])


if __name__=='__main__':
    unittest.main()
