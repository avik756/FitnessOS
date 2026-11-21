/* Keep the original live DOM and event handlers while composing each tool page. */
(() => {
  const routes=['home','workouts','history','calories','daily','body','foods','make','progress'];
  const mounted=new Map();let workspace,journalLoaded=false;
  const button=(text,action)=>{const b=document.createElement('button');b.type='button';b.className='text-button';b.textContent=text;b.onclick=action;return b;};
  function mount(route){
    if(["daily","workouts","foods"].includes(route)&&!journalLoaded)return;
    const view=document.querySelector(`[data-view="${route}"]`);
    if(!workspace||!view||mounted.has(route))return;
    const panels=route==='home'
      ? [...view.querySelectorAll('.stat-grid > .stat-card, .home-grid > .card'),
         view.querySelector('.workspace-layout'),view.querySelector('#workspace-page-links')].filter(Boolean)
      : [...view.querySelectorAll('.card')].filter(n=>!n.parentElement.closest('.card'));
    if(!panels.length)return;
    const {state,persist}=workspace;
    const toolbar=document.createElement('div');toolbar.className='layout-tools';
    const grid=document.createElement('div');grid.className='composable-grid';
    const registry=new Map();let editing=false;
    const defaultColumns=['home','daily','history','body'].includes(route)?2:1;
    const homeTitles=['Sets logged','Days with records','Pick up where you left off','Quick start','Your workspace','Your pages'];
    const defaults=panels.map((panel,index)=>({id:route==='home'?['home-sets','home-days','home-recent','home-quick','home-workspace','home-pages'][index]:panel.id||panel.querySelector('[id]')?.id||`${route}-panel-${index}`,hidden:false,collapsed:false,span:route==='home'&&index>=4?2:1}));
    const layout=()=>{const saved=state.screen_layouts[route]||{columns:defaultColumns,panels:[]};return {...saved,panels:[...saved.panels,...defaults.filter(d=>!saved.panels.some(p=>p.id===d.id))]};};
    function edit(change){const value=JSON.parse(JSON.stringify(layout()));change(value);state.screen_layouts[route]=value;persist();render();}
    const customize=button('Customize page',()=>{editing=!editing;render();});
    const columns=document.createElement('select');columns.setAttribute('aria-label','Page columns');columns.append(new Option('One column','1'),new Option('Two columns','2'));columns.onchange=()=>edit(l=>l.columns=Number(columns.value));
    const restore=document.createElement('select');restore.setAttribute('aria-label','Restore hidden panel');restore.onchange=()=>{if(restore.value)edit(l=>{const p=l.panels.find(p=>p.id===restore.value);if(p)p.hidden=false;});};
    const reset=button('Reset layout',()=>{if(confirm('Restore this page\'s original layout? Your records and form drafts stay intact.'))edit(l=>Object.assign(l,{columns:defaultColumns,panels:defaults.map(p=>({...p}))}));});
    const add=document.createElement('select');add.setAttribute('aria-label','Add record view');add.append(new Option('Add record view…',''));
    for(const [kind,label] of Object.entries({sets:'Set history',meals:'Meals',body:'Body records',journal:'Journal entries',workouts:'Workout sessions'}))add.add(new Option(label,kind));
    add.onchange=()=>{if(add.value)edit(l=>l.panels.push({id:crypto.randomUUID(),kind:add.value,hidden:false,collapsed:false}));add.value='';};
    const hint=document.createElement('span');hint.className='layout-hint';hint.textContent='Drag the grip over a panel to choose where it goes. Use Move up/down on touch or keyboard.';
    toolbar.append(customize,hint,columns,restore,add,reset);view.querySelector('.page-heading')?.after(toolbar);view.append(grid);
    function place(source,target,after){
      if(!source||!registry.has(source)||source===target)return;
      const current=layout().panels.map(p=>p.id),from=current.indexOf(source),to=current.indexOf(target);
      if(from<0||to<0||(after&&from===to+1)||(!after&&from===to-1))return;
      edit(l=>{const [item]=l.panels.splice(from,1);const at=l.panels.findIndex(p=>p.id===target);l.panels.splice(at+(after?1:0),0,item);});
    }
    function register(panel,identity,index=0){
      const wrapper=document.createElement('section');wrapper.className='composable-panel';wrapper.dataset.panel=identity;
      const title=route==='home' && defaults[index]?.id===identity ? homeTitles[index]
        : panel.querySelector('h2,summary')?.textContent||panel.querySelector('form')?.querySelector('button[type=submit],button.primary-button')?.textContent||({history:'Calendar',workouts:index?'Saved session':'Start workout'}[route])||`Panel ${index+1}`;
      const controls=document.createElement('div');controls.className='panel-controls';
      const label=document.createElement('span');label.textContent=title;
      const move=direction=>{const at=layout().panels.findIndex(p=>p.id===identity),to=at+direction;
        if(at<0||to<0||to>=layout().panels.length)return;
        edit(l=>{const [p]=l.panels.splice(at,1);l.panels.splice(to,0,p);});};
      const collapse=button('Collapse',()=>edit(l=>{const p=l.panels.find(p=>p.id===identity);p.collapsed=!p.collapsed;}));
      collapse.classList.add('panel-expand');
      const width=button('Full width',()=>edit(l=>{const p=l.panels.find(p=>p.id===identity);p.span=p.span===2?1:2;}));
      const grip=button('⋮⋮',()=>{});grip.className='panel-grip';grip.draggable=true;grip.title=`Drag ${title} to move`;grip.setAttribute('aria-label',`Drag ${title} to move`);
      controls.append(grip,label,button('Move up',()=>move(-1)),button('Move down',()=>move(1)),width,collapse,button('Remove view',()=>edit(l=>l.panels.find(p=>p.id===identity).hidden=true)));
      if(panel.querySelector('.record-view')){
        const filter=document.createElement('input');filter.type='search';filter.maxLength=80;filter.placeholder='Exercise filter';
        filter.setAttribute('aria-label','Filter set view by exercise');filter.hidden=true;
        filter.onchange=()=>edit(l=>{const p=l.panels.find(p=>p.id===identity);p.exercise=filter.value.trim();});
        controls.append(filter);
      }
      if(state.screen_layouts[route]?.panels.find(p=>p.id===identity)?.kind)
        controls.append(button('Duplicate view',()=>edit(l=>{const original=l.panels.find(p=>p.id===identity);if(original?.kind)l.panels.push({...original,id:crypto.randomUUID(),hidden:false});})));
      const zones=['before','after'].map(side=>{
        const zone=document.createElement('div');zone.className=`panel-drop-zone panel-drop-${side}`;
        return zone;
      });
      const clearDrop=()=>zones.forEach(zone=>zone.classList.remove('active'));
      const sideAt=e=>e.clientY < wrapper.getBoundingClientRect().top+wrapper.offsetHeight/2 ? 'before':'after';
      const accepts=e=>editing&&e.dataTransfer?.types.includes('application/x-fitnessos-panel');
      wrapper.ondragover=e=>{if(!accepts(e))return;e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect='move';const side=sideAt(e);zones.forEach(zone=>zone.classList.toggle('active',zone.classList.contains(`panel-drop-${side}`)));};
      wrapper.ondragleave=e=>{if(!wrapper.contains(e.relatedTarget))clearDrop();};
      wrapper.ondrop=e=>{if(!accepts(e))return;e.preventDefault();e.stopPropagation();const side=sideAt(e);clearDrop();
        try{const data=JSON.parse(e.dataTransfer.getData('application/x-fitnessos-panel'));if(data.route===route)place(data.id,identity,side==='after');}catch{}};
      wrapper.append(zones[0],controls,panel,zones[1]);grid.append(wrapper);registry.set(identity,{wrapper,panel,title,collapse,width});
      grip.ondragstart=e=>{if(!editing){e.preventDefault();return;}e.stopPropagation();e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('application/x-fitnessos-panel',JSON.stringify({route,id:identity}));wrapper.classList.add('dragging');};
      grip.ondragend=()=>{wrapper.classList.remove('dragging');grid.querySelectorAll('.panel-drop-zone.active').forEach(zone=>zone.classList.remove('active'));};
      let touch=null;
      grip.onpointerdown=e=>{if(!editing||e.pointerType==='mouse')return;touch={x:e.clientX,y:e.clientY,target:null,after:false,moved:false};grip.setPointerCapture(e.pointerId);};
      grip.onpointermove=e=>{if(!touch)return;
        if(!touch.moved&&Math.hypot(e.clientX-touch.x,e.clientY-touch.y)<7)return;
        touch.moved=true;wrapper.classList.add('dragging');
        const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.composable-panel');
        grid.querySelectorAll('.panel-drop-zone.active').forEach(zone=>zone.classList.remove('active'));
        touch.target=target&&grid.contains(target)&&target!==wrapper?target:null;
        if(touch.target){touch.after=e.clientY>=touch.target.getBoundingClientRect().top+touch.target.offsetHeight/2;
          touch.target.querySelector(touch.after?'.panel-drop-after':'.panel-drop-before')?.classList.add('active');}
      };
      const endTouch=e=>{if(!touch)return;if(e.type==='pointerup'&&touch.moved)grip.onpointermove(e);
        const drop=touch;touch=null;wrapper.classList.remove('dragging');
        grid.querySelectorAll('.panel-drop-zone.active').forEach(zone=>zone.classList.remove('active'));
        if(e.type==='pointerup'&&drop.moved&&drop.target)place(identity,drop.target.dataset.panel,drop.after);
      };
      grip.onpointerup=endTouch;grip.onpointercancel=endTouch;
    }
    panels.forEach((panel,index)=>register(panel,defaults[index].id,index));
    for(const empty of view.querySelectorAll('.two-column,.home-grid,.stat-grid'))if(!empty.children.length)empty.remove();
    function render(){
      const value=layout();grid.dataset.columns=value.columns;grid.classList.toggle('editing-layout',editing);customize.textContent=editing?'Done customizing':'Customize page';columns.value=value.columns;hint.hidden=columns.hidden=restore.hidden=add.hidden=reset.hidden=!editing;
      restore.replaceChildren(new Option('Restore hidden panel…',''));
      // New application panels are appended once; unknown saved IDs stay available for future versions.
      const items=[...value.panels,...defaults.filter(d=>!value.panels.some(p=>p.id===d.id))];
      for(const [identity,entry] of registry)if(!items.some(p=>p.id===identity)){entry.wrapper.remove();registry.delete(identity);}
      for(const item of items){if(item.kind&&!registry.has(item.id)){const panel=document.createElement('div');panel.className='card';panel.append(window.renderRecordView(item));register(panel,item.id);}
        const entry=registry.get(item.id);if(!entry)continue;grid.append(entry.wrapper);entry.wrapper.hidden=item.hidden;entry.panel.hidden=item.collapsed;entry.wrapper.classList.toggle('collapsed-panel',item.collapsed);entry.wrapper.classList.toggle('panel-wide',item.span===2);entry.collapse.textContent=item.collapsed?'Expand':'Collapse';entry.width.textContent=item.span===2?'Half width':'Full width';
        const filter=entry.wrapper.querySelector('input[type=search]');if(filter){filter.hidden=item.kind!=='sets';if(filter.value!==String(item.exercise||'')){filter.value=item.exercise||'';entry.panel.querySelector('.record-view')?.setExercise?.(filter.value);}}
        if(item.hidden)restore.add(new Option(entry.title,item.id));}
    }
    mounted.set(route,{render,reveal(target){const entry=[...registry.values()].find(v=>v.panel===target||v.panel.contains(target));if(!entry)return;
      if(entry.wrapper.hidden||entry.panel.hidden)edit(l=>{const p=l.panels.find(p=>p.id===entry.wrapper.dataset.panel);if(p){p.hidden=false;p.collapsed=false;}});
      target.closest('details')?.setAttribute('open','');}});
    render();
  }
  function init(){for(const route of routes)mount(route);}
  window.addEventListener('workspace-ready',({detail})=>{workspace=detail;detail.state.screen_layouts||={};init();});
  window.addEventListener('journal-ready',()=>{journalLoaded=true;init();});
  window.addEventListener('records-changed',()=>{for(const view of document.querySelectorAll('.composable-grid .record-view'))view.refreshRecords?.();});
  window.addEventListener('workspace-reset',()=>{workspace.state.screen_layouts||={};for(const page of mounted.values())page.render();});
  window.addEventListener('reveal-panel',event=>{for(const page of mounted.values())page.reveal(event.detail);});
  document.addEventListener('click',event=>{const link=event.target.closest('[data-quick-focus]');if(!link)return;const target=document.querySelector(link.dataset.quickFocus);if(target)for(const page of mounted.values())page.reveal(target);},true);
})();
