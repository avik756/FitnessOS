/* Enhancements for the shared browser UI; no separate mobile state/router. */
(() => {
  const nav = document.querySelector('.mobile-nav');
  const log = nav?.querySelector('[data-nav=log]');
  if (log) {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.nav = 'log'; button.textContent = 'Log';
    button.setAttribute('aria-label', 'Log an activity');
    button.onclick = () => openQuickAdd(); log.replaceWith(button);
  }
  const more = document.querySelector('#view-more .feature-grid');
  const logout = document.querySelector('[data-logout]');
  if (more && logout) {
    const button = document.createElement('button');
    button.type='button'; button.className='secondary-button'; button.textContent='Sign out';
    button.onclick=()=>logout.click(); more.after(button);
  }
  // A route transition dismisses the old editor rather than leaving it over History.
  window.addEventListener('hashchange', () => {
    for (const dialog of document.querySelectorAll('dialog[open]')) {
      if (dialog.classList.contains('set-editor') && location.hash === '#log') continue;
      dialog.close();
    }
  });
  const viewport = window.visualViewport;
  function resize() {
    if (!viewport) return;
    document.documentElement.style.setProperty('--phone-viewport-height', `${viewport.height}px`);
    const input = document.activeElement?.matches('input,textarea,select');
    document.body.classList.toggle('phone-keyboard', Boolean(input && window.innerHeight - viewport.height > 120));
  }
  viewport?.addEventListener('resize', resize);
  document.addEventListener('focusin', resize);
  document.addEventListener('focusout', () => setTimeout(resize, 0));
  resize();
  const banner = document.createElement('p');
  banner.className='connection-banner'; banner.setAttribute('role','status');
  document.querySelector('.topbar')?.after(banner);
  function connection() {
    banner.hidden=navigator.onLine;
    banner.textContent='Offline. Keep editing your draft; reconnect before saving. Saved records need the server.';
  }
  window.addEventListener('online',connection); window.addEventListener('offline',connection); connection();
})();
