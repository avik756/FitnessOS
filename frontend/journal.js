/* New screens share the existing API helpers and set logger. */
(() => {
  const $ = selector => document.querySelector(selector);
  let records = [], photoRows = [], photoUntil = 0, photoDay = localToday;
  let photoGeneration = 0, photoUrls = [], photoTimer, refreshGeneration = 0;
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const timeNow = () => new Date().toTimeString().slice(0, 5);
  const element = (tag, text, className) => {
    const node = document.createElement(tag); if (text !== undefined) node.textContent = text;
    if (className) node.className = className; return node;
  };
  const action = (text, handler) => {
    const button = element('button', text, 'secondary-button'); button.type = 'button';
    button.addEventListener('click', handler); return button;
  };
  const rowsOf = kind => records.filter(row => row.kind === kind);
  const fields = formNode => Object.fromEntries(new FormData(formNode));
  const numeric = (data, keys) => { for (const key of keys) data[key] = data[key] === '' ? null : Number(data[key]); return data; };

  async function submit(formNode, work, after) {
    const status = formNode.querySelector('.status');
    const buttons = [...formNode.querySelectorAll('button')];
    buttons.forEach(button => button.disabled = true); status.textContent = 'Saving…';
    try {
      await work(); status.textContent = "Saved in this computer's database.";
      try { await after?.(); await refresh(); }
      catch { status.textContent = 'Saved, but the display could not refresh. Reload to review.'; }
    } catch (error) {
      status.textContent = `${error.message} Could not confirm a save. Your draft remains; check history before retrying.`;
    } finally { buttons.forEach(button => button.disabled = false); }
  }
  const save = (kind, data) => postBackup('/api/journal', { kind, data });

  async function refresh() {
    const generation = ++refreshGeneration;
    const data = await readFeature('/api/journal');
    if (generation !== refreshGeneration) return;
    records = data;
    const route = location.hash.slice(1);
    if (route === 'daily') await renderDaily();
    if (route === 'workouts') await renderWorkouts();
    if (route === 'foods') renderFoods();
  }

  async function renderDaily() {
    const day = $('#journal-date').value;
    if (!day) return;
    const onDay = records.filter(row => row.data.activity_date === day);
    const waters = onDay.filter(row => row.kind === 'water' && !row.data.undone);
    $('#water-total').textContent = waters.length ? `${waters.reduce((sum, row) => sum + row.data.ml, 0)} ml logged` : 'No water logged';
    $('#water-list').replaceChildren();
    for (const row of waters) {
      const li = setTextRow($('#water-list'), `${row.data.ml} ml`, row.data.time || 'Time unknown');
      li.append(action('Undo this entry', async event => {
        event.target.disabled = true;
        try { await postBackup('/api/water/undo', { id: row.id }); await refresh(); }
        catch (error) { $('#water-form .status').textContent = error.message; event.target.disabled = false; }
      }));
    }
    const step = onDay.find(row => row.kind === 'steps');
    $('#steps-total').textContent = step ? `${step.data.count} steps recorded` : 'Steps not recorded';
    $('#sleep-list').replaceChildren();
    for (const row of onDay.filter(row => row.kind === 'sleep')) {
      setTextRow($('#sleep-list'), `${Math.floor(row.data.minutes / 60)} h ${row.data.minutes % 60} min`,
        `${row.data.start.replace('T',' ')} → ${row.data.end.replace('T',' ')} · quality ${row.data.quality ?? 'unknown'}`);
    }
    $('#timeline-title').textContent = day;
    $('#timeline-status').textContent = 'Loading daily context…';
    const data = await readFeature(`/api/day?date=${encodeURIComponent(day)}`);
    if ($('#journal-date').value !== day) return;
    const events = [];
    for (const row of onDay) {
      const d = row.data;
      if (row.kind === 'water' && !d.undone) events.push([d.time, `Water · ${d.ml} ml`, '']);
      if (row.kind === 'checkin') events.push([d.time, `Check-in · bloating ${d.bloating ?? '—'}/4 · mood ${d.mood ?? '—'}/5 · energy ${d.energy ?? '—'}/5`, d.notes]);
      if (row.kind === 'steps') events.push([null, `Steps · ${d.count}`, 'Daily total']);
      if (row.kind === 'sleep') events.push([d.end.slice(11), `Sleep · ${d.minutes} minutes`, `${d.start.replace('T',' ')} → ${d.end.replace('T',' ')}`]);
      if (row.kind === 'workout') events.push([null, `Workout · ${d.name}`, d.status]);
    }
    for (const row of data.calories) events.push([row.meal_time, `${row.label} · ${row.kcal} kcal`, 'Logged meal']);
    for (const row of data.sets) events.push([null, row.exercise, describeSet(row)]);
    for (const row of data.body) events.push([null, 'Body entry', [row.weight === null ? '' : `${row.weight} ${row.weight_unit}`, row.body_fat_pct === null ? '' : `${row.body_fat_pct}% body fat`].filter(Boolean).join(' · ') || 'Measurements recorded in History']);
    events.sort((a,b) => (a[0] || '99:99').localeCompare(b[0] || '99:99'));
    $('#daily-timeline').replaceChildren();
    for (const [time, title, detail] of events) setTextRow($('#daily-timeline'), `${time || 'Time not recorded'} · ${title}`, detail);
    $('#timeline-status').textContent = events.length ? 'Timed records first, then daily totals and entries without a time.' : 'Nothing recorded for this day.';
  }

  window.clearWorkoutContext = () => {
    window.workoutContext = null;
    $('#workout-context').hidden = true;
    $('#workout-context').replaceChildren();
  };
  form.elements.activity_date.addEventListener('input', window.clearWorkoutContext);

  async function renderWorkouts() {
    const plans = await readFeature('/api/make');
    const select = $('#session-day'), previous = select.value;
    select.replaceChildren(new Option('Choose a saved day', ''));
    for (const workout of plans.workouts) for (const day of workout.days) {
      if (day.exercises.length) select.add(new Option(`${workout.name} · ${day.name}`, day.id));
    }
    select.value = [...select.options].some(option => option.value === previous) ? previous : '';
    const sessions = rowsOf('workout');
    const selected = $('#session-select').value;
    $('#session-select').replaceChildren(new Option('Choose a session', ''));
    for (const row of sessions) $('#session-select').add(new Option(`${row.data.activity_date} · ${row.data.name} · ${row.data.status}`, row.id));
    $('#session-select').value = sessions.some(row => row.id === selected) ? selected : sessions[0]?.id || '';
    await renderSession();
  }

  async function renderSession() {
    const session = rowsOf('workout').find(row => row.id === $('#session-select').value);
    const detail = $('#session-detail'); detail.replaceChildren();
    if (!session) { detail.textContent = 'Start a workout day to record a session.'; return; }
    const sets = await readFeature(`/api/workout-sets?session=${encodeURIComponent(session.id)}`);
    if ($('#session-select').value !== session.id) return;
    detail.append(element('h2', session.data.name, 'subheading'), element('p', `${session.data.activity_date} · ${sets.length} saved sets · ${session.data.status}`));
    session.data.exercises.forEach((name, position) => {
      const item = element('section', undefined, 'session-exercise'); item.append(element('h3', name));
      const list = element('ul', undefined, 'compact-list');
      const own = sets.filter(set => set.session_exercise === position);
      for (const set of own) setTextRow(list, describeSet(set), `Set ${own.indexOf(set) + 1}`);
      item.append(list);
      if (!own.length) item.append(element('p', 'No sets recorded.', 'muted'));
      if (session.data.status === 'active') item.append(action('Log a set', () => {
        selectExerciseForLog(name);
        window.workoutContext = { id: session.id, position };
        form.elements.activity_date.value = session.data.activity_date;
        const banner = $('#workout-context'); banner.hidden = false;
        banner.replaceChildren(element('p', `Recording for ${session.data.name} · ${session.data.activity_date}`),
          action('Detach from workout', window.clearWorkoutContext), element('a', 'Return to session', 'inline-link'));
        banner.lastChild.href = '#workouts';
      }));
      detail.append(item);
    });
    if (session.data.status === 'active') detail.append(action('Finish this session', async event => {
      event.target.disabled = true;
      try {
        await postBackup('/api/workouts/finish', { id: session.id });
        if (window.workoutContext?.id === session.id) window.clearWorkoutContext();
        await refresh(); $('#session-status').textContent = 'Session finished. Its saved sets remain in History.';
      } catch (error) { $('#session-status').textContent = error.message; event.target.disabled = false; }
    }));
  }

  function renderFoods() {
    const selected = $('#food-select').value;
    $('#food-select').replaceChildren(new Option('Choose a saved food', ''));
    for (const row of rowsOf('food')) $('#food-select').add(new Option(`${row.data.name} · ${row.data.portion}`, row.id));
    $('#food-select').value = rowsOf('food').some(row => row.id === selected) ? selected : '';
    foodCalculation();
  }
  function foodCalculation() {
    const row = rowsOf('food').find(row => row.id === $('#food-select').value);
    $('#food-description').textContent = row ? `${row.data.kcal} kcal per ${row.data.portion} · your entered value` : 'Save a food, then choose it here.';
    const portions = Number($('#food-log-form').elements.portions.value);
    $('#food-calculation').textContent = row && portions > 0 ? `${Math.round(row.data.kcal * portions)} kcal for ${portions} portion(s)` : '';
  }

  function clearImages() { photoGeneration++; for (const url of photoUrls) URL.revokeObjectURL(url); photoUrls = []; $('#photo-gallery').replaceChildren(); }
  function hidePhotos() {
    photoUntil = 0; clearTimeout(photoTimer); clearImages(); photoRows = [];
    $('#photo-private').hidden = true; $('#photo-unlock-card').hidden = false;
    $('#photo-form').reset(); $('#photo-calendar').replaceChildren(); $('#photo-categories').replaceChildren();
    $('#photo-filter').replaceChildren(new Option('All categories', '')); $('#photo-day-title').textContent = '';
    $('#photo-unlock-form').elements.password.value = '';
    $('#photo-status').textContent = 'Photos locked. Re-enter your password to view them.';
  }
  async function lockPhotos() {
    hidePhotos();
    try { localStorage.setItem('fitnessos-photo-lock', String(Date.now())); } catch {}
    await postBackup('/api/photos/lock', {});
  }
  async function loadPhotos() {
    const status = await readFeature('/api/photos/status');
    if (location.hash !== '#photos') return;
    if (!status.until) { hidePhotos(); return; }
    photoUntil = status.until;
    photoRows = await readFeature('/api/photos');
    if (location.hash !== '#photos' || !photoUntil || photoUntil * 1000 <= Date.now()) { hidePhotos(); return; }
    $('#photo-private').hidden = false; $('#photo-unlock-card').hidden = true;
    if (!$('#photo-form').elements.activity_date.value) $('#photo-form').elements.activity_date.value = today();
    clearTimeout(photoTimer); photoTimer = setTimeout(hidePhotos, Math.max(0, photoUntil * 1000 - Date.now()));
    const categories = [...new Set(photoRows.map(row => row.data.category))].sort();
    const previous = $('#photo-filter').value;
    $('#photo-filter').replaceChildren(new Option('All categories', '')); $('#photo-categories').replaceChildren();
    for (const category of categories) { $('#photo-filter').add(new Option(category, category)); $('#photo-categories').append(new Option(category, category)); }
    $('#photo-filter').value = categories.includes(previous) ? previous : '';
    renderPhotoCalendar();
  }
  function renderPhotoCalendar() {
    const month = $('#photo-month').value;
    if (!/^\d{4}-\d{2}$/.test(month)) return;
    const [year, m] = month.split('-').map(Number);
    if (!photoDay.startsWith(month)) photoDay = `${month}-01`;
    const grid = $('#photo-calendar'); grid.replaceChildren();
    const filtered = photoRows.filter(row => !$('#photo-filter').value || row.data.category === $('#photo-filter').value);
    for (let i = 0; i < (new Date(year,m-1,1).getDay()+6)%7; i++) grid.append(element('span'));
    for (let day = 1; day <= new Date(year,m,0).getDate(); day++) {
      const date = `${month}-${String(day).padStart(2,'0')}`;
      const count = filtered.filter(row => row.data.activity_date === date).length;
      const button = action(String(day), () => { photoDay = date; renderPhotoCalendar(); });
      button.className = `calendar-day${count ? ' has-entries' : ''}${date === photoDay ? ' selected' : ''}`;
      button.setAttribute('aria-label', `${date}, ${count} photos`); button.setAttribute('aria-pressed', String(date === photoDay));
      if (count) button.append(element('small', `${count} photos`)); grid.append(button);
    }
    renderGallery(filtered.filter(row => row.data.activity_date === photoDay));
  }
  async function renderGallery(rows) {
    clearImages(); const generation = photoGeneration;
    $('#photo-day-title').textContent = photoDay;
    if (!rows.length) $('#photo-gallery').textContent = 'No photos in this category on this date.';
    for (const row of rows) {
      try {
        const response = await apiFetch(`/api/photos?id=${encodeURIComponent(row.id)}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Photo access ended. Unlock again.');
        const blob = await response.blob();
        if (generation !== photoGeneration || !photoUntil) return;
        const url = URL.createObjectURL(blob); photoUrls.push(url);
        const figure = element('figure'); const img = element('img'); img.src = url; img.alt = `${row.data.category}, ${row.data.activity_date}`;
        figure.append(img, element('figcaption', row.data.category)); $('#photo-gallery').append(figure);
      } catch (error) { if (generation === photoGeneration) { hidePhotos(); $('#photo-status').textContent = error.message; } return; }
    }
  }
  async function encodePhoto(file) {
    if (!file || !['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 20_000_000) throw new Error('Choose a JPEG, PNG, or WebP image under 20 MB.');
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1,Math.round(bitmap.width*scale)); canvas.height = Math.max(1,Math.round(bitmap.height*scale));
      const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0,0,canvas.width,canvas.height); context.drawImage(bitmap,0,0,canvas.width,canvas.height);
      return canvas.toDataURL('image/jpeg',0.85).split(',')[1];
    } finally { bitmap.close(); }
  }

  function lineChart(container, points, label) {
    container.replaceChildren(); if (!points.length) { container.textContent = 'No recorded values for this selection.'; return; }
    const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 600 210'); svg.setAttribute('role','img'); svg.setAttribute('aria-label',label);
    const title = document.createElementNS(ns,'title'); title.textContent = label; svg.append(title);
    const values = points.map(p => p.value), low = Math.min(...values), high = Math.max(...values), span = high-low || Math.max(1,high*0.1);
    const bottom = Math.max(0,low-span*0.1), top = high+span*0.1;
    const coords = points.map((p,i) => [52+i*526/Math.max(1,points.length-1), 165-(p.value-bottom)/(top-bottom||1)*140]);
    for (const [value,y] of [[top,25],[bottom,165]]) {
      const text = document.createElementNS(ns,'text'); text.setAttribute('x','2'); text.setAttribute('y',String(y)); text.textContent = value.toFixed(1); svg.append(text);
    }
    const line = document.createElementNS(ns,'polyline'); line.setAttribute('points',coords.map(p=>p.join(',')).join(' ')); line.setAttribute('fill','none'); line.setAttribute('stroke','#176b49'); line.setAttribute('stroke-width','3'); svg.append(line);
    coords.forEach(([x,y],i) => { const dot = document.createElementNS(ns,'circle'); dot.setAttribute('cx',x); dot.setAttribute('cy',y); dot.setAttribute('r','4'); dot.setAttribute('fill','#176b49'); const tip = document.createElementNS(ns,'title'); tip.textContent=`${points[i].date}: ${points[i].value.toFixed(1)}`; dot.append(tip); svg.append(dot); });
    container.append(svg, element('p', `${points[0].date} → ${points.at(-1).date}. Each point is one recorded entry; spacing is by entry, not elapsed time. Vertical scale ${bottom.toFixed(1)}–${top.toFixed(1)}.`, 'muted'));
  }
  let comparisonGeneration = 0;
  async function compareStrength() {
    const generation = ++comparisonGeneration, exercise = progressExercise.value;
    const container = $('#strength-comparison'); container.replaceChildren();
    if (!exercise) return;
    try {
      const sets = await readFeature(`/api/sets?exercise=${encodeURIComponent(exercise)}`);
      if (generation !== comparisonGeneration) return;
      container.append(element('h2','Recorded load and reps','subheading'));
      const label = element('label','Compare one load convention'); const select = element('select'); label.append(select); container.append(label);
      for (const key of [...new Set(sets.map(set=>`${set.unit}|${set.load_type}`))]) select.add(new Option(key.replace('|',' · ').replace('per_hand','per hand'),key));
      const charts = element('div'); container.append(charts);
      const render = () => {
        const filtered = sets.filter(set=>`${set.unit}|${set.load_type}` === select.value).reverse().slice(-30);
        charts.replaceChildren();
        for (const metric of ['load','reps']) {
          charts.append(element('h3', metric === 'load' ? `Load (${select.value.split('|')[0] || ''})` : 'Reps'));
          const chart = element('div',undefined,'line-chart'); charts.append(chart);
          lineChart(chart, filtered.filter(set=>set[metric] !== null).map(set=>({date:set.activity_date,value:Number(set[metric])})),`${metric} for ${exercise}`);
        }
        const table = element('table',undefined,'record-table'); const caption = element('caption','Latest 30 sets in the selected convention. Unknown loads are omitted from the load plot.'); table.append(caption);
        const head = element('tr'); for (const value of ['Date','Reps','Load']) head.append(element('th',value)); table.append(head);
        for (const set of [...filtered].reverse()) { const row = element('tr'); for (const value of [set.activity_date,set.reps,set.load ?? 'Unknown']) row.append(element('td',String(value))); table.append(row); } charts.append(table);
      };
      select.addEventListener('change',render); render();
    } catch (error) { container.textContent = error.message; }
  }

  async function init() {
    const response = await fetch('/journal.html'); if (!response.ok) throw new Error('Could not load the journal screens.');
    const template = document.createElement('template'); template.innerHTML = await response.text(); $('.page').append(template.content);
    for (const input of document.querySelectorAll('#journal-date, #start-workout-form input[type=date], #food-log-form input[type=date], #photo-form input[type=date]')) input.value = today();
    for (const input of document.querySelectorAll('#water-form input[type=time], #checkin-form input[type=time]')) input.value = timeNow();
    $('#photo-month').value = today().slice(0,7);
    const previous = new Date(); previous.setDate(previous.getDate()-1);
    const yesterday = `${previous.getFullYear()}-${String(previous.getMonth()+1).padStart(2,'0')}-${String(previous.getDate()).padStart(2,'0')}`;
    $('#sleep-form').elements.start.value = `${yesterday}T23:00`; $('#sleep-form').elements.end.value = `${today()}T07:00`;
    for (const kind of ['water','sleep','checkin','steps','food']) {
      const target = $(`#${kind}-form`);
      target.addEventListener('submit', event => { event.preventDefault(); submit(target, async () => {
        const data = fields(target); data.activity_date = kind === 'sleep' ? data.end.slice(0,10) : $('#journal-date').value;
        numeric(data, {water:['ml'], sleep:['quality'], checkin:['bloating','mood','energy'],steps:['count'],food:['kcal']}[kind]);
        await save(kind,data);
      }, () => { if (kind === 'checkin') { target.reset(); target.elements.time.value = timeNow(); } if (kind === 'food') target.reset(); }); });
    }
    for (const button of document.querySelectorAll('[data-water]')) button.addEventListener('click', () => { const target = $('#water-form'); target.elements.ml.value = button.dataset.water; if ($('#journal-date').value === today()) target.elements.time.value = timeNow(); target.requestSubmit(); });
    $('#journal-date').addEventListener('change', () => { $('#steps-form').elements.count.value = ''; renderDaily().catch(showError); });
    $('#start-workout-form').addEventListener('submit', event => { event.preventDefault(); const target = event.currentTarget; submit(target, async () => {
      const data = fields(target); data.day_id = Number(data.day_id); const result = await postBackup('/api/workouts/start', data);
      $('#session-select').append(new Option(result.data.name,result.id)); $('#session-select').value = result.id;
    }); });
    $('#session-select').addEventListener('change', () => renderSession().catch(showError));
    $('#food-select').addEventListener('change',foodCalculation); $('#food-log-form').elements.portions.addEventListener('input',foodCalculation);
    $('#food-log-form').addEventListener('submit', event => { event.preventDefault(); const target=event.currentTarget; submit(target, async () => {
      const data = fields(target), row = rowsOf('food').find(row=>row.id===data.food_id), portions=Number(data.portions);
      if (!row || !Number.isFinite(portions) || portions<=0 || portions>100) throw new Error('Choose a food and 0.01–100 portions.');
      await postBackup('/api/calories', {activity_date:data.activity_date,meal_time:data.meal_time,label:`${row.data.name} (${portions} × ${row.data.portion})`,kcal:Math.round(portions*row.data.kcal)});
    },loadCalories); });
    $('#photo-unlock-form').addEventListener('submit', async event => {
      event.preventDefault(); const target=event.currentTarget, button=target.querySelector('button'); button.disabled=true;
      try { await postBackup('/api/photos/unlock',fields(target)); target.elements.password.value=''; await loadPhotos(); $('#photo-status').textContent='Unlocked for five minutes.'; }
      catch(error) { target.querySelector('.status').textContent=error.message; } finally { button.disabled=false; }
    });
    $('#photo-lock').addEventListener('click', () => lockPhotos().catch(showError));
    $('#backup-unlock-form').addEventListener('submit', async event => {
      event.preventDefault(); const target=event.currentTarget, button=target.querySelector('button'); button.disabled=true;
      try { await postBackup('/api/photos/unlock',fields(target)); target.elements.password.value=''; target.querySelector('.status').textContent='Photo export unlocked for five minutes. Choose Download backup.'; }
      catch(error) { target.querySelector('.status').textContent=error.message; } finally { button.disabled=false; }
    });
    $('#photo-form').addEventListener('submit', event => { event.preventDefault(); const target=event.currentTarget; submit(target, async () => {
      const data=fields(target); data.image=await encodePhoto(data.image); await save('photo',data); photoDay=data.activity_date; $('#photo-month').value=data.activity_date.slice(0,7);
    },async () => { target.elements.image.value=''; await loadPhotos(); }); });
    $('#photo-month').addEventListener('change',renderPhotoCalendar); $('#photo-filter').addEventListener('change',renderPhotoCalendar);
    window.addEventListener('storage', event => { if(event.key==='fitnessos-photo-lock') hidePhotos(); });
    window.addEventListener('pagehide', () => { if(photoUntil) navigator.sendBeacon('/api/photos/lock',new Blob(['{}'],{type:'application/json'})); });
    document.addEventListener('visibilitychange', () => { if(document.hidden && photoUntil) lockPhotos().catch(()=>{}); });
    setInterval(async () => { if(photoUntil) { try { if(!(await readFeature('/api/photos/status')).until) hidePhotos(); } catch { hidePhotos(); } } },10000);
    const comparison=element('section'); comparison.id='strength-comparison'; $('#view-progress .card').append(comparison);
    progressExercise.addEventListener('change',compareStrength);
    // Keep the existing metric selection and data source; replace decorative bars with a labelled line.
    const originalBodyTrend=renderBodyTrend;
    renderBodyTrend = () => { originalBodyTrend(); const metric=$('#body-trend-select').value; const points=bodyRows.map(row=>({date:row.activity_date,value:metricValue(row,metric)})).filter(p=>p.value!==null).reverse().slice(-12); if(points.length) { $('#body-trend-chart').className='line-chart'; lineChart($('#body-trend-chart'),points,`Recorded ${metric}`); const list=element('ul',undefined,'trend-values'); for(const p of points) list.append(element('li',`${p.date}: ${p.value.toFixed(1)}`)); $('#body-trend-chart').append(list); } };
    $('#body-trend-select').addEventListener('change',renderBodyTrend);
    let reminder;
    const banner=element('div',undefined,'reminder-banner'); banner.hidden=true; banner.setAttribute('role','status'); banner.append(element('span','Water check-in: would you like to record a drink?'),action('Open journal',()=>{location.hash='#daily';banner.hidden=true;}),action('Dismiss',()=>banner.hidden=true)); document.body.append(banner);
    $('#water-reminder').addEventListener('change', () => { clearInterval(reminder); banner.hidden=true; const minutes=Number($('#water-reminder').value); if(minutes) reminder=setInterval(()=>banner.hidden=false,minutes*60000); });
    async function route() {
      if(location.hash!=='#photos' && photoUntil) await lockPhotos();
      showRoute(); await refresh();
      if(location.hash==='#progress') await compareStrength();
    }
    window.addEventListener('hashchange',()=>route().catch(showError));
    window.addEventListener('records-changed',()=>{refresh().catch(showError); if(location.hash==='#progress') compareStrength();});
    await route();
  }
  function showError(error) {
    const route=location.hash.slice(1); const target=route==='photos'?'#photo-status':route==='workouts'?'#session-status':route==='foods'?'#food-form .status':'#timeline-status';
    if($(target)) $(target).textContent=error.message;
  }
  init().catch(error => { const message=element('p',error.message,'status error'); $('.page').prepend(message); });
})();
