/* Navigation, device preferences and reminders for the local prototype. */
(() => {
  const nav = document.querySelector('.side-nav[aria-label="Main navigation"]');
  const trail = document.querySelector('#location-trail');
  const labels = {home:'Overview',log:'Log a set',history:'History',body:'Body',calories:'Nutrition',make:'Make',daily:'Daily journal',workouts:'Workout sessions',foods:'Food library',photos:'Photos',exercises:'Exercises',progress:'Progress',backup:'Backup',settings:'Settings',reminders:'Reminders',more:'More'};
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const navKey = 'fitnessos-navigation-order';
  const order = read(navKey, []);
  for (const key of order) { const link = [...nav.querySelectorAll('[data-nav]')].find(a => a.dataset.nav === key); if (link) nav.append(link); }
  const controls = document.createElement('div'); controls.className = 'nav-order-controls';
  const toggle = document.createElement('button'); toggle.type = 'button'; toggle.textContent = 'Arrange navigation'; toggle.className = 'text-button';
  toggle.addEventListener('click', () => { nav.classList.toggle('arranging'); toggle.textContent = nav.classList.contains('arranging') ? 'Done arranging' : 'Arrange navigation'; });
  nav.after(controls); controls.append(toggle);
  for (const link of [...nav.querySelectorAll('[data-nav]')]) {
    const row = document.createElement('div'); row.className = 'nav-item'; link.before(row); row.append(link);
    for (const [direction, symbol] of [[-1,'↑'],[1,'↓']]) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = symbol; button.className = 'nav-move';
      button.setAttribute('aria-label',`Move ${link.textContent} ${direction < 0 ? 'up' : 'down'}`);
      button.onclick = () => {
        const sibling = direction < 0 ? row.previousElementSibling : row.nextElementSibling;
        if (!sibling?.classList.contains('nav-item')) return;
        if (direction < 0) sibling.before(row); else sibling.after(row);
        const order=[...nav.querySelectorAll('[data-nav]')].map(a => a.dataset.nav);write(navKey,order);
        if(window.fitnessWorkspace){window.fitnessWorkspace.state.navigation=order;window.fitnessWorkspace.persist();}
      }; row.append(button);
    }
  }
  function breadcrumbs() {
    const raw = decodeURIComponent(location.hash.slice(1) || 'home');
    const page = raw.startsWith('page/') ? window.fitnessPages?.find(p => p.id === raw.slice(5)) : null;
    const nodes = [{label:'My workspace',href:'#home'}];
    if (page) {
      const ancestors = [], seen = new Set(); let current = page;
      while (current && !seen.has(current.id)) { seen.add(current.id); ancestors.unshift(current); current = window.fitnessPages?.find(p => p.id === current.parent); }
      for (const item of ancestors) nodes.push({label:`${item.emoji || ''} ${item.title}`,href:`#page/${encodeURIComponent(item.id)}`});
    } else if (raw !== 'home') nodes.push({label:labels[raw] || (raw.startsWith('coming/') ? 'Coming soon' : 'Overview'),href:location.hash});
    trail.replaceChildren();
    for (const [index,item] of nodes.entries()) { if (index) { const sep = document.createElement('span'); sep.textContent = '/'; sep.setAttribute('aria-hidden','true'); trail.append(sep); } const anchor = document.createElement('a'); anchor.href=item.href; anchor.textContent=item.label; if (index === nodes.length-1) anchor.setAttribute('aria-current','page'); trail.append(anchor); }
  }
  window.addEventListener('hashchange',breadcrumbs); window.addEventListener('workspace-ready',()=>setTimeout(breadcrumbs,0));window.addEventListener('fitness-pages-changed',breadcrumbs); breadcrumbs();

  const settings = document.createElement('section'); settings.id='view-settings'; settings.className='view'; settings.dataset.view='settings'; settings.hidden=true;
  settings.innerHTML='<div class="page-heading"><span class="eyebrow">Preferences</span><h1>Settings</h1></div><div class="settings-grid"><section class="card"><h2>Appearance</h2><label>Theme<select id="settings-theme"><option value="dark">Dark</option><option value="light">Light</option></select></label><label>Page type<select id="settings-font"><option value="serif">Serif</option><option value="sans">Sans</option><option value="mono">Mono</option></select></label><label>Density<select id="settings-density"><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label></section><section class="card"><h2>Workspace</h2><p class="muted">Change the order of your tools in the sidebar with Arrange navigation. Your pages have their own Edit page and Move selected controls.</p><button id="settings-arrange" class="secondary-button" type="button">Arrange navigation</button></section><section class="card"><h2>Reminders</h2><p class="muted">Set personal reminder times and messages. While this local app is open, it can alert you and use vibration on supported devices.</p><a class="secondary-button" href="#reminders">Manage reminders</a></section><section class="card"><h2>Your data</h2><p class="muted">Review export and restore before relying on these records as your only copy.</p><a class="secondary-button" href="#backup">Open backup</a></section></div><p id="settings-status" class="status" role="status"></p>';
  document.querySelector('main.page').append(settings);
  const appearance = read('fitnessos-appearance', {});
  settings.querySelector('#settings-theme').value = document.documentElement.dataset.theme;
  settings.querySelector('#settings-font').value = document.documentElement.dataset.font;
  settings.querySelector('#settings-density').value = appearance.density || 'comfortable';
  for (const field of settings.querySelectorAll('select')) field.onchange = () => {
    const values = {theme:settings.querySelector('#settings-theme').value,font:settings.querySelector('#settings-font').value,density:settings.querySelector('#settings-density').value};
    write('fitnessos-appearance',values); Object.assign(document.documentElement.dataset,values);
    const workspaceControl = document.querySelector(field.id === 'settings-theme' ? '#workspace-theme' : '#workspace-font');
    if (workspaceControl && field.id !== 'settings-density') { workspaceControl.value=field.value; workspaceControl.dispatchEvent(new Event('change')); }
    if(window.fitnessWorkspace){window.fitnessWorkspace.state.density=values.density;window.fitnessWorkspace.persist();}
    settings.querySelector('#settings-status').textContent='Check the workspace save status above.';
  };
  settings.querySelector('#settings-arrange').onclick=()=>{location.hash='#home';toggle.click();toggle.focus();};
  function showSettings(){if(location.hash === '#settings') { settings.hidden=false; document.querySelectorAll('[data-view]:not(#view-settings)').forEach(view=>view.hidden=true); }}
  window.addEventListener('hashchange',showSettings);showSettings();

  function syncPreferences(){
    const workspace=window.fitnessWorkspace;if(!workspace)return;
    const {state,persist}=workspace;let migrated=false;
    if(!state.navigation){state.navigation=[...nav.querySelectorAll('[data-nav]')].map(a=>a.dataset.nav);migrated=true;}
    if(!state.density){state.density=read('fitnessos-appearance',{}).density||'comfortable';migrated=true;}
    for(const key of state.navigation){const row=[...nav.querySelectorAll('.nav-item')].find(n=>n.querySelector('[data-nav]').dataset.nav===key);if(row)nav.append(row);}
    for(const key of ['theme','font','density']){const value=state[key]||document.documentElement.dataset[key];document.documentElement.dataset[key]=value;settings.querySelector(`#settings-${key}`).value=value;}
    write('fitnessos-appearance',{theme:state.theme,font:state.font,density:state.density});
    if(migrated)persist();
  }
  window.addEventListener('workspace-ready',syncPreferences);window.addEventListener('workspace-reset',syncPreferences);
  const reminders = document.createElement('section'); reminders.dataset.view='reminders'; reminders.className='view'; reminders.hidden=true;
  reminders.innerHTML='<div class="page-heading"><span class="eyebrow">Your schedule</span><h1>Reminders</h1><p>Alerts work while this local app is open. Your browser may pause them in the background.</p></div><div class="two-column"><section class="card"><h2>New reminder</h2><form id="reminder-form"><label>Message<input name="message" required maxlength="120" placeholder="Drink water"></label><label>Time<input name="time" type="time" required></label><label>Days<select name="days"><option value="daily">Every day</option><option value="weekdays">Weekdays</option><option value="weekends">Weekends</option></select></label><label>Vibration<select name="vibration"><option value="off">Off</option><option value="short">Short</option><option value="double">Double</option></select></label><button class="primary-button">Save reminder</button><p id="reminder-status" class="status" role="status"></p></form><button id="test-vibration" type="button" class="text-button">Test vibration</button></section><section class="card"><h2>Your reminders</h2><ul id="reminder-list" class="compact-list"></ul></section></div>';
  document.querySelector('main.page').append(reminders);
  reminders.querySelector('[name=vibration]').closest('label').insertAdjacentHTML('afterend','<label>Custom vibration (pulse, pause, pulse in milliseconds)<input name="pattern" placeholder="120, 80, 120" pattern="[0-9 ,]+" maxlength="40"></label><label>Quiet from<input name="quietStart" type="time"></label><label>Quiet until<input name="quietEnd" type="time"></label>');
  reminders.querySelector('[name=vibration]').add(new Option('Custom pattern','custom'));
  const key='fitnessos-local-reminders'; let items=read(key,[]); const fired=new Set();
  const patternFor = raw => {const values=String(raw||'').split(',').map(s=>Number(s.trim()));return values.length>0&&values.length<=9&&values.every(n=>Number.isInteger(n)&&n>=0&&n<=500)?values:null;};
  const vibrate = (type,pattern) => { if (!navigator.vibrate || type === 'off') return false; return navigator.vibrate(type==='custom'?(patternFor(pattern)||[150]):type==='double'?[110,100,110]:[150]); };
  reminders.querySelector('#test-vibration').onclick=()=>{const type=reminders.querySelector('[name=vibration]').value;const pattern=reminders.querySelector('[name=pattern]').value;reminders.querySelector('#reminder-status').textContent=type==='off'?'Choose a vibration pattern first.':type==='custom'&&!patternFor(pattern)?'Enter up to 9 pulse/pause values, each 0–500 ms.':vibrate(type,pattern)?'Vibration requested.':'Vibration is unavailable in this browser.';};
  function render() { const list=reminders.querySelector('#reminder-list'); list.replaceChildren(); if (!items.length) list.textContent='No reminders yet.';
    for(const item of items) {const row=document.createElement('li'); const label=document.createElement('span');label.textContent=`${item.time} · ${item.message} · ${item.days}${item.enabled?'':' · Paused'}`;
      const actions=document.createElement('div');actions.className='quick-links';for(const [name,action] of [[item.enabled?'Pause':'Resume',()=>item.enabled=!item.enabled],['Remove',()=>items=items.filter(other=>other.id!==item.id)]]){const button=document.createElement('button');button.type='button';button.className='text-button';button.textContent=name;button.onclick=()=>{action();write(key,items);render();};actions.append(button);}row.append(label,actions);list.append(row); }
  }
  reminders.querySelector('form').onsubmit=event=>{event.preventDefault();const fields=new FormData(event.target);if(fields.get('vibration')==='custom'&&!patternFor(fields.get('pattern'))){reminders.querySelector('#reminder-status').textContent='Enter up to 9 pulse/pause values, each 0–500 ms.';return;}items.push({id:crypto.randomUUID(),message:String(fields.get('message')).trim(),time:fields.get('time'),days:fields.get('days'),vibration:fields.get('vibration'),pattern:fields.get('pattern'),quietStart:fields.get('quietStart'),quietEnd:fields.get('quietEnd'),enabled:true});write(key,items);event.target.reset();render();reminders.querySelector('#reminder-status').textContent='Saved on this browser. Keep this app open for alerts.';};
  render();
  function showReminders(){if(location.hash==='#reminders'){reminders.hidden=false;document.querySelectorAll('[data-view]:not([data-view=reminders])').forEach(view=>view.hidden=true);}}
  window.addEventListener('hashchange',showReminders);showReminders();
  function checkReminders(){const now=new Date();const date=now.toLocaleDateString('en-CA');const time=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    for(const item of items){const day=now.getDay();if(!item.enabled||item.time!==time||(item.days==='weekdays'&&(day===0||day===6))||(item.days==='weekends'&&day!==0&&day!==6))continue;
      if(item.quietStart&&item.quietEnd){const quiet=item.quietStart<=item.quietEnd?time>=item.quietStart&&time<item.quietEnd:time>=item.quietStart||time<item.quietEnd;if(quiet)continue;}
      const token=`${item.id}:${date}:${time}`;if(fired.has(token))continue;fired.add(token);vibrate(item.vibration,item.pattern);
      const message=document.createElement('div');message.className='reminder-banner';message.setAttribute('role','status');const label=document.createElement('span');label.textContent=item.message;const close=document.createElement('button');close.type='button';close.className='secondary-button';close.textContent='Dismiss';close.onclick=()=>message.remove();message.append(label,close);document.body.append(message);
      if('Notification' in window && Notification.permission==='granted' && document.hidden) new Notification('FitnessOS reminder',{body:item.message});
    }
  }
  setInterval(checkReminders,15000);document.addEventListener('visibilitychange',checkReminders);checkReminders();
  // Turn the four tall journal forms into focused, discoverable sections after the template loads.
  window.addEventListener('journal-ready',()=>{
    const journal=document.querySelector('[data-view=daily]');if(!journal||journal.querySelector('.journal-panel'))return;
    for(const section of journal.querySelectorAll('.two-column > section.card')){
      const heading=section.querySelector('h2');const details=document.createElement('details');details.className='card journal-panel';
      const summary=document.createElement('summary');summary.textContent=heading?.textContent||'Entry';heading?.remove();section.before(details);section.classList.remove('card');details.append(summary,section);
      details.addEventListener('toggle',()=>{if(details.open)journal.querySelectorAll('.journal-panel').forEach(other=>{if(other!==details)other.open=false;});});
    }
    journal.querySelector('.journal-panel').open=true;
    journal.querySelector('.two-column').classList.add('journal-grid');
  });
  document.addEventListener('click',event=>{const shortcut=event.target.closest('[data-quick-route=daily]');if(!shortcut)return;const target=document.querySelector(shortcut.dataset.quickFocus);target?.closest('.journal-panel')?.setAttribute('open','');},true);
})();
