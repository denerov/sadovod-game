import {updatePierWater,removePierWater} from './pier-water.js?v=276';
import {readySprite} from './sprite-cache.js?v=214';
import {placementGuide} from './placement-guides.js?v=210';
import {boundaryJoins,applyBoundaryClip} from './boundary-joins.js?v=270';
import {GARDEN_PRODUCTS} from './garden-products-v186.js?v=268';
import {PEN_DESIGNS} from './pen-designs-v183.js?v=207';
import {MAX_GRID_SIZE,MAX_CELLS} from './land-model.js?v=182';
import {RESTORED} from './legacy-data.js?v=282';
import {restoredTypes} from './chain-model.js?v=210';
import {cellIndex} from './land-model.js?v=182';
import {BIRDS} from './bird-model.js?v=182';
import {WINERY,VINEYARD} from './wine-model.js?v=182';
import {KETCHUP_FACTORY} from './ketchup-model.js?v=209';
import {DAIRY_COW,DAIRY_FACTORY} from './dairy-model.js?v=209';
import {FACTORIES} from './factory-model.js?v=210';
import {FUEL,TREE_XP} from './economy.js?v=210';
import {workField,waitForMachine} from './machine-work.js?v=182';
import {FENCES,isFence,placeFenceAt} from './fence-model.js?v=207';
import {CHICKENS} from './animal-model.js?v=182';
import {CATALOG,isBridge,placeBridgeAt,placementGrid,isSmallAnimal,spriteBox,spriteTransform,canPlace,placeDecorAt,occupiedBounds} from './decor-model.js?v=276';
import {TREES,OrchardModel} from './orchard-model.js?v=182';
import {MACHINES,eligible,workRoute,machineDirection} from './machinery-model.js?v=210';
import {CROPS} from './crop-model.js?v=210';
const PRODUCTS={...GARDEN_PRODUCTS,...PEN_DESIGNS,...restoredTypes,...BIRDS,winery:WINERY,vineyard:VINEYARD,'ketchup-factory':KETCHUP_FACTORY,'dairy-cow':DAIRY_COW,'dairy-factory':DAIRY_FACTORY,...FACTORIES,...MACHINES,...TREES,...CHICKENS,...FENCES};
const NS='http://www.w3.org/2000/svg',plot=document.querySelector('.plot');
const svg=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n};
const notice=message=>window.dispatchEvent(new CustomEvent('sadovod:action-error',{detail:{message}}));
const bar=document.createElement('section');bar.className='machine-controls';bar.hidden=true;bar.setAttribute('aria-label','Управление техникой');document.body.append(bar);
const veil=document.createElement('div');veil.className='machine-veil';veil.hidden=true;document.body.append(veil);
let mode='area',choosing=false,areaDragging=false;
let selection=null,areaStart=null,areaEnd=null,armed=false,purchase=null,seed='wheat',active=null,treeProvider=null;
const marks=svg('g',{'pointer-events':'none','data-machine-selection':''});plot.append(marks);
const crops=()=>window.SadovodCrops,decor=()=>window.SadovodDecor,ground=()=>window.SadovodGround;
const machine=o=>o&&MACHINES[o.type];
function candidates(a,b){return workRoute(a,b).filter(cell=>valid(cell.column,cell.row))}
function valid(c,r,surfaces=null){if(!selection)return false;const object=decor()?.at(c,r),crop=crops()?.getCell(c,r);return eligible(selection.type,{column:c,row:r},{surface:(surfaces||ground()?.getCells())[cellIndex(c,r)],object,pending:ground()?.isPending(c,r)||crops()?.isPending(c,r),crop,seedCount:selection.type==='seeder'?(crops()?.getSeedCount(seed)||0):0,ripe:selection.type==='orchard'?gardenRipe(object):crops()?.isRipe(c,r)})}
function diamond(c,r){const x=384+(c-r)*32,y=(c+r)*16;return `${x},${y} ${x+32},${y+16} ${x},${y+32} ${x-32},${y+16}`}
function highlight(){marks.replaceChildren();if(areaStart){const surfaces=ground().getCells();for(const cell of workRoute(areaStart,areaEnd||areaStart)){const ok=valid(cell.column,cell.row,surfaces);marks.append(svg('polygon',{points:diamond(cell.column,cell.row),fill:ok?'#e6d482':'#d45040','fill-opacity':.23,stroke:ok?'#ffefad':'#ed8575','stroke-width':.7}))}plot.append(marks)}}
const purchaseGhost=svg('g',{'pointer-events':'none','data-purchase-preview':''});
const purchaseTile=svg('polygon',{'stroke-width':1.3,'fill-opacity':.25});
const purchaseImage=svg('image',{opacity:.78});purchaseGhost.append(purchaseTile,purchaseImage);
let purchaseCell=null;
const purchaseControls=document.createElement('div');purchaseControls.className='object-placement';purchaseControls.hidden=true;purchaseControls.setAttribute('aria-label','Установка ограды');purchaseControls.innerHTML='<button type="button" class="decor-rotate" data-placement-rotate aria-label="Повернуть" title="Повернуть"><svg viewBox="0 0 24 24"><path d="M19 8a8 8 0 1 0 1 8M19 3v5h-5"/></svg></button><button type="button" class="decor-rotate" data-placement-cancel aria-label="Отменить установку" title="Отменить установку"><svg viewBox="0 0 24 24"><path d="m8 8 8 8m0-8-8 8"/></svg></button>';document.body.append(purchaseControls);
purchaseControls.addEventListener('click',e=>{e.stopPropagation();const b=e.target.closest('button');if(b?.hasAttribute('data-placement-rotate'))rotatePurchase();if(b?.hasAttribute('data-placement-cancel')){reset();decor().close()}});
purchaseControls.addEventListener('pointerenter',()=>window.dispatchEvent(new CustomEvent('sadovod:cell-hover',{detail:null})));
function positionPurchaseControls(){purchaseControls.hidden=!purchase||CATALOG[purchase.type]?.rotationLocked||purchase.loading||!purchaseCell;if(purchaseControls.hidden)return;const o=purchaseObject(purchaseCell.column,purchaseCell.row,purchaseCell.x,purchaseCell.y),frames=decor().getAssets(o.type),b=spriteBox(o,frames),pt=plot.createSVGPoint(),matrix=plot.getScreenCTM();if(!matrix){purchaseControls.hidden=true;return}pt.x=b.pivotX;pt.y=b.y+Math.min(...frames.flatMap(a=>a.hitPolygon.map(p=>p[1])))*b.scale;const screen=pt.matrixTransform(matrix);purchaseControls.style.left=screen.x+'px';purchaseControls.style.top=(screen.y-16)+'px';}
window.addEventListener('resize',positionPurchaseControls);window.addEventListener('sadovod:camera',positionPurchaseControls);
function purchaseObject(c,r,x,y){let o={id:'purchase-preview',type:purchase.type,column:c,row:r,rotation:purchase.rotation||0};if(isBridge(o))return placeBridgeAt(o,c,r,ground().getCells(),decor().getObjects(),!purchase.lockRotation);if(isFence(o)&&Number.isFinite(x)&&Number.isFinite(y)&&!purchase.lockRotation){const pt=plot.createSVGPoint();pt.x=x;pt.y=y;const p=pt.matrixTransform(plot.getScreenCTM().inverse());return placeFenceAt(o,(p.x-384)/64+p.y/32,p.y/32-(p.x-384)/64)}if(['edge-cell','center-grid'].includes(CATALOG[o.type]?.placement)){if(Number.isFinite(x)&&Number.isFinite(y)){const pt=plot.createSVGPoint();pt.x=x;pt.y=y;const p=pt.matrixTransform(plot.getScreenCTM().inverse());return placeDecorAt(o,(p.x-384)/64+p.y/32,p.y/32-(p.x-384)/64)}return placeDecorAt(o,c+.5,r+.5)}if(isSmallAnimal(o)){if(Number.isFinite(x)&&Number.isFinite(y)){const pt=plot.createSVGPoint();pt.x=x;pt.y=y;const p=pt.matrixTransform(plot.getScreenCTM().inverse()),column=(p.x-384)/64+p.y/32,row=p.y/32-(p.x-384)/64;o=placeDecorAt(o,Math.max(c,Math.min(c+.999,column)),Math.max(r,Math.min(r+.999,row)))}else{o=placeDecorAt(o,c+.5,r+.5);const[nx,ny]=placementGrid(o);for(let sy=0;sy<ny;sy++)for(let sx=0;sx<nx;sx++){const candidate=placeDecorAt(o,c+(sx+.5)/nx,r+(sy+.5)/ny);if(canPlace(candidate,decor().getObjects(),ground().getCells()))return candidate}}}return o}
function showPurchasePreview(c,r,x,y){if(!purchase||purchase.loading)return;purchaseCell={column:c,row:r,x,y};const o=purchaseObject(c,r,x,y);const frames=window.SadovodPlantArt?.seedlingFrames(o.type)||TREES[o.type]&&plantCatalog[o.type]?.[0]||decor().getAssets(o.type);if(!frames)return;const nearby=decor().getObjectsNear?.(o,2)||decor().getObjects(),cells=ground().getCells(),box=spriteBox(o,frames),ok=canPlace(o,nearby,cells)&&!ground().isPending(c,r);placementGuide(purchaseGhost,o,cells);const bounds=occupiedBounds(o);purchaseTile.setAttribute('points',[[bounds.c,bounds.r],[bounds.c+bounds.w,bounds.r],[bounds.c+bounds.w,bounds.r+bounds.h],[bounds.c,bounds.r+bounds.h]].map(([x,y])=>`${384+(x-y)*32},${(x+y)*16}`).join(' '));purchaseTile.setAttribute('fill',ok?'#d9f49b':'#f77e65');purchaseTile.setAttribute('stroke',ok?'#d9f49b':'#f77e65');purchaseGhost.dataset.valid=String(ok);purchaseImage.setAttribute('href',readySprite(frames[o.rotation].src)?.src||frames[o.rotation].src);for(const key of ['x','y','width','height'])purchaseImage.setAttribute(key,box[key]);purchaseImage.setAttribute('transform',spriteTransform(box,frames[o.rotation]));applyBoundaryClip(purchaseGhost,purchaseImage,o,frames[o.rotation],box,boundaryJoins([...nearby,o],o.id));plot.append(purchaseGhost);updatePierWater(plot,purchaseGhost,o,purchaseImage,box,frames[o.rotation]);positionPurchaseControls();}
function clearPurchasePreview(){removePierWater(purchaseGhost);purchaseGhost.remove();purchaseCell=null;positionPurchaseControls();}
function initialPurchasePreview(){const cells=ground().getCells(),owned=decor().getObjects(),free=[];for(let r=0;r<MAX_GRID_SIZE;r++)for(let c=0;c<MAX_GRID_SIZE;c++){const o=isBridge(purchase)?placeBridgeAt({id:'purchase-preview',type:purchase.type,rotation:0},c,r,cells,owned):CATALOG[purchase.type]?.placement==='center-grid'?purchaseObject(c,r):{id:'purchase-preview',type:purchase.type,column:c,row:r,rotation:0};if(canPlace(o,owned,cells)&&!ground().isPending(c,r))free.push({c,r,d:Math.abs(c-5)+Math.abs(r-5)})}free.sort((a,b)=>a.d-b.d);const first=free[0]||{c:5,r:5};showPurchasePreview(first.c,first.r);}
let hoverFrame=0,lastPurchaseHover=null;window.addEventListener('sadovod:cell-hover',e=>{if(!purchase||purchase.loading||!e.detail)return;lastPurchaseHover=e.detail;if(!hoverFrame)hoverFrame=requestAnimationFrame(()=>{hoverFrame=0;const p=lastPurchaseHover;if(purchase&&p)showPurchasePreview(p.column,p.row,p.x,p.y)})});
window.addEventListener('sadovod:crops-changed',()=>{if(purchaseCell&&purchase&&!purchase.loading)showPurchasePreview(purchaseCell.column,purchaseCell.row,purchaseCell.x,purchaseCell.y)});
function bedQuota(){
 const used=ground().getCells().filter(surface=>surface==='bed').length;
 const limit=crops().bedLimit();
 return {used,limit,room:Math.max(0,limit-used)};
}
function toolbar(){
 bar.classList.toggle('is-placement',!!purchase);bar.classList.toggle('is-field-work',!purchase&&!!selection&&!TREES[selection.type]);bar.classList.toggle('is-active',!!active);positionPurchaseControls();if(purchase&&isFence(purchase)){bar.hidden=true;veil.hidden=true;bar.classList.remove('is-dialog');return;}
 veil.hidden=true;bar.classList.remove('is-dialog');bar.setAttribute('role','region');bar.removeAttribute('aria-modal');
 if(purchase){
  bar.hidden=false;
  bar.setAttribute('aria-label','Размещение предмета');
  const hint=purchase.loading?'Подготавливаем предмет…':({
   water:'Выберите клетку воды.',
   bridge:'Суша или вода. Поворот — R или ↻.',
   shore:'Поставьте задней частью на берег.',
   'water-pen':'Вода 3×3 рядом с берегом.'
  })[PRODUCTS[purchase.type].placementRule]||'Нажмите на свободную клетку.';
  bar.innerHTML=`<strong class="placement-name">${PRODUCTS[purchase.type].name}</strong><button class="placement-done" data-cancel aria-label="Завершить размещение">Готово</button><span class="placement-hint" role="status">${hint}</span>`;
  return;
 }
 bar.setAttribute('aria-label','Управление техникой');
 if(!selection){bar.hidden=true;return}if(TREES[selection.type]){bar.hidden=true;openTree(selection);return}bar.hidden=false;
 const def=MACHINES[selection.type],s=crops().getState();
 if(active){bar.innerHTML=`<strong>${def.verb}</strong><span role="status"><b data-work-count>${active.done}</b>/${active.total}</span><button data-stop aria-label="Остановить работу">Стоп</button>`;return}
 const quota=selection.type==='tractor'?bedQuota():null;
 const available=areaStart?candidates(areaStart,areaEnd||areaStart).length:0;
 const count=Math.min(available,s.fuel,quota?.room??MAX_CELLS,selection.type==='seeder'?s.seeds[seed]||0:MAX_CELLS);
 const hint=quota&&!quota.room?'Лимит достигнут':areaDragging?'Выбрано: '+count:selection.type==='seeder'&&!seed?'Выберите семена':'Протяните по клеткам';
 const seeds=selection.type==='seeder'?`<select aria-label="Семена для сеялки"><option value="" ${!seed?'selected':''} disabled>Семена</option>${Object.entries(CROPS).map(([id,c])=>`<option value="${id}" ${seed===id?'selected':''} ${!s.seeds[id]?'disabled':''}>${c.name} · ${s.seeds[id]}</option>`).join('')}</select>`:'';
 const beds=quota?`<span class="machine-bed-count" aria-label="Грядок ${quota.used} из ${quota.limit}">Грядки ${quota.used}/${quota.limit}</span>`:'';
 const fuel=s.fuel===0?`<button data-refuel ${s.coins<FUEL.cost?'disabled':''}>Заправить · ${FUEL.cost} ₽</button>`:`<span class="machine-fuel">Топливо ${s.fuel}</span>`;
 bar.innerHTML=`<strong>${def.action}</strong>${seeds}<span class="machine-work-hint">${hint}</span>${beds}${fuel}<button class="harvest-close" data-cancel aria-label="Отменить работу"><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 3L13 13M13 3L3 13"/></svg></button>`;

}

