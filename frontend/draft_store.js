/* Recoverable form drafts are separate from confirmed server records.
   Only allowlisted non-secret fields are stored; photo/password forms never enter IDB. */
(() => {
  // LAN HTTP lacks randomUUID in some browsers; getRandomValues is still available.
  if (!crypto.randomUUID) crypto.randomUUID=()=>{
    const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
    const hex=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  };
  const allowed = new Set(['set-form','body-form','calorie-form','water-form','sleep-form','steps-form','checkin-form','food-log-form']);
  const forms = new Map();
  let scope, dbPromise, activation, resolveReady;
  const ready = new Promise(resolve => { resolveReady=resolve; });
  function database() {
    if (!dbPromise) dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open('fitnessos-drafts',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('drafts');
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
      request.onblocked=()=>reject(new Error('Draft storage is blocked by another tab.'));
    });
    return dbPromise;
  }
  async function storage(id,operation,value) {
    const db=await database();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('drafts',operation==='get'?'readonly':'readwrite');
      const store=tx.objectStore('drafts'), key=`${scope}:${id}`;
      const request=operation==='get'?store.get(key):operation==='put'?store.put(value,key):store.delete(key);
      tx.oncomplete=()=>resolve(request.result);
      tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error || new Error('Draft write aborted.'));
    });
  }
  function fields(form) {
    return Object.fromEntries([...form.elements].filter(el=>el.name && !['password','file','submit','button'].includes(el.type))
      .map(el=>[el.name,el.type==='checkbox'?el.checked:el.value]));
  }
  function snapshot(entry) {
    return {fields:fields(entry.form),pending:entry.pending || null,
      context:entry.form.id==='set-form'?window.workoutContext || null:null,
      journalDate:entry.form.closest('[data-view=daily]')?document.querySelector('#journal-date')?.value:null,
      updatedAt:Date.now()};
  }
  function report(entry,text) { entry.status.textContent=text; }
  function enqueue(entry,work) {
    entry.queue=entry.queue.catch(()=>{}).then(work);
    return entry.queue;
  }
  function keep(entry) {
    if(!scope || entry.recovery || entry.saving)return Promise.resolve();
    const data=snapshot(entry);entry.dirty=true;
    return enqueue(entry,async()=>{
      try{await storage(entry.form.id,'put',data);report(entry,'Draft kept on this device. Not saved to the server.');}
      catch{report(entry,'Device draft storage unavailable. Keep this tab open until you save.');}
    });
  }
  function offer(entry,data) {
    entry.recovery=data;
    const box=document.createElement('div');box.className='draft-recovery';
    const label=document.createElement('p');label.textContent=data.pending
      ? 'A previous set save was not confirmed. Restore it to retry safely with the same request ID.'
      : 'An unsaved draft is available on this device. Restore it before editing, or discard it.';
    const restore=document.createElement('button');restore.type='button';restore.className='secondary-button';restore.textContent='Restore draft';
    const discard=document.createElement('button');discard.type='button';discard.className='text-button';discard.textContent='Discard draft';
    restore.onclick=()=>{
      for(const [name,value] of Object.entries(data.fields || {})) {
        const field=entry.form.elements.namedItem(name);if(!field || ['file','password'].includes(field.type))continue;
        if(field.type==='checkbox')field.checked=Boolean(value);else field.value=value;
      }
      if(data.journalDate)document.querySelector('#journal-date').value=data.journalDate;
      if(entry.form.id==='set-form') {
        window.workoutContext=data.context || null;
        window.dispatchEvent(new Event('set-draft-replaced'));
        const context=document.querySelector('#workout-context');
        if(context){context.hidden=!data.context;context.textContent=data.context?'Recovered workout draft. Its session is checked when saving.':'';}
      }
      entry.pending=data.pending || null;entry.recovery=null;entry.dirty=true;box.remove();
      entry.form.dispatchEvent(new Event('input',{bubbles:true}));
      report(entry,'Draft restored. Review its date and values before saving.');
    };
    discard.onclick=async()=>{
      if(!confirm(data.pending?'This save may already exist in History. Discard the local draft and its retry ID?':'Discard this unsaved device draft?'))return;
      try{await enqueue(entry,()=>storage(entry.form.id,'delete'));entry.recovery=null;entry.pending=null;entry.dirty=false;box.remove();report(entry,'Device draft discarded.');}
      catch{report(entry,'Could not remove the stored draft. Try again.');}
    };
    box.append(label,restore,discard);entry.form.prepend(box);
  }
  async function bind(form) {
    if(!scope || !allowed.has(form.id) || forms.has(form.id))return;
    const status=document.createElement('p');status.className='draft-status';status.setAttribute('role','status');form.append(status);
    const entry={form,status,queue:Promise.resolve(),dirty:false,pending:null,recovery:{loading:true},saving:false};forms.set(form.id,entry);
    // Preserve programmatic updates too; submit handlers explicitly snapshot before sending.
    form.addEventListener('input',()=>keep(entry));form.addEventListener('change',()=>keep(entry));
    try{const data=await storage(form.id,'get');entry.recovery=null;if(data)offer(entry,data);}
    catch{entry.recovery=null;report(entry,'Device draft storage unavailable. Keep this tab open until you save.');}
  }
  async function activate(identity) {
    if(activation)return activation;
    scope=identity;
    activation=(async()=>{
      if(scope)await Promise.all([...document.forms].map(bind));
      resolveReady();
    })();return activation;
  }
  async function prepare(form,payload) {
    await ready;
    const entry=forms.get(form.id);if(!entry)return null;
    if(entry.recovery)throw new Error('Restore or discard the earlier device draft before saving.');
    if(entry.pending && JSON.stringify(entry.pending.payload)!==JSON.stringify(payload)) {
      throw new Error('A previous save is unconfirmed. Restore its original values with Review pending set before saving different values.');
    }
    if(!entry.pending)entry.pending={key:crypto.randomUUID(),payload};
    entry.saving=false;
    await keep(entry);entry.saving=true;
    return entry.pending.key;
  }
  async function saved(form) {
    const entry=forms.get(form.id);if(!entry)return;
    entry.pending=null;entry.saving=false;entry.dirty=false;
    await enqueue(entry,async()=>{
      try{await storage(form.id,'delete');report(entry,'Saved to the connected server.');}
      catch{report(entry,'Saved to the server, but could not clear the device draft. Check History before restoring it.');}
    });
  }
  async function capture(form) {await ready;const entry=forms.get(form.id);if(entry){if(entry.recovery)throw new Error('Restore or discard the earlier device draft first.');await keep(entry);}}
  async function clearAll() {
    await ready;
    for(const entry of forms.values()) {
      await enqueue(entry,()=>storage(entry.form.id,'delete'));entry.dirty=false;entry.pending=null;entry.recovery=null;
    }
  }
  window.FitnessDrafts={ready,activate,prepare,saved,capture,clearAll,
    hasDrafts:()=>[...forms.values()].some(e=>e.dirty || e.recovery || e.pending),
    failed(form){const e=forms.get(form.id);if(e?.pending){e.saving=false;report(e,'Save not confirmed. Retry the same values or review the pending set.');}},
    rejected(form){const e=forms.get(form.id);if(e){e.pending=null;e.saving=false;return keep(e);}},
    reviewPending(form){const e=forms.get(form.id);if(e?.pending&&!e.recovery)offer(e,{...snapshot(e),fields:{...e.pending.payload,reps:String(e.pending.payload.reps)},context:e.pending.payload.session_id?{id:e.pending.payload.session_id,position:e.pending.payload.session_exercise}:null,pending:e.pending});}
  };
  window.addEventListener('journal-ready',()=>{for(const form of document.forms)bind(form);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const e of forms.values())if(e.dirty)keep(e);});
})();
