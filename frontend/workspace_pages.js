/* User-authored pages share the existing workspace save and fitness APIs. */
window.addEventListener('workspace-ready', ({detail:{state,persist}}) => {
  const root = document.querySelector('#view-page');
  const home = document.querySelector('#view-home');
  const sidebar = document.querySelector('.workspace-navigation');
  const button = (label, action, className='secondary-button') => {
    const node=document.createElement('button'); node.type='button'; node.className=className;
    node.textContent=label; node.addEventListener('click',action); return node;
  };
  const id = () => crypto.randomUUID();
  const routes = {home:'Overview',workouts:'Workout sessions',log:'Log a set',calories:'Nutrition',foods:'Food library',body:'Body',daily:'Daily journal',history:'History',progress:'Progress',photos:'Photos',make:'Make a routine',backup:'Backup',exercises:'Exercises'};
  if (!Array.isArray(state.pages)) {
    const old = state.sections || [];
    state.pages=old.map(section=>({id:section.id,parent:section.parent||null,title:section.title,emoji:section.emoji||'📄'}));
    if (!state.pages.length) state.pages=[{id:'training',parent:null,title:'Training',emoji:'🏋️'}];
    state.blocks=old.map(section=>({id:id(),page:section.id,parent:null,kind:'tool',route:section.route||'home',title:`Open ${routes[section.route]||'tool'}`}));
    const first=state.pages.find(page=>page.id==='training')||state.pages[0];
    state.blocks.push({id:id(),page:first.id,parent:null,kind:'section',title:'Today',collapsed:false});
    state.blocks.push({id:id(),page:first.id,parent:null,kind:'sets',title:'Recent sets',exercise:''});
    persist();
  }
  state.blocks ||= [];
  if(!state.starter_views_v2){
    for(const [key,title,kind,route] of [['training','Training','workouts','workouts'],['history','History','sets','history'],['nutrition','Nutrition','meals','calories'],['journal','Journal','journal','daily'],['body','Body','body','body']]){
      let page=state.pages.find(p=>p.id===key);
      if(!page){page={id:key,title,emoji:'',parent:null};state.pages.push(page);}
      if(!state.blocks.some(b=>b.page===page.id&&b.kind===kind))state.blocks.push({id:id(),page:page.id,parent:null,kind,title});
      if(!state.blocks.some(b=>b.page===page.id&&b.route===route))state.blocks.push({id:id(),page:page.id,parent:null,kind:'tool',route,title:'Open '+title});
    }state.starter_views_v2=true;persist();
  }
  window.fitnessPages = state.pages;
  let selected=new Set();let editingBlocks=false;
  let request=0;
  let lastRoute='';
  const pageFor = () => {
    if(!location.hash.startsWith('#page/'))return null;
    try {return state.pages.find(p=>p.id===decodeURIComponent(location.hash.slice(6)))} catch {return null}
  };
  const children = (page,parent) => state.blocks.filter(b=>b.page===page && (b.parent||null)===parent);
  const parentPage = page => state.pages.find(p=>p.id===page?.parent);
  function breadcrumbs(page) {
    const path=[], seen=new Set();
    while(page && !seen.has(page.id)){seen.add(page.id);path.unshift(page);page=parentPage(page);}
    return path;
  }
  function nav() {
    const mobile=document.querySelector('.mobile-nav [data-nav=page]');
    if(mobile && state.pages.length)mobile.href=`#page/${encodeURIComponent(state.pages[0].id)}`;
    sidebar.querySelectorAll('.custom-page-link').forEach(node=>node.remove());
    const listed=new Set();
    function branch(parent,depth) {
      for(const page of state.pages.filter(p=>(p.parent||null)===parent)) {
        if(listed.has(page.id)) continue;
        listed.add(page.id);
        const link=document.createElement('a');link.href=`#page/${encodeURIComponent(page.id)}`;
        link.className='custom-page-link';link.style.paddingLeft=`${10+Math.min(depth,4)*16}px`;
        link.textContent=`${page.emoji||'📄'} ${page.title}`;
        if(pageFor()?.id===page.id) link.setAttribute('aria-current','page');
        sidebar.append(link);branch(page.id,depth+1);
      }
    }
    branch(null,0);
    const homePages=document.querySelector('#workspace-page-links')||document.createElement('div');
    homePages.id='workspace-page-links';homePages.className='workspace-page-links';
    if(!homePages.isConnected)home.append(homePages);
    homePages.replaceChildren();
    const heading=document.createElement('h2');heading.textContent='Your pages';homePages.append(heading);
    for(const page of state.pages.filter(p=>!p.parent)){
      const link=document.createElement('a');link.href=`#page/${encodeURIComponent(page.id)}`;
      link.className='secondary-button';link.textContent=`${page.emoji||'📄'} ${page.title}`;homePages.append(link);
    }
    homePages.append(button('+ New page',()=>editPage()));
  }
  const dialog=document.createElement('dialog');dialog.className='quick-dialog page-edit-dialog';
  dialog.innerHTML='<form class="section-editor"><h2>Edit page</h2><label>Title<input name="title" maxlength="80" required></label><label>Icon or emoji<input name="emoji" maxlength="16"></label><label>Inside page<select name="parent"></select></label><div class="quick-links"><button class="primary-button">Save page</button><button type="button" class="secondary-button" data-cancel>Cancel</button></div></form>';
  document.body.append(dialog);dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
  function editPage(page=null,defaultParent=null) {
    const fields=dialog.querySelector('form').elements, parent=fields.parent;
    parent.replaceChildren(new Option('Top level',''));
    for(const candidate of state.pages) if(candidate!==page && !isPageDescendant(candidate.id,page?.id)) parent.add(new Option(`${candidate.emoji||''} ${candidate.title}`,candidate.id));
    fields.title.value=page?.title||'';fields.emoji.value=page?.emoji||'';
    parent.value=page?.parent||defaultParent||'';
    dialog.querySelector('form').onsubmit=event=>{
      event.preventDefault();const title=fields.title.value.trim();if(!title)return;
      if(page)Object.assign(page,{title,emoji:fields.emoji.value,parent:parent.value||null});
      else {page={id:id(),title,emoji:fields.emoji.value,parent:parent.value||null};state.pages.push(page);}
      dialog.close();persist();nav();location.hash=`#page/${encodeURIComponent(page.id)}`;render();window.dispatchEvent(new Event('fitness-pages-changed'));
    };
    dialog.showModal();fields.title.focus();
  }
  function isPageDescendant(candidate, ancestor) {
    if(!ancestor)return false;
    const seen=new Set();
    while(candidate&&!seen.has(candidate)){if(candidate===ancestor)return true;seen.add(candidate);candidate=state.pages.find(p=>p.id===candidate)?.parent;}
    return false;
  }
  const blockDialog=document.createElement('dialog');blockDialog.className='quick-dialog page-edit-dialog';
  blockDialog.innerHTML='<form class="section-editor"><h2>Content block</h2><label>Type<select name="kind"><option value="text">Note</option><option value="heading">Heading</option><option value="section">Section</option><option value="divider">Divider</option><option value="sets">Set history</option><option value="meals">Meals</option><option value="body">Body records</option><option value="journal">Journal entries</option><option value="workouts">Workout sessions</option><option value="tool">Tool link</option><option value="action">Quick action</option></select></label><label>Title<input name="title" maxlength="80"></label><label>Text<textarea name="text" maxlength="4000"></textarea></label><label>Exercise filter (blank means all)<input name="exercise" maxlength="80"></label><label>Tool<select name="route"></select></label><label>Inside section<select name="parent"></select></label><div class="quick-links"><button class="primary-button">Save block</button><button type="button" class="secondary-button" data-cancel>Cancel</button></div></form>';
  document.body.append(blockDialog);blockDialog.querySelector('[data-cancel]').onclick=()=>blockDialog.close();
  for(const [route,label] of Object.entries(routes))blockDialog.querySelector('[name=route]').add(new Option(label,route));
  const routeField=blockDialog.querySelector('[name=route]');
  const kindField=blockDialog.querySelector('[name=kind]');
  function restrictRoutes(){
    for(const option of routeField.options)option.hidden=kindField.value==='action'&&!['log','workouts','calories','daily'].includes(option.value);
    if(routeField.selectedOptions[0]?.hidden)routeField.value='log';
  }
  kindField.addEventListener('change',restrictRoutes);
  function editBlock(block=null,inside=null) {
    const page=pageFor();if(!page)return;
    const fields=blockDialog.querySelector('form').elements;
    fields.parent.replaceChildren(new Option('Page root',''));
    for(const candidate of state.blocks.filter(b=>b.page===page.id&&b.kind==='section'&&b!==block&&!isBlockDescendant(candidate.id,block?.id)))fields.parent.add(new Option(candidate.title||'Untitled section',candidate.id));
    fields.kind.value=block?.kind||'text';fields.kind.disabled=Boolean(block);
    for(const key of ['title','text','exercise'])fields[key].value=block?.[key]||'';
    fields.route.value=block?.route||'home';restrictRoutes();fields.parent.value=block?.parent||inside||'';
    blockDialog.querySelector('form').onsubmit=event=>{
      event.preventDefault();const data={title:fields.title.value.trim(),text:fields.text.value,exercise:fields.exercise.value.trim(),route:fields.route.value,parent:fields.parent.value||null};
      if(block)Object.assign(block,data);
      else state.blocks.push({id:id(),page:page.id,kind:fields.kind.value,collapsed:false,...data});
      blockDialog.close();persist();render();
    };
    blockDialog.showModal();fields.title.focus();
  }
  function isBlockDescendant(candidate,ancestor){
    if(!ancestor)return false;
    const seen=new Set();
    while(candidate&&!seen.has(candidate)){if(candidate===ancestor)return true;seen.add(candidate);candidate=state.blocks.find(b=>b.id===candidate)?.parent;}
    return false;
  }
  function move(ids,destination,before=null,targetPageId=null) {
    const page=pageFor();
    targetPageId ||= page?.id;
    if(!state.pages.some(p=>p.id===targetPageId))return false;
    const roots=state.blocks.filter(b=>b.page===page.id&&ids.includes(b.id)&&!ids.some(other=>other!==b.id&&isBlockDescendant(b.parent,other)));
    if(!roots.length||roots.some(b=>isBlockDescendant(destination,b.id))||roots.some(b=>b.id===destination))return false;
    const target=destination&&state.blocks.find(b=>b.id===destination);
    if(destination&&(!target||target.page!==targetPageId||target.kind!=='section'))return false;
    if(before && !state.blocks.some(b=>b.id===before&&b.page===targetPageId&&(b.parent||null)===(destination||null)))return false;
    if(before&&roots.some(b=>b.id===before))return false;
    const rootIds=new Set(roots.map(b=>b.id));
    state.blocks=state.blocks.filter(b=>!rootIds.has(b.id));
    for(const b of state.blocks)if(roots.some(root=>isBlockDescendant(b.id,root.id)))b.page=targetPageId;
    roots.forEach(b=>{b.parent=destination||null;b.page=targetPageId});
    const at=before?state.blocks.findIndex(b=>b.id===before):state.blocks.length;
    state.blocks.splice(at,0,...roots);
    selected.clear();persist();render();return true;
  }
  function moveDialog() {
    const page=pageFor();if(!page||!selected.size)return;
    const box=document.createElement('dialog');box.className='quick-dialog page-edit-dialog';
    const panel=document.createElement('div');panel.className='section-editor';
    const title=document.createElement('h2');title.textContent=`Move ${selected.size} selected block(s)`;
    const pagePicker=document.createElement('select');pagePicker.setAttribute('aria-label','Destination page');
    for(const p of state.pages)pagePicker.add(new Option(`${p.emoji||'📄'} ${p.title}`,p.id));
    pagePicker.value=page.id;
    const parent=document.createElement('select');parent.setAttribute('aria-label','Destination section');parent.add(new Option('Page root',''));
    function choices(){parent.replaceChildren(new Option('Page root',''));
      for(const b of state.blocks.filter(b=>b.page===pagePicker.value&&b.kind==='section'&&![...selected].some(s=>isBlockDescendant(b.id,s))))parent.add(new Option(b.title||'Untitled section',b.id));
    }
    pagePicker.onchange=choices;choices();
    const action=button('Move here',()=>{if(move([...selected],parent.value||null,null,pagePicker.value)){box.close();location.hash=`#page/${encodeURIComponent(pagePicker.value)}`;}else title.textContent='Choose a valid destination.'},'primary-button');
    const cancel=button('Cancel',()=>box.close());panel.append(title,pagePicker,parent,action,cancel);box.append(panel);document.body.append(box);
    box.addEventListener('close',()=>box.remove());box.showModal();
  }
  function blockElement(block,depth) {
    const wrap=document.createElement('div');wrap.className='page-block';wrap.dataset.block=block.id;
    wrap.style.setProperty('--depth',String(Math.min(depth,5)));
    wrap.classList.toggle('selected',selected.has(block.id));
    const toolbar=document.createElement('div');toolbar.className='block-toolbar';
    toolbar.draggable=true;toolbar.setAttribute('aria-label',`Drag ${block.title||block.kind} to move`);
    toolbar.addEventListener('dragstart',event=>{
      if(!editingBlocks){event.preventDefault();return;}
      event.stopPropagation();event.dataTransfer.effectAllowed='move';
      event.dataTransfer.setData('application/x-fitnessos-blocks',JSON.stringify(selected.has(block.id)?[...selected]:[block.id]));
    });
    toolbar.addEventListener('dragend',()=>root.querySelectorAll('.page-block.drop-target').forEach(node=>{
      node.classList.remove('drop-target');delete node.dataset.dropPosition;
    }));
    const dropPosition=event=>{
      if(event.shiftKey&&block.kind==='section')return 'inside';
      const rect=wrap.getBoundingClientRect(),fraction=(event.clientY-rect.top)/rect.height;
      if(block.kind==='section'&&fraction>.35&&fraction<.65)return 'inside';
      return fraction<.5?'before':'after';
    };
    wrap.addEventListener('dragover',event=>{
      if(!editingBlocks||!event.dataTransfer.types.includes('application/x-fitnessos-blocks'))return;
      event.preventDefault();event.stopPropagation();event.dataTransfer.dropEffect='move';
      wrap.classList.add('drop-target');wrap.dataset.dropPosition=dropPosition(event);
    });
    wrap.addEventListener('dragleave',event=>{if(!wrap.contains(event.relatedTarget)){wrap.classList.remove('drop-target');delete wrap.dataset.dropPosition;}});
    wrap.addEventListener('drop',event=>{
      event.preventDefault();event.stopPropagation();const position=dropPosition(event);
      wrap.classList.remove('drop-target');delete wrap.dataset.dropPosition;
      try{
        const ids=JSON.parse(event.dataTransfer.getData('application/x-fitnessos-blocks'));
        if(!Array.isArray(ids)||!ids.length||!ids.every(id=>state.blocks.some(b=>b.id===id&&b.page===block.page)))return;
        if(position==='inside')move(ids,block.id);
        else if(position==='before')move(ids,block.parent||null,block.id);
        else {
          const siblings=children(block.page,block.parent||null),next=siblings[siblings.indexOf(block)+1];
          move(ids,block.parent||null,next?.id||null);
        }
      }catch{}
    });
    const check=document.createElement('input');check.type='checkbox';check.checked=selected.has(block.id);
    check.setAttribute('aria-label',`Select ${block.title||block.kind}`);
    check.onchange=()=>{if(check.checked)selected.add(block.id);else selected.delete(block.id);wrap.classList.toggle('selected',check.checked)};
    toolbar.append(button('Move to...',()=>{selected.clear();selected.add(block.id);moveDialog();},'text-button'));
    toolbar.append(check,button('↑',()=>{const siblings=children(block.page,block.parent||null),at=siblings.indexOf(block);if(at>0)move([block.id],block.parent||null,siblings[at-1].id)},'text-button'),button('↓',()=>{
      const siblings=children(block.page,block.parent||null),at=siblings.indexOf(block);if(at<siblings.length-1){const next=siblings[at+2];move([block.id],block.parent||null,next?.id||null)}
    },'text-button'),button('Edit',()=>editBlock(block),'text-button'));
    toolbar.append(button('Duplicate',()=>{
      const subtree=state.blocks.filter(b=>isBlockDescendant(b.id,block.id)), mapping=new Map(subtree.map(b=>[b.id,id()]));
      state.blocks.push(...subtree.map(b=>({...b,id:mapping.get(b.id),parent:mapping.get(b.parent)||b.parent})));persist();render();
    },'text-button'),button('Remove view',()=>{
      if(!confirm('Remove this block and its nested blocks? Saved fitness records stay intact. Use Undo layout to recover.'))return;
      const removed=new Set(state.blocks.filter(b=>isBlockDescendant(b.id,block.id)).map(b=>b.id));state.blocks=state.blocks.filter(b=>!removed.has(b.id));selected.clear();persist();render();
    },'text-button'));
    const body=document.createElement('div');body.className='block-body';
    if(block.kind==='section'){
      const head=document.createElement('div');head.className='section-head';
      head.append(button(block.collapsed?'▸':'▾',()=>{block.collapsed=!block.collapsed;persist();render()},'text-button'));
      const label=document.createElement('h2');label.textContent=block.title||'Section';head.append(label);
      head.append(button('+ Inside',()=>editBlock(null,block.id),'text-button'));body.append(head);
      if(!block.collapsed)for(const child of children(block.page,block.id))body.append(blockElement(child,depth+1));
    } else if(block.kind==='heading'){const heading=document.createElement('h2');heading.textContent=block.title||'Heading';body.append(heading)}
    else if(block.kind==='text'){const paragraph=document.createElement('p');paragraph.textContent=block.text||'Click Edit to write a note.';body.append(paragraph)}
    else if(block.kind==='divider')body.append(document.createElement('hr'));
    else if(block.kind==='tool'||block.kind==='action'){
      const link=document.createElement('a');link.href=`#${block.route||'home'}`;link.className='secondary-button';link.textContent=block.title||routes[block.route]||'Open tool';body.append(link);
    } else if(['sets','meals','body','journal','workouts'].includes(block.kind)){body.append(window.renderRecordView(block));}
    wrap.append(toolbar,body);return wrap;
  }
  function render() {
    nav();const page=pageFor();if(!page){
      if(location.hash.startsWith('#page/'))root.replaceChildren(Object.assign(document.createElement('p'),{textContent:'Page not found. Open a page from the sidebar.'}));
      return;
    }
    root.replaceChildren();const path=breadcrumbs(page);
    const crumb=document.createElement('nav');crumb.className='page-crumbs';crumb.setAttribute('aria-label','Page path');
    for(const item of path){const link=document.createElement('a');link.href=`#page/${encodeURIComponent(item.id)}`;link.textContent=`${item.emoji||'📄'} ${item.title}`;crumb.append(link)}
    const heading=document.createElement('div');heading.className='page-heading';const title=document.createElement('h1');title.textContent=`${page.emoji||'📄'} ${page.title}`;
    heading.append(title,button('Edit page',()=>editPage(page),'secondary-button'),button('+ Subpage',()=>editPage(null,page.id),'secondary-button'));
    const tools=document.createElement('div');tools.className='page-actions';
    const picker=document.createElement('select');picker.setAttribute('aria-label','Open page');
    for(const p of state.pages)picker.add(new Option(`${'  '.repeat(Math.min(breadcrumbs(p).length-1,4))}${p.emoji||'📄'} ${p.title}`,p.id));
    picker.value=page.id;picker.onchange=()=>location.hash=`#page/${encodeURIComponent(picker.value)}`;
    tools.append(picker,button(editingBlocks?'Done customizing':'Customize blocks',()=>{editingBlocks=!editingBlocks;render();}));
    tools.append(button('+ Add block',()=>editBlock()),button('Move selected',moveDialog),button('Refresh records',()=>{window.clearRecordViewCache();render();}));
    const columns=document.createElement('select');columns.setAttribute('aria-label','Page columns');columns.append(new Option('One column','1'),new Option('Two columns','2'));columns.value=page.columns||1;columns.onchange=()=>{page.columns=Number(columns.value);persist();render();};tools.append(columns);
    tools.append(button('Remove page',()=>{
      if(!confirm('Remove this page, its subpages and their views? Fitness records stay intact. Undo layout can restore the pages.'))return;
      const removed=new Set(state.pages.filter(p=>isPageDescendant(p.id,page.id)).map(p=>p.id));state.pages=state.pages.filter(p=>!removed.has(p.id));state.blocks=state.blocks.filter(b=>!removed.has(b.page));window.fitnessPages=state.pages;persist();location.hash='#home';nav();window.dispatchEvent(new Event('fitness-pages-changed'));
    }));
    const canvas=document.createElement('div');canvas.className='page-canvas';canvas.dataset.columns=page.columns||1;canvas.classList.toggle('editing-layout',editingBlocks);
    for(const block of children(page.id,null))canvas.append(blockElement(block,0));
    if(!canvas.children.length){const empty=document.createElement('p');empty.className='muted';empty.textContent='This page is empty. Add a block to make it yours.';canvas.append(empty)}
    root.append(crumb,heading,tools,canvas);
    let start=null,rect=null;
    canvas.addEventListener('pointerdown',event=>{
      if(!editingBlocks||event.pointerType==='touch'||event.button!==0||event.target!==canvas)return;
      start={x:event.clientX,y:event.clientY};rect=document.createElement('div');rect.className='selection-rectangle';document.body.append(rect);canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove',event=>{
      if(!start||!rect)return;
      const left=Math.min(start.x,event.clientX),top=Math.min(start.y,event.clientY),right=Math.max(start.x,event.clientX),bottom=Math.max(start.y,event.clientY);
      Object.assign(rect.style,{left:`${left}px`,top:`${top}px`,width:`${right-left}px`,height:`${bottom-top}px`});
      selected.clear();
      for(const node of canvas.querySelectorAll('.page-block')){
        const b=node.getBoundingClientRect(),hit=b.right>left&&b.left<right&&b.bottom>top&&b.top<bottom;
        if(hit)selected.add(node.dataset.block);node.classList.toggle('selected',hit);node.querySelector('input[type=checkbox]').checked=hit;
      }
    });
    const end=()=>{start=null;rect?.remove();rect=null};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
  }
  window.addEventListener('hashchange',()=>{selected.clear();render()});
  window.addEventListener('records-changed',()=>{if(location.hash.startsWith('#page/'))render()});
  window.addEventListener('workspace-reset',()=>{selected.clear();window.fitnessPages=state.pages;render();});
  nav();render();
});
