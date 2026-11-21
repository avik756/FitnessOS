(function nutritionEditor() {
  const names={protein:'Protein (g)',carbs:'Carbohydrate (g)',fat:'Fat (g)',fiber:'Fiber (g)',sugar:'Sugar (g)',saturated_fat:'Saturated fat (g)',sodium:'Sodium (mg)',calcium:'Calcium (mg)',iron:'Iron (mg)',potassium:'Potassium (mg)',vitamin_c:'Vitamin C (mg)',vitamin_d:'Vitamin D (µg)'};
  window.readNutritionFields = (target, source = 'Manual') => {
    const result = {source};
    for (const key of Object.keys(names)) {
      const value = target.elements[key]?.value;
      result[key] = value == null || value === '' ? null : Number(value);
    }
    return result;
  };
  window.scaleNutrition = (data, portions) => {
    if (!data) return null;
    const result = {source:data.source || 'Personal food'};
    for (const key of Object.keys(names)) result[key] = data[key] == null ? null : Number((data[key] * portions).toFixed(4));
    return result;
  };
  window.describeNutrition = value => {
    const data = typeof value === 'string' ? JSON.parse(value) : value;
    if (!data) return 'Nutrients not recorded';
    const recorded = Object.entries(names).filter(([key]) => data[key] != null);
    return recorded.length ? recorded.map(([key,label]) => `${label}: ${data[key]}`).join(' · ') : 'Nutrients not recorded';
  };
  function addFoodFields() {
    const target = document.querySelector('#food-form');
    if (!target || target.querySelector('[name=protein]')) return;
    const section = document.createElement('details');
    const title = document.createElement('summary'); title.textContent = 'Nutrients per portion'; section.append(title);
    for (const [key,labelText] of Object.entries(names)) {
      const label = document.createElement('label'); label.textContent = labelText;
      const input = document.createElement('input'); input.name=key; input.type='number'; input.min='0'; input.max='100000'; input.step='any';
      label.append(input); section.append(label);
    }
    target.querySelector('button[type=submit]').before(section);
  }
  window.addEventListener('journal-ready',addFoodFields);
  addFoodFields();
  const fields=document.createElement('details');fields.open=false;fields.innerHTML='<summary>Nutrition for this entry</summary><div class="measure-grid"></div><p class="muted">Leave unavailable values blank.</p>';
  for(const [key,title] of Object.entries(names)){
    const label=document.createElement('label');label.textContent=title;
    const input=document.createElement('input');input.type='number';input.min='0';input.max='100000';input.step='any';input.name=key;label.append(input);fields.querySelector('div').append(label);
  }
  calorieForm.querySelector('button[type=submit]').before(fields);
  const searchBox=document.createElement('section');searchBox.className='card stacked-card';
  searchBox.innerHTML=`<h2>Find a food</h2><form id="database-search"><label>Food name<input name="query" minlength="2" maxlength="100" required placeholder="Egg, oats, milk…"></label><button class="secondary-button">Search FoodData Central</button></form><p id="food-search-status" role="status"></p><div id="food-results" class="compact-list"></div><label>Grams to log<input id="food-grams" type="number" min="0.1" max="10000" step="any" value="100"></label><p class="muted">Database values use a 100 g basis. Review the food and quantity before saving.</p>`;
  document.querySelector('#view-calories .page-heading').after(searchBox);
  let source='Manual'; let chosen;
  window.resetNutritionDraft = () => { source='Manual'; chosen=null; document.querySelector('#food-grams').value='100'; };
  const saveFood = document.createElement('button'); saveFood.type='button'; saveFood.className='secondary-button'; saveFood.textContent='Save selected portion to food library';
  searchBox.append(saveFood);
  saveFood.onclick=async()=>{
    const status=document.querySelector('#food-search-status');
    if(!chosen){status.textContent='Choose a food first.';return;}
    const gramsInput=document.querySelector('#food-grams');
    if(!gramsInput.reportValidity())return;
    saveFood.disabled=true;
    try {
      await postBackup('/api/journal',{kind:'food',data:{name:chosen.name.slice(0,80),portion:`${gramsInput.value} g`,kcal:Number(calorieForm.elements.kcal.value),nutrition:window.nutritionSnapshot()}});
      window.dispatchEvent(new Event('records-changed')); status.textContent='Portion saved in your food library.';
    } catch(error){status.textContent=error.message;}finally{saveFood.disabled=false;}
  };
  calorieForm.addEventListener('input',event=>{ if(event.target.name !== 'activity_date' && event.target.name !== 'meal_time') source='Manual / edited'; });
  function applyFood(){
    if(!chosen) return;
    const grams=Number(document.querySelector('#food-grams').value);
    if(!Number.isFinite(grams)||grams<=0||grams>10000)return;
    calorieForm.elements.label.value=`${chosen.name} (${grams} g)`.slice(0,80);
    calorieForm.elements.kcal.value=Math.round(chosen.kcal*grams/100);
    for(const key of Object.keys(names)) calorieForm.elements[key].value=chosen.nutrition[key]==null?'':Number((chosen.nutrition[key]*grams/100).toFixed(2));
    source=`FoodData Central ${chosen.id}, ${grams} g`;
  }
  document.querySelector('#food-grams').addEventListener('input',applyFood);
  searchBox.querySelector('form').addEventListener('submit',async event=>{
    event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;
    const status=document.querySelector('#food-search-status');status.textContent='Searching…';
    const results=document.querySelector('#food-results');results.replaceChildren();
    try{
      const rows=await readFeature(`/api/food-search?q=${encodeURIComponent(event.target.elements.query.value)}`);
      for(const row of rows){
        const button=document.createElement('button');button.type='button';button.className='recent-button';button.textContent=`${row.name} ${row.brand} · ${row.kcal} kcal / 100 g`;
        button.onclick=()=>{chosen=row;applyFood();status.textContent=`Selected ${row.name}. Review the quantity and nutrients below.`;};results.append(button);
      }
      status.textContent=rows.length?'Choose a food.':'No matches. Enter your label manually.';
    }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
  });
  // The existing submission handler reads this snapshot into the existing calorie save.
  window.nutritionSnapshot=()=>{
    const result={source};
    for(const key of Object.keys(names))result[key]=calorieForm.elements[key].value===''?null:Number(calorieForm.elements[key].value);
    return result;
  };
  const summary=document.createElement('section');summary.className='card stacked-card';summary.innerHTML='<label>Nutrition day<input id="nutrition-date" type="date"></label><div id="nutrient-totals"></div>';
  document.querySelector('#view-calories').append(summary);summary.querySelector('input').value=localToday;
  async function totals(){
    const day=summary.querySelector('input').value;
    const rows=(await readFeature('/api/calories')).filter(row=>row.activity_date===day);
    if (summary.querySelector('input').value !== day) return;
    const container=document.querySelector('#nutrient-totals');container.replaceChildren();
    const heading=document.createElement('h2');heading.textContent=`${rows.reduce((total,row)=>total+row.kcal,0)} kcal logged`;container.append(heading);
    const secondary=document.createElement('details');secondary.innerHTML='<summary>More nutrients and coverage</summary>';container.append(secondary);
    for(const [key,title] of Object.entries(names)){
      let total=0,known=0;
      for(const row of rows){const data=typeof row.nutrition==='string'?JSON.parse(row.nutrition):row.nutrition;if(data?.[key]!=null){total+=data[key];known++;}}
      const line=document.createElement('p');line.textContent=`${title}: ${known?Number(total.toFixed(2)):'Unknown'}${known<rows.length?' · partial coverage':''} (${known}/${rows.length} entries)`;(['protein','carbs','fat'].includes(key)?container:secondary).append(line);
    }
  }
  summary.querySelector('input').addEventListener('change',()=>totals().catch(error=>{document.querySelector('#nutrient-totals').textContent=error.message;}));
  window.addEventListener('hashchange',()=>{if(location.hash==='#calories') totals().catch(error=>{document.querySelector('#nutrient-totals').textContent=error.message;});});
  window.addEventListener('records-changed',()=>totals().catch(error=>{document.querySelector('#nutrient-totals').textContent=error.message;}));totals().catch(()=>{});
})();
