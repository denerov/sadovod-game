import {updatePierWater,removePierWater} from './pier-water.js?v=276';
import {canStoreInHangar} from './hangar-policy.js?v=210';
import {placementGuide} from './placement-guides.js?v=210';
import {isFence,placeFenceAt} from './fence-model.js?v=207';
import {boundaryJoins,applyBoundaryClip} from './boundary-joins.js?v=214';
import {readySprite} from './sprite-cache.js?v=214';
import {CATALOG,isBridge,placeBridgeAt,spriteBox,spriteTransform,canPlace,hasFreePlacement,placeDecorAt} from './decor-model.js?v=276';
const decor=()=>window.SadovodDecor;
const notice=message=>window.dispatchEvent(new CustomEvent('sadovod:action-error',{detail:{message}}));
const hangar=document.createElement('dialog');hangar.className='hangar-dialog';hangar.setAttribute('aria-labelledby','hangar-title');
hangar.innerHTML=`<button class="hangar-back" aria-label="Вернуться на ферму"><img src="https://sadovod-webgl-engine-test.ddenerov.chatgpt.site/assets/ui-v109/back-arrow.svg" alt=""></button><button class="hangar-close" aria-label="Закрыть ангар"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button><section class="hangar-panel"><h2 id="hangar-title">Ангар</h2><nav class="hangar-tabs" aria-label="Расположение предметов"><button data-location="stored" aria-pressed="true">В ангаре</button><button data-location="field" aria-pressed="false">На ферме</button></nav><p class="hangar-caption"></p><div class="hangar-items" data-game-scroll></div><div class="hangar-selected"></div><p class="hangar-feedback" role="status" aria-live="polite"></p></section>`;
document.body.append(hangar);
let location='stored',selected=null,placing=null,opening=0;
const bar=document.createElement('div');bar.className='hangar-placement';bar.hidden=true;bar.innerHTML='<span></span><button>Отмена</button>';document.body.append(bar);
const NS='http://www.w3.org/2000/svg',ghost=document.createElementNS(NS,'g'),ghostImage=document.createElementNS(NS,'image');ghost.setAttribute('pointer-events','none');ghost.append(ghostImage);
function cancelPlace(){placing=null;removePierWater(ghost);ghost.remove();bar.hidden=true;}
bar.querySelector('button').onclick=cancelPlace;
function close(){opening++;hangar.close();document.querySelector('[data-tool="hand"]').click();}
hangar.querySelector('.hangar-close').onclick=close;hangar.querySelector('.hangar-back').onclick=close;
hangar.addEventListener('cancel',e=>{e.preventDefault();close()});
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const art=o=>{const src=decor().getAssets(o.type)?.[o.rotation]?.src;return src?(readySprite(src)?.src||(src.includes('#xywh=')?'':src)):'';};
function draw(){
 const stored=decor().getStored(),items=location==='stored'?stored:decor().getObjects().filter(canStoreInHangar);
 const item=items.find(o=>o.id===selected)||items[0];selected=item?.id;
 hangar.querySelectorAll('[data-location]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.location===location)));
 hangar.querySelector('.hangar-caption').textContent=location==='stored'?`${stored.length} / 30 мест · выберите предмет для возврата`:'Только переносимый декор: ограды, лавочки, статуи и цветники';
 hangar.querySelector('.hangar-items').innerHTML=items.map(o=>`<button class="hangar-item ${o.id===selected?'selected':''}" data-select="${escape(o.id)}" aria-pressed="${o.id===selected}">${art(o)?`<img src="${escape(art(o))}" alt="">`:''}<span>${escape(CATALOG[o.type].name)}</span></button>`).join('')||`<div class="hangar-vacant"><h3>${location==='stored'?'В ангаре пока пусто':'На ферме нет предметов'}</h3><p>${location==='stored'?'Во вкладке «На ферме» можно выбрать предмет для хранения.':''}</p></div>`;
 const blocked=item&&(location==='field'&&(stored.length>=30||window.SadovodMachines?.isWorking(item.id)));
 hangar.querySelector('.hangar-selected').innerHTML=item?`<div class="hangar-portrait">${art(item)?`<img src="${escape(art(item))}" alt="">`:''}</div><div class="hangar-description"><h3>${escape(CATALOG[item.type].name)}</h3><p>${location==='stored'?'Верните предмет на свободное место на ферме. Ранее убранные здания сохранены, но повторно убрать их нельзя.':'Переносимый декор можно бесплатно вернуть на ферму.'}</p><button class="hangar-transfer" data-transfer="${escape(item.id)}" ${blocked?'disabled':''}>${location==='stored'?'Вытащить':'Убрать в ангар'}</button></div>`:'';
}
async function show(){cancelPlace();location='stored';selected=null;const request=++opening;draw();hangar.querySelector('.hangar-feedback').textContent='';hangar.showModal();const types=[...new Set(decor().getOwnedObjects().filter(o=>o.stored||canStoreInHangar(o)).map(o=>o.type))];for(const type of types){try{await decor().ensureAssets(type)}catch{}if(request!==opening||!hangar.open)return;}draw();}
hangar.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.location){location=b.dataset.location;selected=null;hangar.querySelector('.hangar-feedback').textContent='';draw();return;}
 if(b.dataset.select){selected=b.dataset.select;draw();return;}
 if(!b.dataset.transfer||b.disabled)return;
 if(location==='field'){const ok=decor().store(b.dataset.transfer);draw();hangar.querySelector('.hangar-feedback').textContent=ok?'Предмет убран в ангар.':'Предмет занят или ангар заполнен.';return;}
 const item=decor().getStored().find(o=>o.id===b.dataset.transfer);if(!item)return;b.disabled=true;
 try{await decor().ensureAssets(item.type,isBridge(item)?undefined:item.rotation);if(!hangar.open)return;close();placing=item;bar.querySelector('span').textContent=CATALOG[item.type].name+' · выберите свободное место';bar.hidden=false;}catch{hangar.querySelector('.hangar-feedback').textContent='Не удалось загрузить предмет. Попробуйте снова.';b.disabled=false;}
});
window.addEventListener('sadovod:cell-hover',e=>{if(!placing)return;if(!e.detail){ghost.remove();return;}const o=placementAt(e.detail),frames=decor().getAssets(o.type),box=spriteBox(o,frames);placementGuide(ghost,o,window.SadovodGround.getCells());ghostImage.setAttribute('href',readySprite(frames[o.rotation].src)?.src||frames[o.rotation].src);for(const k of ['x','y','width','height'])ghostImage.setAttribute(k,box[k]);ghostImage.setAttribute('transform',spriteTransform(box,frames[o.rotation]));applyBoundaryClip(ghost,ghostImage,o,frames[o.rotation],box,boundaryJoins([...decor().getObjects(),o],o.id));ghost.setAttribute('opacity',canPlace(o,decor().getObjects(),window.SadovodGround.getCells())?'.8':'.3');const plot=document.querySelector('.plot');plot.append(ghost);updatePierWater(plot,ghost,o,ghostImage,box,frames[o.rotation]);});
window.addEventListener('sadovod:cell-tap',e=>{if(!placing)return;e.stopImmediatePropagation();if(decor().restore(placing.id,e.detail.column,e.detail.row,placementAt(e.detail))){cancelPlace();notice('Предмет возвращён на ферму.')}else notice('Это место занято или не подходит для предмета.');},true);
window.addEventListener('sadovod:tool-selected',cancelPlace);window.addEventListener('keydown',e=>{if(e.key==='Escape')cancelPlace()});
window.SadovodHangar={open:show,placing:()=>!!placing};

function placementAt(detail){const o={...placing,...(placing.type==='pen_cow'?{cowYardSize:4}:{}),column:detail.column,row:detail.row};delete o.stored;delete o.storedAt;if(isBridge(o))return placeBridgeAt(o,detail.column,detail.row,window.SadovodGround.getCells(),decor().getObjects());let c=detail.column+.5,r=detail.row+.5;const x=detail.x??detail.pointerX,y=detail.y??detail.pointerY;if(Number.isFinite(x)&&Number.isFinite(y)){const plot=document.querySelector('.plot'),p=plot.createSVGPoint();p.x=x;p.y=y;const q=p.matrixTransform(plot.getScreenCTM().inverse());c=(q.x-384)/64+q.y/32;r=q.y/32-(q.x-384)/64;}return isFence(o)?placeFenceAt(o,c,r):hasFreePlacement(o)?placeDecorAt(o,c,r):o;}
