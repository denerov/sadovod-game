(() => {
  const root=document.querySelector('.character-screen');
  const form=root.querySelector('form');
  const avatars=[...root.querySelectorAll('.avatar')];
  const input=root.querySelector('input');
  const error=root.querySelector('#character-error');
  const genders=['woman','man'],outfits=['linen','overalls','coat','cardigan'];
  const labels={linen:'Лён',overalls:'Комбинезон',coat:'Пальто',cardigan:'Кардиган'};
  const key='sadovod.character.v1';
  let state={gender:'woman',outfit:'linen'},active=0,revision=0;
  const asset=(g,o)=>`./assets/characters/${g}-${o}.webp`;
  const images=new Map();
  function imageFor(src){if(!images.has(src)){const image=new Image();image.src=src;images.set(src,image)}return images.get(src)}
  function readProfile(){try{const p=JSON.parse(localStorage.getItem(key));return p&&genders.includes(p.gender)&&outfits.includes(p.outfit)&&typeof p.name==='string'&&p.name.trim().length>0&&p.name.length<=24&&!/[\u0000-\u001f\u007f]/.test(p.name)?p:null}catch{return null}}
  const initial=readProfile();
  const preload=initial?Promise.resolve():Promise.allSettled([imageFor('./assets/character-scene.webp').decode(),imageFor('./assets/welcome-garden.webp').decode(),imageFor(asset(initial?.gender||'woman',initial?.outfit||'linen')).decode()]);
  async function render(){
    const rev=++revision,src=asset(state.gender,state.outfit);
    root.querySelectorAll('[data-gender]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gender===state.gender)));
    root.querySelectorAll('[data-outfit]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.outfit===state.outfit));b.querySelector('img').src=asset(state.gender,b.dataset.outfit)});
    const image=imageFor(src);
    let timeout;
    try{await Promise.race([image.decode(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Image timeout')),8000)})])}catch{if(rev===revision)error.textContent='Не удалось загрузить наряд. Попробуйте ещё раз.';return false}finally{clearTimeout(timeout)}
    if(rev!==revision)return false;
    const next=1-active;avatars[next].src=src;
    window.CharacterBreathing?.setImage(avatars[next],image,{strength:state.outfit==='coat'?.55:state.outfit==='cardigan'?.85:1});
    avatars[next].classList.add('active');avatars[active].classList.remove('active');active=next;
    root.querySelector('.character-announcement').textContent=`${state.gender==='woman'?'Женщина':'Мужчина'}, ${labels[state.outfit]}`;
    return true;
  }
  root.querySelectorAll('[data-gender]').forEach(b=>b.addEventListener('click',()=>{state.gender=b.dataset.gender;error.textContent='';render()}));
  root.querySelectorAll('[data-outfit]').forEach(b=>b.addEventListener('click',()=>{state.outfit=b.dataset.outfit;error.textContent='';render()}));
  input.addEventListener('input',()=>{input.removeAttribute('aria-invalid');error.textContent=''});
  function showConfirmation(profile,saved=true){
    root.classList.add('is-welcome');form.hidden=true;const panel=root.querySelector('.character-confirmation');panel.hidden=false;
    root.querySelector('.player-name').textContent=profile.name;
    root.querySelector('.save-status').textContent=saved?'':'Персонаж выбран. Браузер не разрешил сохранить его на этом устройстве.';
    panel.querySelector('h2').focus();
  }
  form.addEventListener('submit',async e=>{
    e.preventDefault();const name=input.value.trim().replace(/\s+/g,' ');
    if(!name||name.length>24||/[\u0000-\u001f\u007f]/.test(name)){error.textContent='Введите имя: от 1 до 24 символов.';input.setAttribute('aria-invalid','true');input.focus();return}
    const button=form.querySelector('[type=submit]');button.disabled=true;
    try{if(!await render())return;const profile={...state,name};let saved=true;try{window.SadovodSave.setItem(key,JSON.stringify(profile))}catch{saved=false}showConfirmation(profile,saved)}finally{button.disabled=false}
  });
  root.querySelector('.edit-character').addEventListener('click',()=>{root.classList.remove('is-welcome');root.querySelector('.character-confirmation').hidden=true;form.hidden=false;root.querySelector('h1').focus()});
  window.SadovodCharacter={preload,open(){
    const saved=readProfile();
    if(saved){location.replace('farm.html?v=205');return}
    document.body.dataset.screen='character';root.hidden=false;
    render();
    root.querySelector('h1').focus();
  }};
})();
