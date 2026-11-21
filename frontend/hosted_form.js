(() => {
  const form = document.querySelector('#auth-form');
  const email = document.querySelector('#auth-name');
  const password = document.querySelector('#auth-password');
  const button = document.querySelector('#auth-button');
  const status = document.querySelector('#auth-status');
  document.querySelector('#auth-title').textContent = 'Sign in to your space';
  document.querySelector('#auth-intro').textContent = 'Enter your invited email. Open the sign-in link on this phone to continue.';
  document.querySelector('label[for="auth-name"]').textContent = 'Email';
  email.type = 'email'; email.autocomplete = 'email'; email.maxLength = 254;
  email.autocapitalize = 'none'; email.spellcheck = false;
  password.disabled = true; password.hidden = true;
  document.querySelector('label[for="auth-password"]').hidden = true;
  document.querySelector('.auth-note').textContent = 'Your records are saved to your private hosted account. Internet is required to save and load records.';
  button.textContent = 'Email me a sign-in link';
  form.hidden = false;
  fetch('/api/auth/status', {cache:'no-store'}).then(r => r.json()).then(result => {
    if (result.authenticated) location.replace('/');
  }).catch(() => { status.textContent = 'Could not check your session. You can retry signing in.'; });
  form.addEventListener('submit', async event => {
    event.preventDefault(); button.disabled = true; status.textContent = 'Requesting your sign-in link…';
    try {
      const remember = document.querySelector('#remember-me').checked;
      try { localStorage.setItem('fitnessos-remember-login', remember ? '1' : '0'); } catch {}
      const response = await fetch('/api/auth/email', {method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:email.value.trim()})});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not send the link.');
      status.textContent = 'Check your inbox and open the link in this browser. If it expired, request a fresh link.';
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
  });
})();
