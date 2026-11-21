const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/workspace_store.js','utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(){
  const nodes=[],memory=new Map(),requests=[];let response;
  const context={window:{addEventListener(){}},document:{
    createElement(){const node={children:[],append(...items){this.children.push(...items);},setAttribute(){}};nodes.push(node);return node;},
    querySelector(){return {after(){}};}
  },sessionStorage:{getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)},
    confirm:()=>true,location:{reload(){}},setTimeout,URL,Blob,
    apiFetch:async(path,options)=>{requests.push(JSON.parse(options.body));return new Promise(resolve=>response=resolve);},
    readFeature:async()=>({revision:9,workspace:{theme:'light',font:'sans'}})};
  vm.createContext(context);vm.runInContext(source,context);
  const state={theme:'dark',font:'serif'};
  const store=context.window.createWorkspaceStore(state,0,next=>{for(const key of Object.keys(state))delete state[key];Object.assign(state,next);});
  return {state,store,nodes,memory,requests,answer:(revision,ok=true)=>response({ok,status:ok?200:409,json:async()=>({revision})}),button:label=>nodes.find(n=>n.textContent===label)};
}
(async()=>{
  const env=setup();
  env.state.theme='light';env.store.save();
  env.state.font='mono';env.store.save();
  assert.equal(env.requests.length,1,'writes must serialize');
  env.answer(1);await tick();
  assert.equal(env.requests.length,2);assert.equal(env.requests[1].revision,1);
  assert.equal(env.requests[1].workspace.font,'mono');
  env.answer(2);await tick();assert.equal(env.memory.size,0,'successful saves clear recovery draft');
  env.button('Undo layout').onclick();assert.equal(env.state.font,'serif');env.answer(3);await tick();

  const conflict=setup();conflict.state.theme='light';conflict.store.save();conflict.answer(1,false);await tick();
  assert.equal(conflict.state.theme,'light');assert.equal(conflict.memory.size,1);
  conflict.state.font='mono';conflict.store.save();assert.equal(conflict.requests.length,1,'conflict must block automatic overwrites');
  await conflict.button('Reapply draft to latest').onclick();
  assert.equal(conflict.requests[1].revision,9,'reapply uses freshly fetched revision');
  assert.equal(conflict.requests[1].workspace.font,'mono');conflict.answer(10);await tick();
  assert.equal(conflict.memory.size,0);
  console.log('Workspace queue, undo, conflict preservation and deliberate reapply checks passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
