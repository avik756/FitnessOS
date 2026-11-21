"""Same-origin hosted transport. Identity comes only from Supabase's /user API."""
import json
import io
import mimetypes
import os
import re
import sqlite3
import uuid
from http.cookies import SimpleCookie, CookieError
from types import SimpleNamespace
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit, quote
from urllib.request import Request, urlopen

from backend.app import Handler, STATIC
from backend.postgres import PostgresDatabase

ACCESS = '__Host-fitnessos-access'
REFRESH = '__Host-fitnessos-refresh'
REMEMBER = '__Host-fitnessos-remember'


class AuthError(Exception):
    def __init__(self, message, status=401):
        super().__init__(message)
        self.status = status


def auth_request(path, body=None, token=None):
    headers = {'apikey': os.environ['SUPABASE_PUBLISHABLE_KEY'], 'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    request = Request(os.environ['SUPABASE_URL'].rstrip('/') + '/auth/v1' + path,
                      data=json.dumps(body).encode() if body is not None else None, headers=headers)
    try:
        with urlopen(request, timeout=12) as response:
            data = response.read()
            return json.loads(data) if data else {}
    except HTTPError as error:
        # Provider responses may include sensitive details; never echo or log them.
        if error.code == 429:
            raise AuthError('Too many sign-in requests. Wait a few minutes and try again.', 429) from None
        if error.code >= 500:
            raise AuthError('Sign-in service is temporarily unavailable. Try again.', 503) from None
        raise AuthError('Sign-in could not be verified. Request a fresh link and try again.') from None
    except (URLError, TimeoutError):
        raise AuthError('Cannot reach sign-in service. Try again when connected.', 503) from None


def allowed_user(user):
    allowed = {email.strip().casefold() for email in os.environ.get('FITNESSOS_ALLOWED_EMAILS', '').split(',') if email.strip()}
    if (not isinstance(user, dict) or not user.get('email_confirmed_at')
            or user.get('is_anonymous') or not isinstance(user.get('email'), str)
            or user['email'].casefold() not in allowed):
        raise AuthError('This account is not invited to this private app.', 403)
    try:
        user_id = str(uuid.UUID(user['id']))
    except (ValueError, KeyError, TypeError):
        raise AuthError('Invalid account identity.') from None
    return {'name': user['email'], 'draft_scope': user_id, 'id': user_id}


