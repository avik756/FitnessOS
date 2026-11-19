const setEditor = document.createElement('dialog');
setEditor.className = 'set-editor';
setEditor.innerHTML = `<header class="editor-header"><h2>Log a set</h2><button type="button" id="set-close" aria-label="Close set editor">×</button></header><div id="set-editor-content"></div>`;
document.body.append(setEditor);
const entryCard = document.querySelector('#view-log .entry-card');
const entryHome = document.createElement('div');
entryCard.before(entryHome);
let editorReturnRoute = '#home';

let exerciseRequest = 0;
const lastValue = document.createElement('p');
lastValue.className = 'muted';
form.elements.exercise.after(lastValue);
const catalogue = document.createElement('datalist');
catalogue.id = 'common-exercise-options';
form.elements.exercise.setAttribute('list', catalogue.id);
form.append(catalogue);
window.addEventListener('exercise-library-loaded', () => {
  catalogue.replaceChildren(...exercises.map(item => new Option(item.exercise)));
});
const adjustments = document.createElement('div');
adjustments.innerHTML = `<label>Load step <input id="load-step" type="number" min="0.01" max="1000" step="any" value="2.5"></label><div id="load-adjustments" class="quick-links"></div><p id="adjust-status" class="status" role="status"></p>`;
form.elements.load.closest('.pair').after(adjustments);
const stepInput = adjustments.querySelector('input');
const stepKey = () => `fitnessos-step:${form.elements.exercise.value.toLowerCase()}:${form.elements.unit.value}`;
function refreshStep() {
  stepInput.value = '2.5';
  if (window.workspaceSteps?.[stepKey()]) stepInput.value=window.workspaceSteps[stepKey()];
  drawAdjustments();
}
function drawAdjustments() {
  const group = document.querySelector('#load-adjustments');
  group.replaceChildren();
  const step = Number(stepInput.value);
  for (const multiple of [-2, -1, 1, 2]) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'secondary-button';
    button.textContent = `${multiple > 0 ? '+' : '−'}${Number((Math.abs(multiple) * step).toFixed(4))} ${form.elements.unit.value}`;
    button.disabled = !stepInput.checkValidity() || !Number.isFinite(step) || step <= 0;
    button.addEventListener('click', () => {
      const input = form.elements.load;
      const value = Number(input.value) + multiple * step;
      if (input.value === '' || value < 0 || value > 10000) {
        document.querySelector('#adjust-status').textContent = 'Enter a load first and keep adjustments between 0 and 10000.';
        return;
      }
      exerciseRequest++;
      input.value = Number(value.toFixed(4));
      document.querySelector('#adjust-status').textContent = `Draft load ${input.value} ${form.elements.unit.value}.`;
    });
    group.append(button);
  }
}
stepInput.addEventListener('input', () => {
  if (stepInput.checkValidity() && Number(stepInput.value) > 0) {
    try { localStorage.setItem(stepKey(), stepInput.value); } catch {}
    window.saveLoadStep?.(stepKey(), Number(stepInput.value));
  }
  drawAdjustments();
});
async function prefillLastSet() {
  const request = ++exerciseRequest;
  const name = form.elements.exercise.value.trim();
  refreshStep();
  if (!name) { lastValue.textContent = ''; return; }
  form.elements.reps.value = '';
  form.elements.load.value = '';
  lastValue.textContent = 'Loading previous set…';
  try {
    const rows = await readFeature(`/api/sets?exercise=${encodeURIComponent(name)}`);
    if (request !== exerciseRequest) return;
    const row = [...rows].sort((a,b) => b.id - a.id).find(row => row.unit === form.elements.unit.value && row.load_type === form.elements.load_type.value);
    lastValue.textContent = row ? `Last entered · ${row.activity_date} · ${describeSet(row)}` : 'First set in this unit and load convention.';
    form.elements.reps.value = row?.reps ?? '';
    form.elements.load.value = row?.load ?? '';
  } catch { lastValue.textContent = 'Previous set unavailable. Enter values manually.'; }
}
for (const input of [form.elements.exercise, form.elements.reps, form.elements.load]) input.addEventListener('input', () => { exerciseRequest++; });
form.elements.exercise.addEventListener('change', prefillLastSet);
form.elements.unit.addEventListener('change', prefillLastSet);
form.elements.load_type.addEventListener('change', prefillLastSet);
window.openSetEditor = function () {
  if (setEditor.open) return;
  editorReturnRoute = location.hash === '#log' ? '#home' : location.hash || '#home';
  document.querySelector('#set-editor-content').append(entryCard);
  setEditor.showModal();
  refreshStep();
  if (form.elements.exercise.value && !form.elements.reps.value && !form.elements.load.value) prefillLastSet();
  form.elements.exercise.focus();
};
function closeSetEditor() {
  if (saveButton.disabled) return;
  setEditor.close();
}
document.querySelector('#set-close').addEventListener('click', closeSetEditor);
setEditor.addEventListener('cancel', event => { if (saveButton.disabled) event.preventDefault(); });
setEditor.addEventListener('close', () => {
  exerciseRequest++;
  entryHome.after(entryCard);
  if (location.hash === '#log') location.hash = editorReturnRoute;
});
const addAnother = document.createElement('button');
addAnother.type = 'submit'; addAnother.className = 'secondary-button'; addAnother.textContent = 'Save & add another';
addAnother.dataset.keepValues = 'true';
saveButton.after(addAnother);
window.addEventListener('set-saved', event => {
  exerciseRequest++;
  if (!setEditor.open) return;
  lastValue.textContent = `Just saved · ${describeSet(event.detail)}`;
  if (event.detail.keepValues) form.elements.reps.focus();
  else setEditor.close();
});
window.addEventListener('set-exercise-selected', prefillLastSet);
window.addEventListener('set-draft-replaced', () => {
  exerciseRequest++;
  refreshStep();
  lastValue.textContent = 'Copied draft. Review before saving.';
});
document.addEventListener('click', event => {
  const link = event.target.closest('a[href="#log"]');
  if (link) { event.preventDefault(); openSetEditor(); }
});
window.addEventListener('hashchange', () => { if (location.hash === '#log') openSetEditor(); });
if (location.hash === '#log') openSetEditor();
(async function workspaceLayout() {
  let state = await readFeature('/api/workspace');
  if (!state.sections) state = {...state,theme:'dark',font:'serif',sections:[{id:'training',title:'Training',emoji:'🏋️',route:'workouts'},{id:'nutrition',title:'Nutrition',emoji:'🥣',route:'calories'},{id:'journal',title:'Journal',emoji:'📓',route:'daily'}]};
  window.workspaceSteps = state.steps || {};
  window.saveLoadStep = (key,value) => { state.steps = window.workspaceSteps; state.steps[key]=value; persist(); };
  refreshStep();
  let selected = new Set();
  let saving = Promise.resolve();
  let changeNumber = 0;
  const panel = document.createElement('section'); panel.className = 'card stacked-card workspace-layout';
  panel.innerHTML = `<div class="section-head"><h2>Your workspace</h2><button type="button" id="new-section" class="secondary-button">+ Section</button></div><div class="quick-links"><label>Appearance<select id="workspace-theme"><option value="dark">Dark</option><option value="light">Light</option></select></label><label>Type<select id="workspace-font"><option value="serif">Serif</option><option value="sans">Sans</option><option value="mono">Mono</option></select></label><button type="button" id="move-sections" class="secondary-button">Move selected</button></div><p id="layout-status" class="status" role="status"></p><div id="section-tree"></div>`;
  document.querySelector('#view-home').append(panel);
  const sidebarTree = document.createElement('nav');
  sidebarTree.className='workspace-navigation'; sidebarTree.setAttribute('aria-label','Your sections');
  document.querySelector('.sidebar .brand').after(sidebarTree);
  const breadcrumb=document.createElement('span');breadcrumb.className='workspace-breadcrumb';document.querySelector('.topbar').prepend(breadcrumb);
  const status = panel.querySelector('#layout-status');
  const tree = panel.querySelector('#section-tree');
  const theme = panel.querySelector('#workspace-theme'); const font = panel.querySelector('#workspace-font');
  theme.value = state.theme || 'dark'; font.value = state.font || 'serif';
  function appearance() {
    document.documentElement.dataset.theme = theme.value;
    document.documentElement.dataset.font = font.value;
    try { localStorage.setItem('fitnessos-appearance',JSON.stringify({theme:theme.value,font:font.value,density:document.documentElement.dataset.density||'comfortable'})); } catch {}
  }
  function persist() {
    state.theme=theme.value; state.font=font.value; appearance();
    const snapshot=JSON.parse(JSON.stringify(state));
    const version=++changeNumber;
    status.textContent='Saving workspace…';
    saving=saving.catch(()=>{}).then(()=>postBackup('/api/workspace',snapshot)).then(()=>{if(version===changeNumber)status.textContent='Workspace saved.';}).catch(error=>{status.textContent=`${error.message} Layout remains in this page. Try another change to save again.`;});
  }
  for (const input of [theme,font]) input.addEventListener('change',persist);
  function isDescendant(identity, parent) {
    while (parent) {
      if (identity === parent) return true;
      parent = state.sections.find(item=>item.id===parent)?.parent;
    }
    return false;
  }
  function move(ids,parent,before=null) {
    if (ids.some(id=>isDescendant(id,parent))) {status.textContent='A section cannot contain itself or its parent.';return;}
    const roots=ids.filter(id=>!ids.some(other=>other!==id && isDescendant(other,state.sections.find(item=>item.id===id)?.parent)));
    const items=state.sections.filter(item=>roots.includes(item.id));
    state.sections=state.sections.filter(item=>!roots.includes(item.id));
    for(const item of items) item.parent=parent;
    if (roots.includes(before)) before = null;
    const index=state.sections.findIndex(item=>item.id===before);
    state.sections.splice(index<0?state.sections.length:index,0,...items);
    selected.clear(); render(); persist();
  }
  const editDialog=document.createElement('dialog'); editDialog.className='quick-dialog';
  editDialog.innerHTML=`<form method="dialog" class="section-editor"><h2>Edit section</h2><label>Title<input name="title" maxlength="80" required></label><label>Emoji<input name="emoji" maxlength="16"></label><label>Open page<select name="route"></select></label><label>Colour<select name="color"></select></label><div class="quick-links"><button class="primary-button" value="save">Save section</button><button type="button" id="section-cancel" class="secondary-button">Cancel</button></div></form>`;
  document.body.append(editDialog);
  const editForm=editDialog.querySelector('form'); let editing;
  for(const route of ['home','workouts','log','calories','foods','body','daily','history','progress','photos','make','backup']) editForm.elements.route.add(new Option(route,route));
  for(const color of ['default','gray','brown','orange','yellow','green','blue','purple','pink','red']) editForm.elements.color.add(new Option(color,color));
  editDialog.querySelector('#section-cancel').onclick=()=>editDialog.close();
  editForm.addEventListener('submit',event=>{
    event.preventDefault();
    const data=Object.fromEntries(new FormData(editForm));
    if(!data.title.trim()) return;
    if(editing) Object.assign(editing,data); else state.sections.push({id:crypto.randomUUID(),...data});
    editDialog.close(); render(); persist();
  });
  function edit(item) {
    editing=item;
    for(const field of ['title','emoji','route','color']) editForm.elements[field].value=item?.[field]||({route:'daily',color:'default'}[field]||'');
    editDialog.showModal(); editForm.elements.title.focus();
  }
  panel.querySelector('#new-section').onclick=()=>edit(null);
  panel.querySelector('#move-sections').onclick=()=>{
    if(!selected.size){status.textContent='Select sections with their checkboxes or drag from empty space.';return;}
    const dialog=document.createElement('dialog'); dialog.className='quick-dialog';
    const box=document.createElement('div');box.className='section-editor'; const heading=document.createElement('h2');heading.textContent='Move selected sections';box.append(heading);
    const select=document.createElement('select');select.setAttribute('aria-label','Destination section');select.add(new Option('Workspace root',''));
    for(const item of state.sections) if(![...selected].some(id=>isDescendant(id,item.id))) select.add(new Option(`${item.emoji||''} ${item.title}`,item.id));
    const button=document.createElement('button');button.className='primary-button';button.textContent='Move here';button.onclick=()=>{move([...selected],select.value||null);dialog.close();};
    box.append(select,button);dialog.append(box);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();
  };
  function render() {
    tree.replaceChildren(); sidebarTree.replaceChildren();
    function branch(parent,depth) {
      for(const item of state.sections.filter(item=>(item.parent||null)===parent)) {
        const row=document.createElement('div'); row.className='workspace-row';row.dataset.section=item.id;row.dataset.color=item.color||'default';row.style.marginLeft=`${depth*22}px`;
        row.classList.toggle('selected',selected.has(item.id));
        const check=document.createElement('input');check.type='checkbox';check.checked=selected.has(item.id);check.setAttribute('aria-label',`Select ${item.title}`);check.onchange=()=>{if(check.checked)selected.add(item.id);else selected.delete(item.id);row.classList.toggle('selected',check.checked);};
        const grip=document.createElement('button');grip.textContent='⠿';grip.draggable=true;grip.title='Drag before another section; hold Shift to nest';grip.setAttribute('aria-label',`Move ${item.title}`);
        grip.ondragstart=event=>{event.dataTransfer.setData('text/plain',JSON.stringify(selected.has(item.id)?[...selected]:[item.id]));event.dataTransfer.effectAllowed='move';};
        row.ondragover=event=>{event.preventDefault();row.classList.add('drop-target');};row.ondragleave=()=>row.classList.remove('drop-target');
        row.ondrop=event=>{event.preventDefault();row.classList.remove('drop-target');try{const ids=JSON.parse(event.dataTransfer.getData('text/plain'));if(Array.isArray(ids)&&ids.every(id=>state.sections.some(s=>s.id===id)))move(ids,event.shiftKey?item.id:item.parent||null,event.shiftKey?null:item.id);}catch{}};
        const toggle=document.createElement('button');toggle.textContent=item.collapsed?'▸':'▾';toggle.setAttribute('aria-label',`Toggle ${item.title}`);toggle.onclick=()=>{item.collapsed=!item.collapsed;render();persist();};
        const link=document.createElement('a');link.href=`#${item.route||'daily'}`;link.textContent=`${item.emoji||''} ${item.title}`;
        const settings=document.createElement('button');settings.textContent='•••';settings.setAttribute('aria-label',`Edit ${item.title}`);settings.onclick=()=>edit(item);
        row.append(check,grip,toggle,link,settings);tree.append(row);
        const navLink=link.cloneNode(true);navLink.style.paddingLeft=`${10+depth*12}px`;sidebarTree.append(navLink);
        for(const target of [link,navLink]) target.addEventListener('click',()=>{
          const path=[];let node=item;
          while(node){path.unshift(`${node.emoji||''} ${node.title}`);node=state.sections.find(s=>s.id===node.parent);}
          breadcrumb.textContent=path.join(' / ');
        });
        if(!item.collapsed)branch(item.id,depth+1);
      }
    }
    branch(null,0);
  }
  // Rectangle selection begins only in blank workspace space, never over text or controls.
  tree.addEventListener('pointerdown',event=>{
    if(event.target!==tree || event.button!==0) return;
    const start={x:event.clientX,y:event.clientY};const rectangle=document.createElement('div');rectangle.className='selection-rectangle';document.body.append(rectangle);
    tree.setPointerCapture(event.pointerId);selected.clear();
    const update=event=>{
      const left=Math.min(start.x,event.clientX),top=Math.min(start.y,event.clientY),right=Math.max(start.x,event.clientX),bottom=Math.max(start.y,event.clientY);
      Object.assign(rectangle.style,{left:`${left}px`,top:`${top}px`,width:`${right-left}px`,height:`${bottom-top}px`});
      for(const row of tree.querySelectorAll('.workspace-row')){
        const b=row.getBoundingClientRect(), hit=b.right>left&&b.left<right&&b.bottom>top&&b.top<bottom;
        if(hit)selected.add(row.dataset.section);else selected.delete(row.dataset.section);
        row.classList.toggle('selected',hit);row.querySelector('input').checked=hit;
      }
    };
    const end=()=>{rectangle.remove();tree.removeEventListener('pointermove',update);tree.removeEventListener('pointerup',end);tree.removeEventListener('pointercancel',end);};
    tree.addEventListener('pointermove',update);tree.addEventListener('pointerup',end);tree.addEventListener('pointercancel',end);
  });
  appearance();render();
  window.dispatchEvent(new CustomEvent('workspace-ready',{detail:{state,persist}}));
  if (!Object.keys(await readFeature('/api/workspace')).length) persist();
})().catch(error=>{showSaveStatus(`Workspace could not load: ${error.message}`,'error');});

const savedToast=document.createElement('p');savedToast.className='saved-toast';savedToast.setAttribute('role','status');savedToast.hidden=true;document.body.append(savedToast);
let savedToastTimeout;
window.addEventListener('set-saved',event=>{
  savedToast.textContent=`Saved ${event.detail.exercise} · ${describeSet(event.detail)}`;savedToast.hidden=false;
  clearTimeout(savedToastTimeout);savedToastTimeout=setTimeout(()=>savedToast.hidden=true,5000);
});
