import {residentPlacements} from './pen-residents.js?v=210';
import {isPen,compatible,housingParent,penCapacity,penHasRoom} from './pen-model.js?v=207';
import {CATALOG} from './decor-model.js?v=268';
import {CHICKENS} from './animal-model.js?v=182';
import {timeLabel} from './crop-model.js?v=210';
const dialog=document.createElement('dialog');dialog.className='apiary-dialog pen-dialog';dialog.setAttribute('aria-labelledby','pen-title');document.body.append(dialog);
let penId=null,feedback='';const decor=()=>window.SadovodDecor,crops=()=>window.SadovodCrops;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function status(o,state){if(CHICKENS[o.type]){const job=state.hens[o.id];return job?job.readyAt<=state.clock?'Яйца готовы':timeLabel(job.readyAt-state.clock):'Можно покормить';}if(o.type==='dairy-cow'){const job=state.dairy?.cows?.[o.id];return job?job.remaining>0?timeLabel(job.remaining):'Молоко готово':'Можно покормить';}const job=state.chains[o.id];return job?job.remaining>0?timeLabel(job.remaining):'Продукция готова':'Можно покормить';}
function close(){dialog.close();penId=null;feedback='';}
function draw(){const all=decor().getOwnedObjects(),pen=all.find(o=>o.id===penId&&!o.stored);if(!pen)return close();const members=all.filter(o=>housingParent(o,all)?.id===penId),available=all.filter(o=>compatible(pen,o)&&!housingParent(o,all)),state=crops().getState();
 const capacity=penCapacity(pen),full=!penHasRoom(pen,all),limited=Number.isFinite(capacity);
 dialog.innerHTML=`<header><div><h2 id="pen-title">${escape(CATALOG[pen.type].name)}</h2><p>Животных: ${members.length}${limited?' / '+capacity:''}</p></div><button data-close aria-label="Закрыть">×</button></header><p>Заселяйте купленных животных с фермы или из ангара. Корм и производство остаются прежними.${limited?' Вместимость — '+capacity+'.':''}</p>${pen.type==='pen_cow'&&pen.cowYardSize===3?'<p role="status">Для увеличенного двора нужно свободное место 4×4. Перенесите коровник рукой. Соседние постройки и все коровы сохранены.</p>':''}${limited&&members.length>capacity?'<p role="status">В старом сохранении превышена вместимость. Все животные сохранены; выпустите лишних на ферму и заселите в другой загон. Новое заселение заблокировано.</p>':''}<section class="pen-residents">${members.map(o=>`<article><strong>${escape(CATALOG[o.type].name)}</strong><span data-pen-status="${escape(o.id)}">${status(o,state)}</span><button data-produce="${escape(o.id)}">Покормить / собрать</button><button data-release="${escape(o.id)}">Выпустить на ферму</button></article>`).join('')||'<p>Загон пока пуст.</p>'}</section><h3>Доступны для заселения</h3>${full?'<p>Загон заполнен: свободных мест нет.</p>':''}<section class="pen-candidates">${available.map(o=>`<button data-house="${escape(o.id)}" ${full?'disabled aria-disabled="true"':''}>Заселить · ${escape(CATALOG[o.type].name)} ${o.stored?'(ангар)':'(ферма)'}</button>`).join('')||(!full?'<p>Нет свободных животных этого вида. Купите их в разделе «Животные».</p>':'')}</section><p role="status">${escape(feedback)}</p>`;
}
function produce(o){if(CHICKENS[o.type]){const s=crops().getState(),job=s.hens[o.id];if(job&&job.readyAt<=s.clock){const r=crops().harvestEggs(o);return r?`Собрано яиц: ${r.yield}`:'Не удалось собрать яйца';}if(job)return 'Яйца будут готовы через '+timeLabel(job.readyAt-s.clock);return crops().feedHen(o)?'Курица накормлена.':'Нужна 1 пшеница.';}
 const r=o.type==='dairy-cow'?crops().activateDairy(o):crops().activateChain(o);if(!r)return 'Действие недоступно.';return r.action==='working'?'До готовности: '+timeLabel(r.remaining):r.action==='missing'?'Недостаточно корма. Рецепт указан в карточке животного.':r.action==='collect'?'Продукция собрана в запасы.':'Животное накормлено.';}