function reset(){if(active)return;areaDragging=false;choosing=false;window.SadovodHarvest?.close();purchase=null;clearPurchasePreview();selection=null;armed=false;areaStart=null;areaEnd=null;highlight();toolbar()}
async function startPurchase(type,currency='coins'){if(!PRODUCTS[type]||active)return false;const blocked=crops().purchaseBlock(type);if(blocked){notice(blocked);return false}const amount=currency==='coal'?PRODUCTS[type].coal:PRODUCTS[type].cost;if(!Number.isFinite(amount)||crops().getState()[currency]<amount)return false;if(!decor()?.getAssets(type)){notice('Предмет ещё загружается. Попробуйте через мгновение.');return false}document.querySelector('[data-tool="hand"]').click();decor().close();selection=null;const token={type,currency,amount,loading:true};purchase=token;toolbar();try{await decor().ensureAssets(type);if(purchase!==token)return false;token.loading=false;initialPurchasePreview();toolbar();return true}catch{if(purchase===token)reset();notice('Не удалось загрузить предмет. Повторите покупку.');return false}}
function place(c,r,x,y){
 const p=purchase;if(!p||p.loading)return;
 const o={...purchaseObject(c,r,x,y),id:`${p.type}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`};
 if(!canPlace(o,decor().getObjectsNear?.(o,1)||decor().getObjects(),ground().getCells())||ground().isPending(c,r)){
  notice(isBridge(o)?'Нужны три свободные клетки суши или воды. Поворот — R или ↻.':isFence(o)?'Эта граница занята или не подходит для ограды':'Место занято или поверхность не подходит');return;
 }
 const blocked=crops().purchaseBlock(p.type);if(blocked){notice(blocked);reset();return;}
 if(!crops().spend(p.amount,p.currency)){notice('Недостаточно средств');reset();return;}
 clearPurchasePreview();
 if(!decor().add(o)){crops().refund(p.amount,p.currency);purchase=p;showPurchasePreview(c,r,x,y);notice('Поставить здесь не получилось');toolbar();return;}
 window.SadovodSound?.play('coins');decor().close();
 if(crops().getState()[p.currency]>=p.amount&&!crops().purchaseBlock(p.type)){
  purchase=p;showPurchasePreview(c,r,x,y);toolbar();
 }else reset();
 notice(`На участке: ${PRODUCTS[o.type].name}`);
}
function decorate(g,o,asset,box){if(!machine(o))return;if(o.type!=='orchard'){g.querySelector('.machine-beacon')?.remove();g.dataset.machine=o.type;return;}let beacon=g.querySelector('.machine-beacon');if(!beacon){beacon=svg('g',{'class':'machine-beacon','pointer-events':'none'});beacon.append(svg('ellipse',{rx:4,ry:2.3,fill:'#ffc94b',opacity:.3}),svg('circle',{r:1.7,fill:'#ffe992'}));g.append(beacon)}const b=asset.beacon||[asset.width*.5,asset.height*.18];beacon.setAttribute('transform',`translate(${box.x+b[0]*box.scale} ${box.y+b[1]*box.scale})`);g.dataset.machine=o.type;}
function gardenRipe(o,state=null){if(!o||o.stored)return false;if(TREES[o.type])return !!treeProvider?.isRipe(o);state||=crops().getState();if(o.type==='vineyard')return state.wine.vines[o.id]?.remaining===0;return !!RESTORED[o.type]?.auto&&state.chains[o.id]?.remaining===0;}
function harvestGarden(o){if(!gardenRipe(o))return false;if(TREES[o.type])return treeProvider.harvest(o);const r=o.type==='vineyard'?crops().activateWine(o):crops().activateChain(o);return r?.action==='harvest'||r?.action==='collect';}
async function runOrchard(){
 if(active||!selection)return;const parked={...selection},snapshot=crops().getState(),jobs=decor().getObjects().filter(o=>gardenRipe(o,snapshot)).sort((a,b)=>a.row-b.row||a.column-b.column).slice(0,snapshot.fuel);
 if(!jobs.length){notice(crops().getState().fuel?'Нет созревших деревьев':'Нет топлива');reset();return;}
 const job={id:parked.id,done:0,total:jobs.length,stop:false};active=job;window.SadovodSound?.play('engine');armed=false;choosing=false;marks.replaceChildren();decor().close();selection=parked;toolbar();
 crops().beginBatch?.();orchardBatch=true;
 try{await workField({type:'orchard',jobs,cancelled:()=>job.stop,io:{eligible:(o,reserved)=>decor().getObjects().some(x=>x.id===o.id&&x.column===o.column&&x.row===o.row)&&gardenRipe(o)&&(reserved||!ground().isPending(o.column,o.row)),reserve:o=>ground().machineReserve(o.column,o.row),release:o=>ground().machineRelease(o.column,o.row),spendFuel:()=>crops().spend(1,'fuel'),refundFuel:()=>crops().refund(1,'fuel'),apply:harvestGarden},onProgress:done=>{job.done=done;const count=bar.querySelector('[data-work-count]');if(count)count.textContent=done;}});}catch{notice('Работа прервана. Собранные плоды сохранены.');}finally{orchardBatch=false;if(orchardBatchSave){orchardBatchSave=false;saveOrchard();renderTrees()}crops().endBatch?.();active=null;selection=null;areaStart=null;areaEnd=null;decor().select(parked.id);toolbar();notice(`Собрано деревьев: ${job.done} · осталось топлива: ${crops().getState().fuel}`);}
}

