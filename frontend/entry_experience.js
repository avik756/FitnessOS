/* Progressive disclosure moves live controls; it does not maintain duplicate forms. */
(() => {
  const button=(label,action)=>{const b=document.createElement('button');b.type='button';b.className='secondary-button';b.textContent=label;b.onclick=action;return b;};
  const exerciseSearch=document.createElement('input');exerciseSearch.type='search';exerciseSearch.id='exercise-search';exerciseSearch.placeholder='Search exercises';exerciseSearch.setAttribute('aria-label','Search shared exercise catalogue');exerciseSearch.oninput=renderExercises;document.querySelector('#all-exercises-list').before(exerciseSearch);
  const options=document.createElement('details');options.className='entry-options';const summary=document.createElement('summary');options.append(summary);
  const date=form.elements.activity_date;options.append(document.querySelector('label[for=activity-date]'),date,form.elements.unit.closest('.pair'),stepInput.closest('label'));
  form.querySelector('#save-button').before(options);
  const updateSummary=()=>summary.textContent=`${date.value} · ${form.elements.unit.value} · ${form.elements.load_type.value==='per_hand'?'per hand':'total'} · options`;
  form.addEventListener('change',updateSummary);form.addEventListener('input',updateSummary);setEditor.addEventListener('focusin',updateSummary);window.addEventListener('set-saved',updateSummary);updateSummary();
  form.addEventListener('invalid',event=>event.target.closest('details')?.setAttribute('open',''),true);
  const shortcuts=document.createElement('details');shortcuts.className='entry-options';shortcuts.innerHTML='<summary>Recent exercises and favourites</summary>';
  for(const node of form.querySelectorAll('.recent-exercises,.favorite-shortcuts'))shortcuts.append(node);
  form.querySelector('#save-button').before(shortcuts);
  const voice=entryCard.querySelector('.voice-box');if(voice)form.after(voice);

  const foodDialog=document.createElement('dialog');foodDialog.className='quick-dialog food-editor';foodDialog.innerHTML='<header class="section-head"><h2>Add food</h2></header><div class="food-modes" role="group" aria-label="Food entry method"></div><div class="food-editor-panels"></div>';
  document.body.append(foodDialog);foodDialog.querySelector('header').append(button('Close',()=>foodDialog.close()));
  const manual=calorieForm.closest('.card'),search=document.querySelector('#database-search').closest('.card');
  const launcher=document.createElement('section');launcher.className='card';launcher.innerHTML='<h2>Log a meal</h2><p class="muted">Search a food, use a saved portion, or enter a label.</p>';manual.before(launcher);launcher.append(button('Add food',()=>openFood()));
  const panels=foodDialog.querySelector('.food-editor-panels');panels.append(search,manual);
  const library=document.createElement('div');panels.append(library);let libraryHome,libraryCard,opener,libraryHidden;
  function mode(name){search.hidden=name!=='search';manual.hidden=name!=='manual';library.hidden=name!=='library';for(const b of foodDialog.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===name));}
  for(const [name,label] of [['search','Search'],['library','My foods'],['manual','Manual']]){const b=button(label,()=>mode(name));b.dataset.mode=name;foodDialog.querySelector('.food-modes').append(b);}
  function openFood(day){if(foodDialog.open)return;opener=document.activeElement;
    if(day){calorieForm.elements.activity_date.value=day;if(libraryCard)libraryCard.querySelector('[name=activity_date]').value=day;}
    if(libraryCard){libraryHome=document.createElement('span');libraryCard.before(libraryHome);library.replaceChildren(libraryCard);libraryHidden=libraryCard.hidden;libraryCard.hidden=false;}else library.textContent='Food library is loading. Close and try again shortly.';
    mode('manual');if(!foodDialog.open)foodDialog.showModal();calorieForm.elements.label.focus();
  }
  window.openFoodEditor=openFood;
  foodDialog.addEventListener('close',()=>{if(libraryHome&&libraryCard){libraryHome.after(libraryCard);libraryHome.remove();libraryCard.hidden=libraryHidden;}opener?.focus();});
  foodDialog.addEventListener('invalid',event=>{mode(event.target.closest('#food-log-form')?'library':'manual');event.target.closest('details')?.setAttribute('open','');},true);
  search.querySelector('#food-results').addEventListener('click',event=>{if(event.target.closest('button')){mode('manual');calorieForm.elements.label.focus();}});
  document.addEventListener('click',event=>{if(event.target.closest('[data-quick-route=calories]'))setTimeout(()=>openFood(),0);});
  function journalReady(){
    libraryCard=document.querySelector('#food-log-form')?.closest('.card');
    const journal=document.querySelector('[data-view=daily]');if(!journal)return;
    const links=document.createElement('nav');links.className='journal-summary-links';links.setAttribute('aria-label','Journal sections');
    for(const section of journal.querySelectorAll('.journal-panel')){
      const label=section.querySelector('summary').textContent;const b=button(label,()=>{window.dispatchEvent(new CustomEvent('reveal-panel',{detail:section}));for(const other of journal.querySelectorAll('.journal-panel'))other.open=other===section;section.querySelector('input,select,textarea')?.focus();});links.append(b);
    }journal.querySelector('#journal-date').after(links);
  }
  window.addEventListener('journal-ready',journalReady);
})();
