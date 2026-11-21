// Test the real draft controller across simulated page lifetimes and IDB failures.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync('frontend/draft_store.js','utf8');
const data=new Map();let fail=false;
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function createPage() {
  class Element {
    constructor(){this.children=[];this.listeners={};this.className='';this.textContent='';}
    append(...items){items.forEach(item=>{item.parent=this;this.children.push(item);});}
    prepend(item){item.parent=this;this.children.unshift(item);}
    remove(){this.parent.children=this.parent.children.filter(x=>x!==this);}
    setAttribute(){}
    addEventListener(type,callback){(this.listeners[type]||=[]).push(callback);}
    dispatchEvent(event){for(const fn of this.listeners[event.type]||[])fn(event);}
    closest(){return null;}
  }
  const form=new Element();form.id='set-form';
  form.elements=Object.entries({activity_date:'2026-11-21',exercise:'Squat',reps:'8',load:'40',unit:'kg',load_type:'total'})
    .map(([name,value])=>({name,value,type:'text'}));
  form.elements.namedItem=name=>form.elements.find(e=>e.name===name);
  const document={forms:[form],createElement:()=>new Element(),querySelector:()=>null,addEventListener(){}};
  const window={addEventListener(){},dispatchEvent(){}};
  const indexedDB={open(){
    const request={};queueMicrotask(()=>{
      if(fail){request.error=new Error('Unavailable');request.onerror();return;}
      request.result={transaction(){
        const tx={};tx.objectStore=()=>Object.fromEntries(['get','put','delete'].map(op=>[op,(a,b)=>{
          const req={};queueMicrotask(()=>{
            if(fail){tx.error=new Error('Quota');tx.onerror();return;}
            const key=op==='put'?b:a;
            if(op==='put')data.set(key,structuredClone(a));
            if(op==='delete')data.delete(key);
            req.result=structuredClone(data.get(key));tx.oncomplete();
          });return req;
        }]));return tx;
      }};request.onsuccess();
    });return request;
  }};
  vm.runInNewContext(source,{window,document,indexedDB,crypto:webcrypto,Uint8Array,Event:class{constructor(type){this.type=type;}},confirm:()=>true});
  return {form,api:window.FitnessDrafts,window};
}
const payload={activity_date:'2026-11-21',exercise:'Squat',reps:8,load:'40',unit:'kg',load_type:'total',session_id:null,session_exercise:null};
function recovery(page){return page.form.children.find(e=>e.className==='draft-recovery');}
async function main(){
  const first=createPage();await first.api.activate('account-a');
  const id=await first.api.prepare(first.form,payload);assert.match(id,/^[a-f0-9-]{36}$/);
  first.api.failed(first.form);
  assert.equal(await first.api.prepare(first.form,payload),id,'same draft retries reuse the original request ID');
  first.api.failed(first.form);
  await assert.rejects(first.api.prepare(first.form,{...payload,reps:9}),/previous save/);
  const reopened=createPage();await reopened.api.activate('account-a');
  assert.ok(recovery(reopened),'relaunch offers recovery');
  await assert.rejects(reopened.api.prepare(reopened.form,payload),/Restore or discard/);
  recovery(reopened).children[1].onclick();
  assert.equal(await reopened.api.prepare(reopened.form,payload),id,'retry identity survives a page restart');
  await reopened.api.saved(reopened.form);
  assert.equal(reopened.api.hasDrafts(),false);
  const next=await reopened.api.prepare(reopened.form,payload);
  assert.notEqual(next,id,'an intentional repeated set gets a new request ID');
  const other=createPage();await other.api.activate('account-b');assert.equal(recovery(other),undefined);
  await reopened.api.rejected(reopened.form);
  assert.ok(await reopened.api.prepare(reopened.form,{...payload,reps:9}),'server validation rejection permits correction');
  fail=true;reopened.api.failed(reopened.form);
  await reopened.api.prepare(reopened.form,{...payload,reps:9});
  assert.ok(reopened.form.children.some(e=>e.textContent.includes('unavailable')),'quota failure is visible');
  fail=false;await reopened.api.clearAll();
  const cleared=createPage();await cleared.api.activate('account-a');assert.equal(recovery(cleared),undefined);
  cleared.form.elements.namedItem('reps').value='12';cleared.form.dispatchEvent({type:'input'});await tick();
  assert.equal(data.get('account-a:set-form').fields.reps,'12');
  console.log('Phone drafts: restart recovery, retry identity, account separation, validation correction, storage failure and logout passed.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