class HostedHandler(Handler):
    def log_message(self, *_):
        # Never put auth query strings or personal request data in HTTP logs.
        pass

    def _prepare(self):
        self._user = None
        self._checked = False
        self._cookies_out = []
        self._cookie = SimpleCookie()
        try:
            self._cookie.load(self.headers.get('Cookie', ''))
        except CookieError:
            self._cookie = SimpleCookie()
        self.server = SimpleNamespace(database=None)

    def cookie_value(self, name):
        item = self._cookie.get(name)
        return item.value if item else ''

    def valid_host(self):
        configured = os.environ.get('FITNESSOS_ORIGIN', '')
        allowed = {urlsplit(configured).netloc}
        # VERCEL_URL is supplied by the platform, never by an incoming header.
        if os.environ.get('VERCEL_URL'):
            allowed.add(os.environ['VERCEL_URL'])
        return bool(configured.startswith('https://')) and self.headers.get('Host') in allowed

    def valid_origin(self):
        return self.valid_host() and self.headers.get('Origin') == 'https://' + self.headers.get('Host', '')

    def _set_tokens(self, tokens, remember):
        access, refresh = tokens.get('access_token'), tokens.get('refresh_token')
        if not isinstance(access, str) or not isinstance(refresh, str) or not access or not refresh:
            raise AuthError('Incomplete sign-in. Request another link.')
        if any(c in access + refresh for c in '\r\n;') or len(access) > 3800 or len(refresh) > 1000:
            raise AuthError('Invalid session.')
        lifetime = '; Max-Age=2592000' if remember else ''
        for name, value in ((ACCESS, access), (REFRESH, refresh), (REMEMBER, '1' if remember else '0')):
            self._cookies_out.append(('Set-Cookie', f'{name}={value}; Secure; HttpOnly; SameSite=Lax; Path=/{lifetime}'))

    def _clear_tokens(self):
        for name in (ACCESS, REFRESH, REMEMBER):
            self._cookies_out.append(('Set-Cookie', f'{name}=; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'))

    def current_user(self):
        if self._checked:
            return self._user
        self._checked = True
        access, refresh = self.cookie_value(ACCESS), self.cookie_value(REFRESH)
        if not access and not refresh:
            return None
        try:
            try:
                provider_user = auth_request('/user', token=access) if access else None
                if provider_user is None:
                    raise AuthError('Expired session.')
            except AuthError as error:
                if error.status != 401 or not refresh:
                    raise
                tokens = auth_request('/token?grant_type=refresh_token', {'refresh_token': refresh})
                provider_user = auth_request('/user', token=tokens['access_token'])
                allowed_user(provider_user)
                self._set_tokens(tokens, self.cookie_value(REMEMBER) == '1')
            self._user = allowed_user(provider_user)
            self._user['remembered'] = self.cookie_value(REMEMBER) == '1'
            self.server.database = PostgresDatabase(os.environ['FITNESSOS_DATABASE_URL'], self._user['id'])
        except AuthError as error:
            if error.status in (401, 403):
                self._clear_tokens()
                return None
            raise
        return self._user

    def send_bytes(self, status, content, content_type, disposition=None, extra_headers=()):
        if content_type.startswith('text/html'):
            content = content.replace(b'<head>', b'<head><script src="/hosted_ui.js" defer></script>')
            content = content.replace(b'src="/login.js"', b'src="/hosted_form.js"')
        headers = tuple(extra_headers) + tuple(self._cookies_out) + (
            ('Referrer-Policy', 'no-referrer'), ('X-Frame-Options', 'DENY'),
            ('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"),
        )
        self._cookies_out = []
        return super().send_bytes(status, content, content_type, disposition, headers)

    def redirect(self, location):
        return self.send_bytes(302, b'', 'text/plain', extra_headers=(('Location', location),))

    def require_photos(self):
        self.send_json(403, {'error': 'Photos are available only in the local app until hosted photo protection is ready.'})
        return False

    def _json_body(self):
        if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
            raise AuthError('Send JSON.', 415)
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 12000:
                raise ValueError
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                raise ValueError
            return data
        except (ValueError, TypeError):
            raise AuthError('Invalid sign-in request.', 400) from None

    def _get(self):
        path = urlsplit(self.path).path
        if not self.valid_host():
            return self.send_json(403, {'error': 'Invalid host.'})
        if path == '/api/auth/status':
            user = self.current_user()
            return self.send_json(200, {'hosted': True, 'setup_required': False,
                'authenticated': bool(user), 'name': user['name'] if user else None,
                'draft_scope': user['draft_scope'] if user else None,
                'remembered': user['remembered'] if user else False, 'photos_enabled': False})
        if path in ('/hosted_ui.js', '/hosted_login.js', '/hosted_form.js', '/auth/callback'):
            filename = 'hosted_callback.html' if path == '/auth/callback' else path[1:]
            return self.send_bytes(200, (STATIC / filename).read_bytes(),
                                   'text/html; charset=utf-8' if filename.endswith('.html') else 'text/javascript; charset=utf-8')
        if path == '/api/photos/status':
            return self.send_json(200, {'until': 0, 'enabled': False}) if self.current_user() else self.send_json(401, {'error': 'Sign in to continue.'})
        if path.startswith('/api/photos'):
            return self.require_photos()
        # Public assets do not need a remote identity lookup for every CSS/JS request.
        asset = (STATIC / path.lstrip('/')).resolve()
        if (asset.is_relative_to(STATIC.resolve()) and asset.is_file()
                and (asset.suffix in ('.js', '.css', '.png', '.webmanifest') or path in ('/offline.html', '/journal.html'))):
            mime = 'application/manifest+json' if asset.suffix == '.webmanifest' else mimetypes.guess_type(asset.name)[0] or 'application/octet-stream'
            return self.send_bytes(200, asset.read_bytes(), mime)
        return super().do_GET()

    def _post(self):
        if not self.valid_origin():
            return self.send_json(403, {'error': 'Invalid origin.'})
        path = urlsplit(self.path).path
        if path.startswith('/api/auth/'):
            data = self._json_body()
            if path == '/api/auth/email':
                email = data.get('email', '')
                if not isinstance(email, str) or email.casefold() not in {
                        item.strip().casefold() for item in os.environ.get('FITNESSOS_ALLOWED_EMAILS', '').split(',') if item.strip()}:
                    raise AuthError('This email is not invited to this private app.', 403)
                callback = os.environ['FITNESSOS_ORIGIN'] + '/auth/callback'
                auth_request('/otp?redirect_to=' + quote(callback, safe=''), {'email': email, 'create_user': True})
                return self.send_json(200, {'sent': True})
            if path == '/api/auth/exchange':
                access = data.get('access_token')
                if (not isinstance(access, str) or not 1 <= len(access) <= 3800
                        or not re.fullmatch(r'[A-Za-z0-9_.-]+', access)):
                    raise AuthError('Invalid sign-in link.')
                allowed_user(auth_request('/user', token=access))
                self._set_tokens(data, data.get('remember') is True)
                return self.send_json(200, {'authenticated': True})
            if path == '/api/auth/logout':
                try:
                    if self.cookie_value(ACCESS):
                        auth_request('/logout?scope=local', {}, self.cookie_value(ACCESS))
                finally:
                    self._clear_tokens()
                return self.send_json(200, {'signed_out': True})
            return self.send_json(403, {'error': 'Local account setup and password login are disabled here.'})
        if path.startswith('/api/photos'):
            return self.require_photos()
        # Vercel has bounded request bodies. Refuse oversized restores before reading.
        try:
            size = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            return self.send_json(400, {'error': 'Invalid content length.'})
        if size > 3_500_000:
            return self.send_json(413, {'error': 'Hosted uploads are limited to 3.5 MB. Keep large backups in the local app.'})
        if path in ('/api/restore', '/api/restore/preview') and size > 0:
            raw = self.rfile.read(size)
            self.rfile = io.BytesIO(raw)
            try:
                backup = json.loads(raw)
            except ValueError:
                return self.send_json(400, {'error': 'Invalid backup JSON.'})
            if isinstance(backup, dict) and isinstance(backup.get('journal'), list) and any(
                    isinstance(row, dict) and row.get('kind') == 'photo' for row in backup['journal']):
                return self.send_json(400, {'error': 'This backup includes photos. Photo backups can only be restored in the local app.'})
        return super().do_POST()

    def _dispatch(self, operation):
        self._prepare()
        try:
            operation()
        except AuthError as error:
            self.send_json(error.status, {'error': str(error)})
        except (OSError, KeyError, sqlite3.Error):
            self.send_json(503, {'error': 'Hosted service is unavailable. Your save was not confirmed; keep your draft and retry.'})

    def do_GET(self):
        self._dispatch(self._get)

    def do_POST(self):
        self._dispatch(self._post)