dialog.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.hasAttribute('data-close'))return close();if(b.dataset.house)feedback=decor().house(penId,b.dataset.house)?'Животное заселено.':'Не удалось заселить животное.';if(b.dataset.release)feedback=decor().unhouse(penId,b.dataset.release)?'Животное выпущено на свободное место рядом с загоном.':'На ферме нет подходящего свободного места.';if(b.dataset.produce){const o=decor().getProductionObjects().find(o=>o.id===b.dataset.produce&&o.housedIn===penId);feedback=o?produce(o):'Животное недоступно.';}draw();});
dialog.addEventListener('cancel',e=>{e.preventDefault();close()});
window.SadovodPens={open:o=>{if(!isPen(o))return;penId=o.id;feedback='';draw();if(penId&&!dialog.open)dialog.showModal();}};

setInterval(()=>{if(!dialog.open||document.hidden)return;const state=crops().getState(),members=decor().getProductionObjects();for(const el of dialog.querySelectorAll('[data-pen-status]')){const o=members.find(o=>o.id===el.dataset.penStatus);if(o)el.textContent=status(o,state);}},1000);

// Real owned animals are drawn at measured open-yard anchors of the current view.
// Large groups retain their exact count in the pen dialog; six residents fit visually.
function decorate(group,pen,frame,box){
 if(!isPen(pen))return;
 let layer=group.querySelector('[data-pen-residents]');
 if(!frame.residentAnchors?.length){layer?.remove();return;}
 const members=decor().getOwnedObjects().filter(o=>o.housedIn===pen.id&&!o.stored);group.setAttribute('aria-label',CATALOG[pen.type].name+' · животных: '+members.length);
 if(!layer){layer=document.createElementNS('http://www.w3.org/2000/svg','g');layer.setAttribute('data-pen-residents','');layer.setAttribute('pointer-events','none');group.append(layer);}
 layer.replaceChildren();
 residentPlacements(pen,frame,box,members,type=>decor().getAssets(type)).forEach(({animal,frame:a,rotation,slot,x,y,width,height})=>{
  const image=document.createElementNS('http://www.w3.org/2000/svg','image');
  for(const [k,v]of Object.entries({href:a.src,x,y,width,height}))image.setAttribute(k,v);
  image.setAttribute('data-resident-id',animal.id);image.setAttribute('data-resident-slot',slot);
  layer.append(image);
 });
 // Redraw only the foreground fence/building regions above the residents.
 // This prevents cows standing visually in front of a closed rail or rear wall.
 const foreground=frame.foregroundSrc;
 if(foreground&&members.length){
  const image=document.createElementNS('http://www.w3.org/2000/svg','image');
  for(const [k,v]of Object.entries({href:foreground,x:box.x,y:box.y,width:box.width,height:box.height}))image.setAttribute(k,v);
  layer.append(image);
 }
 if(frame.foregroundPolygons?.length&&members.length){
  const ns='http://www.w3.org/2000/svg',clip=document.createElementNS(ns,'clipPath');
  const id='pen-front-'+encodeURIComponent(pen.id).replace(/%/g,'_');clip.id=id;
  clip.setAttribute('clipPathUnits','userSpaceOnUse');
  for(const points of frame.foregroundPolygons){const p=document.createElementNS(ns,'polygon');p.setAttribute('points',points.map(([x,y])=>[box.x+x*box.scale,box.y+y*box.scale].join(',')).join(' '));clip.append(p);}
  const image=document.createElementNS(ns,'image');
  for(const [k,v]of Object.entries({href:frame.src,x:box.x,y:box.y,width:box.width,height:box.height,'clip-path':`url(#${id})`}))image.setAttribute(k,v);
  layer.append(clip,image);
 }
}
window.SadovodPens.decorate=decorate;