async function run(){
 if(selection?.type==='orchard')return runOrchard();
 if(active||!selection||!areaStart)return;
 const parked={...selection},chosenSeed=seed,s=crops().getState();
 const quota=parked.type==='tractor'?bedQuota():null;
 const bedRoom=quota?.room??MAX_CELLS;const jobs=candidates(areaStart,areaEnd||areaStart).slice(0,Math.min(s.fuel,bedRoom,parked.type==='seeder'?s.seeds[chosenSeed]||0:MAX_CELLS));
 if(!jobs.length){notice(quota&&!quota.room?`Лимит грядок достигнут: ${quota.used} из ${quota.limit}.`:!s.fuel?'Закончилось топливо':parked.type==='seeder'&&!s.seeds[chosenSeed]?'Закончились выбранные семена':'Нет подходящих клеток');reset();return;}
 const job={id:parked.id,done:0,total:jobs.length,stop:false};active=job;window.SadovodSound?.play('engine');armed=false;choosing=false;
 window.dispatchEvent(new CustomEvent('sadovod:cell-hover',{detail:null}));marks.replaceChildren();decor().close();selection=parked;toolbar();
 crops().beginBatch?.();try{await workField({type:parked.type,jobs,cancelled:()=>job.stop,io:{
  eligible:(cell,reserved)=>eligible(parked.type,cell,{surface:ground().getCells()[cellIndex(cell.column,cell.row)],object:decor().at(cell.column,cell.row),crop:crops().getCell(cell.column,cell.row),pending:(!reserved&&ground().isPending(cell.column,cell.row))||crops().isPending(cell.column,cell.row),seedCount:crops().getState().seeds[chosenSeed]||0,ripe:crops().isRipe(cell.column,cell.row)}),
  reserve:cell=>ground().machineReserve(cell.column,cell.row),release:cell=>ground().machineRelease(cell.column,cell.row),
  spendFuel:()=>crops().spend(1,'fuel'),refundFuel:()=>crops().refund(1,'fuel'),
  apply:cell=>parked.type==='tractor'?ground().machineTill(cell.column,cell.row):crops().machineAction(parked.type==='seeder'?'sow':'harvest',cell.column,cell.row,chosenSeed)
 },onProgress:done=>{job.done=done;const count=bar.querySelector('[data-work-count]');if(count)count.textContent=done;}});
 }catch{notice('Работа остановлена. Выполненные действия сохранены.');}
 finally{crops().endBatch?.();active=null;selection=null;areaStart=null;areaEnd=null;decor().select(parked.id);toolbar();notice(`${MACHINES[parked.type].name}: обработано ${job.done} клеток`);}
}
window.addEventListener('sadovod:cell-hover',e=>{if(armed&&choosing&&areaStart&&e.detail){areaEnd={column:e.detail.column,row:e.detail.row};highlight();}});
window.addEventListener('sadovod:object-selected',()=>{if(!active&&!purchase)reset()});
window.addEventListener('sadovod:cell-tap',e=>{if(!purchase&&!armed)return;e.stopImmediatePropagation();const {column:c,row:r}=e.detail;if(purchase){place(c,r,e.detail.pointerX,e.detail.pointerY);return}if(!areaStart){areaStart={column:c,row:r};areaEnd=null;if(mode==='single'){armed=false;choosing=false}}else{areaEnd={column:c,row:r};armed=false;choosing=false}highlight();toolbar();if(!choosing){if(selection.type==='orchard')bar.querySelector('[data-run]')?.focus();else run()}},true);
bar.addEventListener('change',e=>{if(e.target.tagName==='SELECT'){seed=e.target.value;armed=!!seed;highlight();toolbar()}});
async function rotatePurchase(){if(!purchase||CATALOG[purchase.type]?.rotationLocked||purchase.loading)return;const current=purchaseCell&&purchaseObject(purchaseCell.column,purchaseCell.row,purchaseCell.x,purchaseCell.y);const next=((current?.rotation??purchase.rotation??0)+1)%4,token=purchase;token.loading=true;try{await decor().ensureAssets(token.type,next);if(purchase!==token)return;token.rotation=next;token.lockRotation=true;}catch{notice('Ракурс не загрузился. Попробуйте ещё раз.');return;}finally{token.loading=false;}if(purchaseCell)showPurchasePreview(purchaseCell.column,purchaseCell.row,purchaseCell.x,purchaseCell.y)}
window.addEventListener('keydown',e=>{if(purchase&&!CATALOG[purchase.type]?.rotationLocked&&!e.repeat&&['r','к'].includes(e.key.toLowerCase())&&!e.target?.closest?.('input,textarea,select,[contenteditable],dialog[open]')){e.preventDefault();rotatePurchase()}});
bar.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-purchase-rotate')){rotatePurchase();return}if(b.hasAttribute('data-mode')){mode=b.dataset.mode;armed=true;choosing=true;areaStart=null;areaEnd=null;highlight();toolbar();return}if(b.hasAttribute('data-return')){armed=false;choosing=false;toolbar();return}if(b.hasAttribute('data-tree-harvest')){const result=treeProvider.harvest(selection);if(result)notice(`Собрано ${result.yield} шт. в запасы`);toolbar()}if(b.hasAttribute('data-machine-rotate'))decor().rotate();if(b.hasAttribute('data-cancel')){reset();decor().close()}if(b.hasAttribute('data-arm')){if(selection.type==='orchard'&&!treeProvider){notice('На участке пока нет плодовых деревьев. Сборщик работает со спелыми яблонями и грушами.');return}armed=true;areaStart=null;areaEnd=null;highlight();toolbar()}if(b.hasAttribute('data-run'))run();if(b.hasAttribute('data-stop')){active.stop=true;b.disabled=true;b.textContent='Останавливается…'}if(b.hasAttribute('data-refuel')&&crops().buyFuel()){toolbar()}});
veil.addEventListener('click',()=>{reset();decor().close()});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!active){reset();decor().close()}if(e.key==='Tab'&&bar.classList.contains('is-dialog')&&!bar.hidden){const items=[...bar.querySelectorAll('button:not(:disabled),select')];if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1).focus()}else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0].focus()}}});
window.addEventListener('sadovod:tool-selected',()=>{if(!active)reset()});
function beginWork(o){if(active||!MACHINES[o?.type])return;reset();decor().close();selection={...o};mode='area';areaStart=null;areaEnd=null;if(o.type==='orchard'){runOrchard();return;}if(o.type==='combine'){areaStart={column:0,row:0};areaEnd={column:MAX_GRID_SIZE-1,row:MAX_GRID_SIZE-1};run();return;}seed=o.type==='seeder'?'':seed;armed=o.type==='tractor';choosing=true;toolbar();}
function beginArea(cell){if(!cell||!armed||active||purchase||!['tractor','seeder'].includes(selection?.type))return false;areaDragging=true;areaStart={column:cell.column,row:cell.row};areaEnd={...areaStart};highlight();toolbar();return true;}
function updateArea(cell){if(!areaDragging||!cell||areaEnd?.column===cell.column&&areaEnd?.row===cell.row)return;areaEnd={column:cell.column,row:cell.row};highlight();}
function endArea(cell,cancelled=false){if(!areaDragging)return;updateArea(cell);areaDragging=false;if(cancelled){areaStart=null;areaEnd=null;highlight();toolbar();return;}armed=false;choosing=false;run();}

