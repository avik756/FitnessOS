// Exercise the actual save handler with delayed replies and its normal DOM contract.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('frontend/app.js', 'utf8');
const start = source.indexOf('form.addEventListener("submit"');
const end = source.indexOf('\nasync function postBackup', start);
async function scenario(keepValues, fail = false) {
  let handler, calls = 0, release;
  const responseReady = new Promise(resolve => release = resolve);
  const primary = {disabled:false,dataset:{}}, another = {disabled:false,dataset:{keepValues:'true'}};
  const fields = {activity_date:'2026-11-18',exercise:'Bench',reps:'8',load:'40',unit:'kg',load_type:'total'};
  const form = {
    elements:Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,{value,focus(){}}])),
    querySelectorAll:()=>[primary,another], getClientRects:()=>[{}],
    addEventListener:(type, callback)=>handler=callback
  };
  const events=[];
  const context = {
    form, saveButton:primary, FormData:class {get(key){return fields[key];}},
    apiFetch:async()=>{calls++;await responseReady;return {ok:!fail,json:async()=>fail?{error:'Failed'}:{...fields,reps:8,load:'40'}};},
    showSaveStatus(){},lastSavedSet:null,lastSavedDetails:{},lastSavedCard:{},describeSet:()=>'',
    window:{dispatchEvent:event=>events.push(event)},Event:class {constructor(type){this.type=type;}},
    CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail;}},
    loadExercises:async()=>{},loadHistory:async()=>{},loadRecentExercises:async()=>{},loadOverview:async()=>{},loadProgress:async()=>{}
  };
  vm.runInNewContext(source.slice(start,end),context);
  const event = {preventDefault(){},submitter:keepValues?another:primary};
  const pending = handler(event);
  await handler(event);
  assert.equal(calls,1,'Concurrent submits must not duplicate a set');
  release();await pending;
  assert.equal(primary.disabled,false);assert.equal(another.disabled,false);
  const saved=events.find(event=>event.type==='set-saved');
  if(fail){assert.equal(saved,undefined);assert.equal(form.elements.reps.value,'8');}
  else {assert.equal(saved.detail.keepValues,keepValues);assert.equal(String(form.elements.reps.value),keepValues?'8':'');}
}
(async()=>{await scenario(true);await scenario(false);await scenario(true,true);console.log('Set save, repeat, failure, and duplicate submission checks passed.');})().catch(error=>{console.error(error);process.exitCode=1;});

