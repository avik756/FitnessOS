/* Revision-aware workspace writes. A failed write never discards the in-memory draft. */
window.createWorkspaceStore = (state, revision, restore) => {
  let generation=0, saved=0, running=false, blocked=false, previous=JSON.stringify(state);
  const history=[];let baseline=JSON.parse(JSON.stringify(state));
  const bar=document.createElement('aside');bar.className='workspace-save-bar';
  const status=document.createElement('span');status.setAttribute('role','status');status.textContent='Workspace loaded';bar.append(status);
  document.querySelector('.topbar').after(bar);
  const recoveryActions=[];
  const action=(label,fn)=>{const b=document.createElement('button');b.type='button';b.className='text-button';b.textContent=label;b.onclick=fn;bar.append(b);recoveryActions.push(b);return b;};
  const retry=action('Retry save',()=>{blocked=false;flush();});retry.hidden=true;
  action('Download layout draft',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='fitnessos-layout-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  action('Reload saved layout',()=>{if(confirm('Reload the saved layout? Download your draft first to keep unsaved changes.')){sessionStorage.removeItem('fitnessos-layout-draft');location.reload();}});
  action('Reapply draft to latest',async()=>{
    if(running){status.textContent='Wait for the current save to finish before reapplying.';return;}
    try{
      const latest=await readFeature('/api/workspace/state');
      const keys=[...new Set([...Object.keys(baseline),...Object.keys(state)])].filter(key=>JSON.stringify(baseline[key])!==JSON.stringify(state[key]));
      if(!keys.length){status.textContent='No draft changes to reapply.';return;}
      if(!confirm(`Reapply these layout areas to revision ${latest.revision}: ${keys.join(', ')}? Newer edits in these areas will be replaced. Other areas and all fitness records are preserved.`))return;
      const merged=latest.workspace;for(const key of keys){if(key in state)merged[key]=JSON.parse(JSON.stringify(state[key]));else delete merged[key];}
      revision=latest.revision;restore(merged);blocked=false;save();
    }catch(error){status.textContent=error.message;}
  });
  const undo=action('Undo layout' ,()=>{const snapshot=history.pop();if(!snapshot)return;restore(JSON.parse(snapshot));previous=snapshot;save(false);});undo.disabled=true;
  async function flush(){
    if(running||blocked)return;running=true;retry.hidden=true;
    try {while(saved<generation){const number=generation,snapshot=JSON.parse(JSON.stringify(state));status.textContent='Saving workspace…';
      const response=await apiFetch('/api/workspace/state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,workspace:snapshot})});
      const result=await response.json();
      if(!response.ok)throw new Error(response.status===409?'Another tab saved a newer layout. Download this draft and reload the saved layout.':result.error||'Save failed.');
      revision=result.revision;saved=number;baseline=snapshot;
    }status.textContent='Workspace saved';try{sessionStorage.removeItem('fitnessos-layout-draft');}catch{}
    }catch(error){blocked=true;retry.hidden=false;menu.open=true;status.textContent=`${error.message} Draft kept in this tab.`;}finally{running=false;}
  }
  function save(recordHistory=true){
    const current=JSON.stringify(state);if(recordHistory&&current!==previous){history.push(previous);if(history.length>30)history.shift();}previous=current;
    generation++;undo.disabled=!history.length;
    try{sessionStorage.setItem('fitnessos-layout-draft',JSON.stringify({revision,workspace:state}));}catch{}
    if(!blocked)flush();
  }
  let draft;try{draft=JSON.parse(sessionStorage.getItem('fitnessos-layout-draft')||'null');}catch{}
  if(draft?.workspace)action('Recover unsaved draft',()=>{if(confirm("Recover this tab's unsaved layout?")){restore(draft.workspace);if(draft.revision!==revision){blocked=true;status.textContent='Recovered draft is from an older revision. Download it before reloading the latest layout.';}save();}});
  window.addEventListener('beforeunload',event=>{if(saved<generation){event.preventDefault();event.returnValue='';}});
  const menu=document.createElement('details');const title=document.createElement('summary');title.textContent='Save recovery';menu.append(title);for(const b of recoveryActions)if(b!==undo)menu.append(b);bar.append(menu);
  return {save,checkpoint(){history.length=0;previous=JSON.stringify(state);undo.disabled=true;}};
};