window.SadovodMachines={beginArea,updateArea,endArea,beginWork,isMachine:o=>!!MACHINES[o?.type],actionLabel:o=>MACHINES[o?.type]?'Запустить: '+MACHINES[o.type].name:'',canActivate:o=>!!PRODUCTS[o?.type],isTree:o=>!!TREES[o?.type],dismiss:reset,activate:o=>{if(TREES[o?.type])openTree(o)},startPurchase,decorate,isWorking:id=>active?.id===id,selecting:()=>!!purchase||armed,objectTarget:()=>!purchase&&selection?.type==='orchard',registerTrees:provider=>{treeProvider=provider},describe:(c,r)=>{if(purchase&&isFence(purchase))return null;if(purchase){const o=purchaseObject(c,r,purchaseCell?.x,purchaseCell?.y);return {text:'Установить '+PRODUCTS[purchase.type].name,valid:canPlace(o,decor().getObjectsNear?.(o,1)||decor().getObjects(),ground().getCells())&&!ground().isPending(c,r)}}return armed?{text:`${MACHINES[selection.type].action} · ${valid(c,r)?'выбрать клетку':'клетка не подходит'}`,valid:valid(c,r)}:null}};

const ORCHARD_KEY='sadovod-orchard-v88';let orchardSaved;try{orchardSaved=JSON.parse(localStorage.getItem(ORCHARD_KEY)||'null')}catch{}
const orchard=new OrchardModel(orchardSaved||{}),clock=()=>crops()?.getClock()||0;
let lastOrchardSave='',orchardBatch=false,orchardBatchSave=false;const saveOrchard=()=>{if(orchardBatch){orchardBatchSave=true;return}try{const next=JSON.stringify(orchard.state);if(next!==lastOrchardSave){window.SadovodSave.setItem(ORCHARD_KEY,next);lastOrchardSave=next}}catch{}};
treeProvider={remaining:o=>orchard.remaining(o,clock()),isRipe:o=>!!TREES[o?.type]&&orchard.remaining(o,clock())===0,harvest:o=>{const result=orchard.harvest(o,clock());if(result){window.SadovodSound?.play('harvest');saveOrchard();crops().recordProgress?.('fruit',result.yield);crops().addXP(TREE_XP[o.type]||0);if(!orchardBatch)renderTrees()}return result}};
let plantCatalog={};fetch('./assets/plants-hd-v118/catalog.json').then(r=>r.json()).then(data=>{plantCatalog=data;renderTrees()}).catch(()=>notice('Не удалось загрузить стадии растений'));
function openTree(o){if(!o||!TREES[o.type])return;const def=TREES[o.type],result=treeProvider.harvest(o);if(result){window.SadovodHarvest?.notify({name:def.name,type:o.type,count:result.yield});}else{const seconds=Math.ceil(treeProvider.remaining(o)/1000);window.SadovodHarvest?.notify({name:def.name,type:o.type,message:`До урожая: ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`});}}

