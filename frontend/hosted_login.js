/* Tokens arrive only in the email-link fragment. Never persist them in browser storage. */
(async () => {
  const params = new URLSearchParams(location.hash.slice(1));
  history.replaceState(null, '', '/auth/callback');
  const status = document.querySelector('#callback-status');
  try {
    if (params.has('error')) throw new Error('This link expired or was already used. Request a fresh sign-in link.');
    if (!params.get('access_token') || !params.get('refresh_token')) throw new Error('No sign-in session found. Request a fresh link.');
    let remember = false;
    try { remember = localStorage.getItem('fitnessos-remember-login') === '1'; localStorage.removeItem('fitnessos-remember-login'); } catch {}
    const response = await fetch('/api/auth/exchange', {method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({access_token:params.get('access_token'), refresh_token:params.get('refresh_token'), remember})});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not verify sign-in.');
    location.replace('/');
  } catch (error) { status.textContent = error.message; }
})();
