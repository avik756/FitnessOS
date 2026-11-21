/* Shared, bounded record queries. Views store filters, never copies of records. */
(() => {
  const cache=new Map();
  window.addEventListener('records-changed',()=>cache.clear());
  const query=url=>{if(!cache.has(url))cache.set(url,readFeature(url).catch(error=>{cache.delete(url);throw error;}));return cache.get(url);};
  window.clearRecordViewCache=()=>cache.clear();
  window.renderRecordView=(block)=>{
    const root=document.createElement('section');root.className='record-view';
    const heading=document.createElement('h2');heading.textContent=block.title||{sets:'Recent sets',meals:'Meals',body:'Body records',journal:'Journal entries',workouts:'Workout sessions'}[block.kind];root.append(heading);
    const list=document.createElement('ul');list.className='compact-list';const status=document.createElement('p');status.setAttribute('role','status');
    const more=document.createElement('button');more.type='button';more.className='text-button';more.textContent='Next records';more.hidden=true;
    const link=document.createElement('a');link.className='inline-link';link.href='#'+{sets:'history',meals:'calories',body:'body',journal:'daily',workouts:'workouts'}[block.kind];link.textContent='Open full tool';
    root.append(status,list,more,link);let cursor=null,request=0;
    async function load(){const number=++request;more.disabled=true;status.textContent='Loading records…';
      try{const params=new URLSearchParams({kind:block.kind});if(block.exercise&&block.kind==='sets')params.set('exercise',block.exercise);if(cursor)params.set('before',cursor);
        const result=await query('/api/record-view?'+params);if(number!==request)return;
        list.replaceChildren();for(const row of result.rows){const li=document.createElement('li'),data=row.data||{};
          if(block.kind==='sets')li.textContent=`${row.activity_date} · ${row.exercise} · ${describeSet(row)}`;
          if(block.kind==='meals')li.textContent=`${row.activity_date} · ${row.label} · ${row.kcal} kcal`;
          if(block.kind==='body')li.textContent=`${row.activity_date} · ${row.weight==null?'Weight not recorded':row.weight+' '+row.weight_unit} · ${row.body_fat_pct==null?'Body fat not recorded':row.body_fat_pct+'% body fat'}`;
          if(block.kind==='workouts')li.textContent=`${data.activity_date||''} · ${data.name||'Workout'} · ${data.status==='finished'?'Finished':'Active'}`;
          if(block.kind==='journal')li.textContent=`${data.activity_date||data.date||''} · ${row.kind} · ${row.kind==='water'?data.ml+' ml':row.kind==='steps'?data.count+' steps':row.kind==='sleep'?(data.start||'')+' → '+(data.end||''):data.notes||'Check-in recorded'}`;
          list.append(li);
        }cursor=result.next_cursor;more.hidden=!cursor;status.textContent=result.rows.length?'Most recently saved records.':'No records yet.';
      }catch(error){status.textContent=error.message;more.hidden=false;more.textContent='Retry';}finally{more.disabled=false;}
    }
    more.onclick=load;root.refreshRecords=()=>{cursor=null;load();};
    root.setExercise=exercise=>{block.exercise=exercise;root.refreshRecords();};
    load();return root;
  };
})();