function decorateTree(g,o,box){if(!TREES[o.type])return;const stage=orchard.stage(o,clock()),frame=plantCatalog[o.type]?.[stage]?.[o.rotation];if(!frame)return;const src=frame.src;g.hitFrame=frame;const visualKey=[stage,o.rotation,box.x,box.y,box.scale].join(':');if(g.dataset.treeVisual!==visualKey||g.firstElementChild.getAttribute('href')!==src){g.dataset.treeVisual=visualKey;g.firstElementChild.setAttribute('href',src);g.querySelector('polygon').setAttribute('points',frame.hitPolygon.map(([x,y])=>`${box.x+x*box.scale},${box.y+y*box.scale}`).join(' '));g.artBox={x:box.pivotX,y:box.y+Math.min(...frame.hitPolygon.map(p=>p[1]))*box.scale};window.dispatchEvent(new CustomEvent('sadovod:plant-frame',{detail:{group:g}}));}g.dataset.plantStage=stage;g.dataset.ripe=treeProvider.isRipe(o);g.setAttribute('aria-label',`${TREES[o.type].name} · ${stage===5?'урожай созрел':stage===0?'саженец':stage===2?'цветение':'растёт'}`);window.SadovodHarvest?.badge(g,o.type,box.pivotX,box.pivotY-(stage===0?58:94),stage===5,()=>openTree(o));}
function renderTrees(){let added=false;for(const o of decor()?.getObjects()||[]){if(!TREES[o.type])continue;if(!Object.hasOwn(orchard.state.trees,o.id))added=true;orchard.ensure(o,clock());const g=decor().getGroup(o.id);if(!g)continue;const scale=TREES[o.type].canvasHeight/260,x=Number(g.dataset.pivotX),y=Number(g.dataset.pivotY);decorateTree(g,o,{pivotX:x,pivotY:y,x:x-140*scale,y:y-250*scale,scale});if(window.SadovodHarvest?.isOpen(o.id))window.SadovodHarvest.update({key:o.id,remaining:treeProvider.remaining(o)});}if(added)saveOrchard()}
window.addEventListener('sadovod:decor-changed',renderTrees);window.addEventListener('sadovod:crops-changed',()=>{renderTrees();if(selection&&TREES[selection.type])toolbar()});
window.SadovodOrchard={withStock:fn=>{const result=fn(orchard.state.stock);if(result)saveOrchard();return result},resumeStoredTree:(id,ms)=>{const t=orchard.state.trees[id];if(t){t.plantedAt+=ms;t.cycleAt+=ms;saveOrchard()}},decorate:decorateTree,getStage:o=>orchard.stage(o,clock()),getState:()=>structuredClone(orchard.state),getStock:()=>({...orchard.state.stock}),sell:(type,count=orchard.state.stock[type])=>{if(!TREES[type]||!Number.isSafeInteger(count)||count<=0||count>orchard.state.stock[type])return false;const amount=count*TREES[type].sale;orchard.state.stock[type]-=count;saveOrchard();crops().recordProgress?.('sales',amount);crops().refund(amount);window.SadovodSound?.play('coins');return true}};
// First machinery release: one starter vehicle of each kind, without replacing
// any saved surface or existing object. Future catalog purchases remain paid.
async function starterFleet(){const key='sadovod-starter-machinery-v88';if(localStorage.getItem(key))return;let placed=0;for(const type of Object.keys(MACHINES)){if(decor().getObjects().some(o=>o.type===type)){placed++;continue}let slot;for(let r=10;r>=0&&!slot;r--)for(let c=1;c<MAX_GRID_SIZE;c+=2){if(ground().getCells()[cellIndex(c,r)]==='grass'&&!ground().isPending(c,r)&&!decor().at(c,r)){slot={column:c,row:r};break}}if(!slot)break;try{await decor().ensureAssets(type);if(decor().add({id:'starter-'+type,type,...slot,rotation:0}))placed++}catch{break}}decor().close();if(placed===4)window.SadovodSave.setItem(key,'1')}
// v121: keep existing starter vehicles, but do not grant a free fleet to new farms.
