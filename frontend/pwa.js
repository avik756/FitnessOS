(() => {
  const container = document.querySelector('#view-settings .settings-grid') || document.querySelector('.auth-card');
  if (!container) return;
  const section=document.createElement('section'); section.className='card phone-install';
  const title=document.createElement('h2');title.textContent='Use on your phone';
  const text=document.createElement('p');text.className='muted';
  const install=document.createElement('button');install.type='button';install.className='secondary-button';install.textContent='Install FitnessOS';install.hidden=true;
  section.append(title,text,install);container.append(section);
  let prompt;
  function guidance() {
    text.textContent=matchMedia('(display-mode: standalone)').matches
      ? 'Installed. Records still save to the connected server; installation does not enable offline logging.'
      : !window.isSecureContext
        ? 'For installation, open the HTTPS app or use Chrome USB forwarding to localhost. A plain Wi-Fi HTTP address only supports browser testing.'
        : 'In Chrome, open the menu and choose Add to Home screen or Install app when offered. Local testing still needs your laptop server.';
  }
  guidance();
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;install.hidden=false;});
  install.onclick=async()=>{if(!prompt)return;const current=prompt;prompt=null;install.hidden=true;await current.prompt();await current.userChoice;guidance();};
  window.addEventListener('appinstalled',()=>{prompt=null;install.hidden=true;guidance();});
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('/sw.js').then(registration=>{
      const update=()=>{text.textContent='An update is ready. Finish saving, then close all FitnessOS tabs and reopen to use it.';};
      if(registration.waiting)update();
      registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)update();});});
    }).catch(()=>{text.textContent+=' Offline launch notice is unavailable; normal online use still works.';});
  }
})();
