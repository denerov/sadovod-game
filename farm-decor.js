import {releaseResident} from './pen-release.js?v=210';
import {initialisePlant,plantStage,GROWING_PLANTS} from './plant-growth-model.js?v=264';
import {decoratePlant,ensurePlantArt} from './plant-growth.js?v=270';
import {updateGrounding,removeGrounding} from './object-grounding.js?v=276';
import {canStoreInHangar} from './hangar-policy.js?v=210';
import {isPen,housingParent,productionObjects,fieldObjects,assignAnimal,releaseAnimal,withStableCowSlots} from './pen-model.js?v=207';
import {markLegacyCowYards,upgradeCowYards,expandedCowYard} from './cow-yard-upgrade.js?v=210';
import {placementGuide} from './placement-guides.js?v=210';
import {boundaryJoins,applyBoundaryClip} from './boundary-joins.js?v=270';
import {MAX_GRID_SIZE,MAX_CELLS} from './land-model.js?v=182';
import {cellIndex,cellColumn,cellRow} from './land-model.js?v=182';
import {renderGateParts} from './farm-gates.js?v=182';
import {decorHits} from './decor-hit.js?v=276';
import {isFence,isGate,toggleGate,placeFenceAt} from './fence-model.js?v=207';
import './farm-animals.js?v=210';
import {loadSprite,readySprite} from './sprite-cache.js?v=214';
import {CATALOG,INITIAL,isBridge,footprint,covers,canPlace,validObject,nextRotation,spriteBox,spriteTransform,unprojectSprite,validateFrames,hasFreePlacement,groundPivot,placeDecorAt,EDGE_POSITIONS,registerPlacementFrames,occupiedBounds,placementGrid} from './decor-model.js?v=276';
const KEY='sadovod-decor-v1',NS='http://www.w3.org/2000/svg',plot=document.querySelector('.plot'),view=document.querySelector('.farm-view');
const activeObjects=()=>fieldObjects(objects);
let objects=INITIAL.map(o=>({...o}));try{const saved=JSON.parse(localStorage.getItem(KEY));if(Array.isArray(saved)&&saved.every(validObject))objects=withStableCowSlots(markLegacyCowYards(saved))}catch{}
const node=(tag,attrs={})=>{const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);return e};
let jointCuts=new Map(),joinsDirty=true;
const groups=new Map();let selected=null,draft=null,moving=false,assets={},artTops={};
let spatial=new Map(),cameraView=window.SadovodCameraView||null,visibilityFrame=0,visibilityKey='',enteringFrame=0,coveredBounds=null;
const panel=document.createElement('section');panel.className='decor-actions';panel.hidden=true;panel.setAttribute('aria-label','Действия с предметом');document.body.append(panel);
const footprintMark=node('g',{'data-decor-footprint':'','pointer-events':'none'});plot.append(footprintMark);
const points=(c,r,w=1,h=1)=>[[c,r],[c+w,r],[c+w,r+h],[c,r+h]].map(([x,y])=>`${384+(x-y)*32},${(x+y)*16}`).join(' ');
function showFootprint(){footprintMark.replaceChildren();if(!draft)return;if(moving)placementGuide(footprintMark,draft,cells());const ok=canPlace(draft,objectsNear(draft,1),cells());if(moving&&hasFreePlacement(draft)&&!['edge-cell','center-grid'].includes(CATALOG[draft.type].placement)){const [nx,ny]=placementGrid(draft);for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)footprintMark.append(node('polygon',{points:points(draft.column+x/nx,draft.row+y/ny,1/nx,1/ny),fill:'none',stroke:'#fff0bd','stroke-width':.5}));}const b=occupiedBounds(draft);footprintMark.append(node('polygon',{points:points(b.c,b.r,b.w,b.h),fill:ok?'#f7de7b':'#eb5c49','fill-opacity':.4,stroke:ok?'#ffed9a':'#ff7666','stroke-width':1.5}));const first=plot.querySelector('[data-decor-id], [data-crop-cell], #farmer-pose');if(first)plot.insertBefore(footprintMark,first);else plot.append(footprintMark)}
const edgeControls=document.createElement('section');edgeControls.className='decor-edge-controls';edgeControls.hidden=true;edgeControls.setAttribute('aria-label','Положение предмета в клетке');document.body.append(edgeControls);
const edgeNames={center:['•','Центр'],north:['↖','Верхний левый край'],east:['↗','Верхний правый край'],south:['↘','Нижний правый край'],west:['↙','Нижний левый край']};
function actions(){panel.hidden=true;edgeControls.hidden=true;if(!edgeControls.hidden)edgeControls.innerHTML=Object.entries(edgeNames).map(([key,[icon,label]])=>`<button data-edge="${key}" aria-label="${label}" title="${label}" aria-pressed="${(draft.position||'center')===key}">${icon}</button>`).join('');}
edgeControls.addEventListener('click',e=>{const b=e.target.closest('[data-edge]');if(!b||!draft)return;const previous={...draft};draft={...draft,position:b.dataset.edge};delete draft.offsetX;delete draft.offsetY;if(!commit()){draft=previous;error('Это место занято')}render();});
let gesture=null,hitStack=[];
const rotateButton=document.createElement('button');rotateButton.type='button';rotateButton.className='decor-rotate';rotateButton.hidden=true;rotateButton.setAttribute('aria-label','Повернуть на 90°');rotateButton.title='Повернуть на 90° · R';rotateButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 8a8 8 0 1 0 1 8M19 3v5h-5"/></svg>';document.body.append(rotateButton);
rotateButton.addEventListener('click',e=>{e.stopPropagation();rotate()});
rotateButton.addEventListener('pointerenter',()=>window.dispatchEvent(new CustomEvent('sadovod:cell-hover',{detail:null})));
const storageButton=document.createElement('button');storageButton.type='button';storageButton.className='decor-rotate decor-store';storageButton.hidden=true;storageButton.title='В ангар';storageButton.setAttribute('aria-label','В ангар');storageButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10l4-3h10l4 3v10H3ZM3 10h18M12 2v10m-3-3 3 3 3-3"/></svg>';document.body.append(storageButton);storageButton.addEventListener('click',e=>{e.stopPropagation();if(draft&&!storeObject(draft.id))error('Предмет занят или ангар заполнен')});
const actionButton=document.createElement('button');actionButton.type='button';actionButton.className='decor-rotate decor-gate-action';actionButton.hidden=true;document.body.append(actionButton);
actionButton.addEventListener('pointerenter',()=>window.dispatchEvent(new CustomEvent('sadovod:cell-hover',{detail:null})));
actionButton.addEventListener('click',async e=>{e.stopPropagation();if(!draft||moving||actionButton.disabled||window.SadovodMachines?.selecting())return;if(draft.type==='wheat-mill'){window.SadovodFactory?.activate(draft.id);return}if(window.SadovodMachines?.isMachine(draft)){window.SadovodMachines.beginWork({...draft});return}if(!isGate(draft))return;const id=draft.id;actionButton.disabled=true;try{await ensureAssets(draft.type);if(!draft||draft.id!==id||moving)return;draft=toggleGate(draft);objects=objects.map(o=>o.id===draft.id?{...draft}:o);save();render()}catch{error('Не удалось загрузить положение ворот. Попробуйте ещё раз.')}finally{actionButton.disabled=false}});
const selectionTools=document.createElement('section');selectionTools.className='selection-tools';selectionTools.hidden=true;selectionTools.setAttribute('aria-label','Действия с выбранным предметом');const selectionTitle=document.createElement('span');selectionTitle.className='selection-tools-name';selectionTools.append(storageButton,rotateButton,actionButton,selectionTitle);
const overlapButton=document.createElement('button');overlapButton.type='button';overlapButton.className='decor-overlap';overlapButton.textContent='Выбрать под ним';overlapButton.title='Переключить предметы под точкой нажатия';selectionTools.append(overlapButton);overlapButton.addEventListener('click',()=>{const ids=hitStack.filter(id=>objects.some(o=>o.id===id&&!o.stored));if(ids.length>1)select(ids[(ids.indexOf(selected)+1)%ids.length]);});document.body.append(selectionTools);
function positionButton(){
 const hidden=!draft||moving||!!window.SadovodMachines?.selecting();selectionTools.hidden=hidden;
 storageButton.hidden=hidden||!canStoreInHangar(draft);rotateButton.hidden=hidden||!!CATALOG[draft?.type]?.rotationLocked;
 actionButton.hidden=hidden||!(isGate(draft)||window.SadovodMachines?.isMachine(draft));
 overlapButton.hidden=hidden||hitStack.length<2;if(hidden)return;selectionTitle.textContent=CATALOG[draft.type].name;
 selectionTools.dataset.count=String(Number(!storageButton.hidden)+Number(!rotateButton.hidden)+Number(!actionButton.hidden));
 const group=groups.get(draft.id),matrix=plot.getScreenCTM(),box=group?.artBox;if(!matrix||!box){selectionTools.hidden=true;return;}const x=matrix.a*box.x+matrix.c*box.y+matrix.e,y=matrix.b*box.x+matrix.d*box.y+matrix.f;selectionTools.style.left=Math.max(55,Math.min(innerWidth-55,x))+'px';selectionTools.style.top=Math.max(selectionTools.offsetHeight+8,y-(group.dataset.ripe==='true'?22:6))+'px';
 if(!actionButton.hidden){const machine=window.SadovodMachines?.isMachine(draft);actionButton.title=machine?window.SadovodMachines.actionLabel(draft):draft.open?'Закрыть ворота':'Открыть ворота';actionButton.setAttribute('aria-label',actionButton.title);actionButton.innerHTML=machine?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 10 7-10 7Z"/></svg>':`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20V4h3v16M19 20V4h2v16${draft.open?'M6 6l7-3v15l-7 2V6m0 4 7-3m-7 9 7-3':'M6 7h13M6 17h13M6 7l13 10'}"/></svg>`;}
}

// Camera gestures dismiss the action popover; another tap opens it above the object.
window.addEventListener('sadovod:camera',e=>{selectionTools.hidden=true;cameraView=e.detail});
window.addEventListener('resize',positionButton);
function cells(){return (window.SadovodGround?.getCells()||Array(144).fill('grass')).map((v,i)=>window.SadovodGround?.isPending(cellColumn(i),cellRow(i))?'pending':v)}
function rebuildSpatial(){spatial=new Map();for(const o of activeObjects()){const b=occupiedBounds(o),c0=Math.floor(b.c),c1=Math.ceil(b.c+b.w),r0=Math.floor(b.r),r1=Math.ceil(b.r+b.h);for(let r=r0;r<r1;r++)for(let c=c0;c<c1;c++){const key=c+','+r;if(!spatial.has(key))spatial.set(key,new Set());spatial.get(key).add(o.id)}}}
function objectsNear(o,margin=1){if(!o)return activeObjects();const b=occupiedBounds(o),ids=new Set();for(let r=Math.floor(b.r-margin);r<Math.ceil(b.r+b.h+margin);r++)for(let c=Math.floor(b.c-margin);c<Math.ceil(b.c+b.w+margin);c++)for(const id of spatial.get(c+','+r)||[])ids.add(id);return activeObjects().filter(x=>ids.has(x.id)&&x.id!==o.id)}
function save(){rebuildSpatial();joinsDirty=true;try{window.SadovodSave.setItem(KEY,JSON.stringify(objects))}catch{}window.dispatchEvent(new Event('sadovod:decor-changed'))}
function drawObject(o,state){let g=groups.get(o.id);if(!g){g=node('g',{'data-decor-id':o.id,role:'button',tabindex:0,'aria-label':CATALOG[o.type].name});g.style.cursor='pointer';g.append(node('image',{'pointer-events':'none'}),node('polygon',{'fill':'transparent','pointer-events':'all'}));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(o.id);if(isPen(o))window.SadovodPens?.open(o);else if(window.SadovodChains?.handles(o))window.SadovodChains.activate(o);else if(['winery','vineyard'].includes(o.type))window.SadovodWine?.activate(o);else if(o.type==='ketchup-factory')window.SadovodKetchup?.activate(o);else if(o.type.startsWith('dairy-'))window.SadovodDairy?.activate(o);else if(o.type==='wheat-mill')window.SadovodFactory?.activate(o.id);else if(window.SadovodMachines?.isTree(o))window.SadovodMachines.activate(o);else window.SadovodAnimals?.activate(o)}});groups.set(o.id,g);plot.append(g)}const def=CATALOG[o.type],closedAsset=assets[o.type]?.[o.rotation],asset=closedAsset&&['duck','swan'].includes(o.type)&&cells()[cellIndex(o.column,o.row)]==='water'?{...closedAsset,src:closedAsset.src.replace('-land-','-water-')}:closedAsset;if(!asset)return;
 const box=spriteBox(o,assets[o.type]),img=g.firstElementChild;if(isGate(o))g.setAttribute('aria-label',def.name+(o.open?' · открыты':' · закрыты'));
 const loaded=readySprite(asset.src);
 const isAtlas=asset.src.includes('#xywh=');
 if(isAtlas&&!loaded){
  if(g.pendingSprite!==asset.src){
   g.pendingSprite=asset.src;
   loadSprite(asset.src).then(()=>{
    if(g.pendingSprite!==asset.src||groups.get(o.id)!==g)return;
    const current=selected===o.id&&draft?draft:objects.find(x=>x.id===o.id&&!x.stored);
    if(current&&visibleObject(current)){drawObject(current,window.SadovodCrops?.getState());scheduleSort();positionButton()}
   }).catch(()=>{}).finally(()=>{if(g.pendingSprite===asset.src)g.pendingSprite=null});
  }
  return;
 }
 g.pendingSprite=null;
 const src=loaded?.src||asset.src;
 const usesPlantStage=window.SadovodMachines?.isTree(o)||GROWING_PLANTS.has(o.type);
 if(!asset.modularBridge&&(!usesPlantStage||!img.getAttribute('href'))&&img.getAttribute('href')!==src)img.setAttribute('href',src);
 for(const k of ['x','y','width','height'])img.setAttribute(k,box[k]);
 img.setAttribute('transform',spriteTransform(box,asset));
 applyBoundaryClip(g,img,o,asset,box,jointCuts);if(isGate(o))renderGateParts(g,o,asset,box,src);img.setAttribute('draggable','false');g.querySelector('polygon').setAttribute('points',asset.hitPolygon.map(([x,y])=>`${box.x+x*box.scale},${box.y+y*box.scale}`).join(' '));g.dataset.depth=String(box.pivotY);g.dataset.rotation=String(o.rotation);g.dataset.column=String(o.column);g.dataset.row=String(o.row);g.dataset.pivotX=String(box.pivotX);g.dataset.pivotY=String(box.pivotY);g.dataset.spriteScale=String(box.scale);g.dataset.position=o.offsetX!==undefined?'free':o.position||'center';g.dataset.offsetX=String(o.offsetX??'');g.dataset.offsetY=String(o.offsetY??'');g.worldBox={x:box.x,y:box.y,w:box.width,h:box.height};g.artBox={x:box.pivotX,y:box.y+Math.min(...asset.hitPolygon.map(p=>p[1]))*box.scale};if(isGate(o)&&o.open&&g.dataset.gateArtTop)g.artBox.y=Number(g.dataset.gateArtTop);window.SadovodMachines?.decorate(g,o,asset,box);window.SadovodOrchard?.decorate(g,o,box);window.SadovodAnimals?.decorate(g,o,box,state);window.SadovodDairy?.decorate(g,o,box,state);window.SadovodKetchup?.decorate(g,o,box,state);window.SadovodWine?.decorate(g,o,box,state);window.SadovodChains?.decorate(g,o,box,state);window.SadovodPens?.decorate(g,o,asset,box);
 if(decoratePlant(g,o,box,state))window.SadovodChains?.decorate(g,o,box,state);
 updateGrounding(plot,g,o,img,box,window.SadovodGround?.getCells()||cells(),g.hitFrame||asset);
}
function refreshPlantGrowth(force=false){if(document.hidden)return;const state=window.SadovodCrops?.getState();let changed=false;
 for(const o of activeObjects()){const g=groups.get(o.id);if(!g||!GROWING_PLANTS.has(o.type))continue;if(force||Number(g.dataset.plantStage)!==plantStage(o,state?.chains?.[o.id])){drawObject(o.id===selected&&draft?draft:o,state);changed=true}}
 if(changed){scheduleSort();positionButton()}
}
window.addEventListener('sadovod:plant-art-ready',()=>refreshPlantGrowth(true));
window.addEventListener('sadovod:plant-growth-tick',()=>refreshPlantGrowth());
let lastOrder='',sortFrame=0;
function scheduleSort(){if(!sortFrame)sortFrame=requestAnimationFrame(()=>{sortFrame=0;sort()})}
function sort(){if(sortFrame){cancelAnimationFrame(sortFrame);sortFrame=0;}const list=[...groups.values()].filter(g=>g.style.display!=='none');list.push(...[...plot.querySelectorAll("[data-crop-cell]")].filter(g=>g.style.display!=='none'));const farmer=document.querySelector('#farmer-pose');if(farmer){farmer.dataset.depth=String(Number(farmer.getAttribute('y'))+Number(farmer.getAttribute('height')));list.push(farmer)}list.sort((a,b)=>Number(a.dataset.depth)-Number(b.dataset.depth));const order=list.map(g=>g.dataset.decorId||(g.dataset.cropCell?'crop-'+g.dataset.cropCell:'farmer')).join('|');if(order!==lastOrder){for(const g of list)plot.append(g);lastOrder=order}window.SadovodHarvest?.raiseBadges?.()}
function cameraBounds(overscan=180){if(!cameraView||!(cameraView.scale>0))return null;const {width,height,scale,x,y}=cameraView,margin=overscan/scale;return {left:(-x)/scale-margin,right:(width-x)/scale+margin,top:(-y)/scale-margin,bottom:(height-y)/scale+margin}}
function visibleObject(){return true}
function containsView(outer,inner){
 return outer&&inner&&outer.left<=inner.left&&outer.right>=inner.right&&
  outer.top<=inner.top&&outer.bottom>=inner.bottom;
}
function mountEntering(){
 enteringFrame=0;
 const viewport=cameraBounds(0);
 const expanded=cameraBounds(visibilityFrame?64:180);
 const required=visibilityFrame?viewport:expanded;
 if(!viewport||containsView(coveredBounds,required)||!Object.keys(assets).length)return;
 // Objects newly entering the actual viewport come first. Only add nodes
 // here, so the previous scene stays visible throughout the gesture.
 const missing=activeObjects().filter(o=>!groups.has(o.id)&&visibleObject(o,expanded));
 if(!missing.length){coveredBounds=expanded;return}
 const visible=[],nearby=[];
 for(const o of missing)(visibleObject(o,viewport)?visible:nearby).push(o);
 const state=window.SadovodCrops?.getState();
 for(const o of [...visible,...nearby].slice(0,12))drawObject(o.id===selected&&draft?draft:o,state);
 scheduleSort();
 if(missing.length>12)enteringFrame=requestAnimationFrame(mountEntering);
 else coveredBounds=expanded;
}
function applyVisibility(){
 visibilityFrame=0;
 if(!cameraView||!Object.keys(assets).length)return;
 const bounds=cameraBounds();
 const key=[bounds.left,bounds.right,bounds.top,bounds.bottom,selected||''].join(':');
 if(key===visibilityKey)return;
 visibilityKey=key;
 const active=activeObjects();
 const wanted=new Set(active.filter(o=>visibleObject(o,bounds)).map(o=>o.id));
 let changed=false;
 for(const [id,g] of groups)if(!wanted.has(id)){
  removeGrounding(g);g.remove();groups.delete(id);changed=true;
 }
 if(changed)coveredBounds=null;
 if(!enteringFrame&&!containsView(coveredBounds,bounds))enteringFrame=requestAnimationFrame(mountEntering);
 if(changed)scheduleSort();
}
function scheduleVisibility(){
 if(!enteringFrame&&!containsView(coveredBounds,cameraBounds(0)))enteringFrame=requestAnimationFrame(mountEntering);
 clearTimeout(visibilityFrame);
 visibilityFrame=setTimeout(applyVisibility,180);
}
function render(){if(joinsDirty){jointCuts=boundaryJoins(activeObjects().map(o=>o.id===selected&&draft?draft:o));joinsDirty=false}const active=activeObjects(),byId=new Map(active.map(o=>[o.id,o])),state=active.length?window.SadovodCrops?.getState():null;for(const [id,g]of groups){if(!byId.has(id)){removeGrounding(g);g.remove();groups.delete(id);lastOrder='';}}for(const o of active)drawObject(o.id===selected&&draft?draft:o,state);visibilityKey='';coveredBounds=null;sort();showFootprint();panel.hidden=!draft;actions();positionButton()}
function select(id){if(window.SadovodMachines?.isWorking(id))return;if(selected!==id)window.SadovodHarvest?.close();window.dispatchEvent(new CustomEvent('sadovod:cell-hover',{detail:null}));if(!objects.some(o=>o.id===id))return;selected=id;draft={...objects.find(o=>o.id===id)};moving=false;if(isFence(draft))ensureAssets(draft.type,draft.rotation).catch(()=>{});window.dispatchEvent(new CustomEvent('sadovod:object-selected',{detail:{...draft}}));render()}
function close(){if(!gesture&&!selected&&!draft&&!moving)return;gesture=null;hitStack=[];selected=null;draft=null;moving=false;window.dispatchEvent(new CustomEvent('sadovod:object-selected',{detail:null}));render()}
function commit(){if(!canPlace(draft,objectsNear(draft,1),cells()))return false;objects=objects.map(o=>o.id===selected?{...draft}:o);save();return true}
const error=message=>window.dispatchEvent(new CustomEvent('sadovod:action-error',{detail:{message}}));
// Decode only the requested direction before committing a turn.
panel.addEventListener('pointerenter',()=>window.dispatchEvent(new CustomEvent('sadovod:cell-hover',{detail:null})));
async function rotate(){if(!draft||CATALOG[draft.type].rotationLocked||moving||rotateButton.disabled||window.SadovodMachines?.selecting())return;const id=draft.id,previous=draft.rotation,next=nextRotation(previous);rotateButton.disabled=true;try{await ensureAssets(draft.type,next);if(!draft||draft.id!==id||moving)return;draft.rotation=next;if(!commit()){draft.rotation=previous;error('Сейчас нельзя повернуть предмет')}render()}catch{error('Ракурс не загрузился. Попробуйте ещё раз.')}finally{rotateButton.disabled=false}}
window.addEventListener('keydown',e=>{if(e.key==='Escape')close();if(!e.repeat&&['r','к'].includes(e.key.toLowerCase())&&draft&&!e.target?.closest?.('input,textarea,select,[contenteditable],dialog[open]')&&!document.querySelector('dialog[open]')){e.preventDefault();rotate()}});
window.addEventListener('sadovod:cell-tap',e=>{if(window.SadovodMachines?.selecting())return;const {column,row,tool,objectId}=e.detail;const hit=activeObjects().find(o=>o.id===objectId)||activeObjects().find(o=>!hasFreePlacement(o)&&covers(o,column,row));if(tool==='hand'){if(hit){e.stopImmediatePropagation();select(hit.id);}else close();return;}if(hit&&!window.SadovodGround?.allowsUnderObject?.(tool)){e.stopImmediatePropagation();error('Клетка занята предметом. Возьмите руку, чтобы перенести его.');}},true);
window.addEventListener('sadovod:tool-selected',close);window.addEventListener('sadovod:character-frame',sort);window.addEventListener('sadovod:character-ready',sort);
function localPoint(x,y){const pt=plot.createSVGPoint();pt.x=x;pt.y=y;return pt.matrixTransform(plot.getScreenCTM().inverse())}
function beginDrag(id,x,y){if(window.SadovodHangar?.placing()||window.SadovodMachines?.isWorking(id)||window.SadovodMachines?.selecting()||!objects.some(o=>o.id===id&&!o.stored))return false;select(id);gesture={start:localPoint(x,y),original:{...draft},pivot:groundPivot(draft),moved:false};moving=true;window.dispatchEvent(new CustomEvent('sadovod:cell-hover',{detail:null}));render();return true}
let dragFrame=0,dragPoint=null;
function moveDrag(x,y){dragPoint=[x,y];if(!dragFrame)dragFrame=requestAnimationFrame(()=>{dragFrame=0;const p=dragPoint;dragPoint=null;if(p)moveDragNow(...p)});}
const placementKey=o=>[o.column,o.row,o.rotation,o.position,o.offsetX,o.offsetY,o.centerShiftX,o.centerShiftY,o.cowYardSize].join(':');
function moveDragNow(x,y){if(!gesture)return;const previousKey=placementKey(draft);const pt=localPoint(x,y),dx=pt.x-gesture.start.x,dy=pt.y-gesture.start.y;gesture.moved=true;const dc=dx/64+dy/32,dr=dy/32-dx/64;if(isFence(draft)){draft=placeFenceAt(gesture.original,Math.max(0,Math.min(MAX_GRID_SIZE,gesture.pivot.column+dc)),Math.max(0,Math.min(MAX_GRID_SIZE,gesture.pivot.row+dr)));}else if(isBridge(draft)){draft={...gesture.original,column:Math.max(-1,Math.min(MAX_GRID_SIZE-2,gesture.original.column+Math.round(dc))),row:Math.max(-1,Math.min(MAX_GRID_SIZE-2,gesture.original.row+Math.round(dr)))};}else if(hasFreePlacement(draft)){draft=placeDecorAt(gesture.original,Math.max(0,Math.min(MAX_GRID_SIZE-.000001,gesture.pivot.column+dc)),Math.max(0,Math.min(MAX_GRID_SIZE-.000001,gesture.pivot.row+dr)));}else{const {w,h}=footprint(draft);draft={...gesture.original,column:Math.max(0,Math.min(MAX_GRID_SIZE-w,gesture.original.column+Math.round(dc))),row:Math.max(0,Math.min(MAX_GRID_SIZE-h,gesture.original.row+Math.round(dr)))};}draft=expandedCowYard(draft);if(placementKey(draft)===previousKey)return;if(isFence(draft)||isBridge(draft)){const local=[...objectsNear(draft,2),draft].filter(o=>isFence(o)||isBridge(o));jointCuts=boundaryJoins(local,draft.id);for(const o of local)drawObject(o.id===draft.id?draft:o);}else drawObject(draft);showFootprint();sort();positionButton()}
function endDrag(accept){if(dragFrame){cancelAnimationFrame(dragFrame);dragFrame=0;}if(accept&&dragPoint)moveDragNow(...dragPoint);dragPoint=null;if(!gesture)return;const g=gesture;gesture=null;moving=false;if(!accept||!g.moved)draft={...g.original};else if(!commit()){draft={...g.original};error('Место занято или не подходит для предмета')}if(accept&&g.moved)hitStack=[];render();if(accept&&!g.moved&&isPen(g.original))window.SadovodPens?.open(g.original);else if(accept&&!g.moved&&window.SadovodChains?.handles(g.original))window.SadovodChains.activate(g.original);else if(accept&&!g.moved&&['winery','vineyard'].includes(g.original.type))window.SadovodWine?.activate(g.original);else if(accept&&!g.moved&&g.original.type==='ketchup-factory')window.SadovodKetchup?.activate(g.original);else if(accept&&!g.moved&&g.original.type.startsWith('dairy-'))window.SadovodDairy?.activate(g.original);else if(accept&&!g.moved&&g.original.type==='wheat-mill')window.SadovodFactory?.activate(g.original.id);else if(accept&&!g.moved&&window.SadovodMachines?.isTree(g.original))window.SadovodMachines.activate(g.original);else if(accept&&!g.moved)window.SadovodAnimals?.activate(g.original)}
const productLoads=new Map();
function ensureFrame(type,rotation=0){const key=type+':'+rotation;if(productLoads.has(key))return productLoads.get(key);if(!assets[type])return Promise.reject(Error('Assets not ready'));const a=assets[type][rotation];const frames=a.bridgeVariants?a.bridgeVariants.map(src=>({...a,src})):['duck','swan'].includes(type)?[a,{...a,src:a.src.replace('-land-','-water-')}]:[a];if(a.foregroundSrc)frames.push({...a,src:a.foregroundSrc});const promise=Promise.all([ensurePlantArt(type,rotation),...frames.map(async asset=>{const loaded=await loadSprite(asset.src);if(loaded.width!==(asset.pixelWidth||asset.width)||loaded.height!==(asset.pixelHeight||asset.height))throw Error('Sprite size mismatch')} )]).catch(e=>{productLoads.delete(key);throw e});productLoads.set(key,promise);return promise}

// Edges snap to any of four sides during a single drag. Decode all four once.
function ensureAssets(type,rotation=0){return (isFence({type})||CATALOG[type]?.placement==='edge-cell')?Promise.all([0,1,2,3].map(r=>ensureFrame(type,r))):ensureFrame(type,rotation)}

const alphaMasks=new Map(),MAX_ALPHA_MASKS=24;
function alphaHit(frame,p){let mask=alphaMasks.get(frame.src);if(!mask){const loaded=readySprite(frame.src);if(!loaded){loadSprite(frame.src).catch(()=>{});return true}const ratio=Math.min(1,256/Math.max(frame.width,frame.height)),width=Math.max(1,Math.ceil(frame.width*ratio)),height=Math.max(1,Math.ceil(frame.height*ratio)),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{willReadFrequently:true}),fit=Math.min(width/loaded.image.naturalWidth,height/loaded.image.naturalHeight),iw=loaded.image.naturalWidth*fit,ih=loaded.image.naturalHeight*fit;ctx.drawImage(loaded.image,(width-iw)/2,(height-ih)/2,iw,ih);mask={data:ctx.getImageData(0,0,width,height),ratio};alphaMasks.set(frame.src,mask);while(alphaMasks.size>MAX_ALPHA_MASKS)alphaMasks.delete(alphaMasks.keys().next().value)}else{alphaMasks.delete(frame.src);alphaMasks.set(frame.src,mask)}const x=Math.floor(p.x*mask.ratio),y=Math.floor(p.y*mask.ratio),data=mask.data;return x>=0&&y>=0&&x<data.width&&y<data.height&&data.data[(y*data.width+x)*4+3]>32;}
function resolveHit(x,y,preferredId){const mounted=activeObjects().filter(o=>groups.has(o.id));hitStack=decorHits(mounted,assets,localPoint(x,y),alphaHit,o=>groups.get(o.id)?.hitFrame);return hitStack.includes(selected)?selected:hitStack[0]}
function storeObject(id){const o=objects.find(o=>o.id===id&&!o.stored);if(!o||!canStoreInHangar(o)||moving||window.SadovodMachines?.isWorking(id)||objects.filter(o=>o.stored).length>=30)return false;o.stored=true;o.storedAt=window.SadovodCrops?.getClock()||0;if(isPen(o))for(const animal of objects.filter(a=>a.housedIn===o.id))animal.housingPausedAt=o.storedAt;close();save();render();return true}
function restoreObject(id,column,row,placement=null){const old=objects.find(o=>o.id===id&&o.stored);if(!old)return false;const o={...expandedCowYard(old),...placement,id:old.id,type:old.type,column:placement?.column??column,row:placement?.row??row};delete o.stored;delete o.storedAt;if(!validObject(o)||!canPlace(o,objectsNear(o,1),cells()))return false;const paused=Math.max(0,(window.SadovodCrops?.getClock()||0)-(old.storedAt||0));window.SadovodCrops?.resumeStoredAnimal?.(id,paused);if(isPen(o))for(const animal of objects.filter(a=>a.housedIn===id)){window.SadovodCrops?.resumeStoredAnimal?.(animal.id,Math.max(0,(window.SadovodCrops?.getClock()||0)-(animal.housingPausedAt??old.storedAt??0)));delete animal.housingPausedAt;}window.SadovodOrchard?.resumeStoredTree?.(id,paused);objects=objects.map(x=>x.id===id?o:x);save();render();select(id);return true}
function house(penId,animalId){const old=objects.find(o=>o.id===animalId),updated=assignAnimal(objects,penId,animalId);if(!updated||moving)return false;if(old.stored)window.SadovodCrops?.resumeStoredAnimal?.(animalId,Math.max(0,(window.SadovodCrops?.getClock()||0)-(old.storedAt||0)));objects=updated;close();save();render();return true;}
function unhouse(penId,animalId){const parent=objects.find(o=>o.id===penId&&!o.stored);if(!parent)return false;const updated=releaseResident(objects,penId,animalId,cells());if(!updated||moving)return false;objects=updated;save();render();return true;}
window.SadovodDecor=Object.freeze({house,unhouse,getProductionObjects:()=>productionObjects(objects).map(o=>({...o})),store:storeObject,restore:restoreObject,getStored:()=>objects.filter(o=>o.stored).map(o=>({...o})),getOwnedObjects:()=>objects.map(o=>({...o})),resolveHit,ensureAssets,select,close,render,rotate,getAssets:type=>assets[type],getGroup:id=>groups.get(id),getObjectsNear:(o,margin=1)=>objectsNear(o,margin).map(x=>({...x})),add:o=>{if(!validObject(o)||!canPlace(o,objectsNear(o,1),cells())||!assets[o.type])return false;initialisePlant(o);objects.push(o);save();render();select(o.id);return true},beginDrag,moveDrag,endDrag,isMoving:()=>moving,at:(c,r)=>{for(const id of spatial.get(c+','+r)||[]){const o=objects.find(x=>x.id===id&&!x.stored);if(o&&covers(o,c,r))return o}},getObjects:()=>activeObjects().map(o=>({...o})),blockedCells:()=>activeObjects().flatMap(o=>{if(isFence(o))return [];const b=occupiedBounds(o),out=[];for(let r=Math.floor(b.r);r<Math.ceil(b.r+b.h);r++)for(let c=Math.floor(b.c);c<Math.ceil(b.c+b.w);c++)out.push(cellIndex(c,r));return out})});
fetch('https://sadovod-webgl-engine-test.ddenerov.chatgpt.site/assets/current-v205/catalog.json?v=270').then(response=>{if(!response.ok)throw Error('Object catalog unavailable');return response.json()}).then(data=>{
 for(const type of Object.keys(CATALOG))validateFrames(data[type],CATALOG[type].rotationLocked);
 assets=data;objects=upgradeCowYards(objects,cells());for(const o of objects)initialisePlant(o,Date.now(),true);for(const type of ['bench','vineyard','stakhanov_bench'])registerPlacementFrames(type,data[type]);
 for(const [type,frames]of Object.entries(data))artTops[type]=Math.max(...frames.map(a=>a.anchorY-Math.min(...a.hitPolygon.map(p=>p[1]))))*CATALOG[type].canvasHeight/frames[0].height;
 rebuildSpatial();jointCuts=boundaryJoins(activeObjects());joinsDirty=false;save();render();window.dispatchEvent(new Event('sadovod:decor-ready'));
}).catch(()=>{window.dispatchEvent(new Event('sadovod:decor-ready'));error('Не удалось загрузить изображения предметов. Обновите страницу.');});

window.addEventListener('sadovod:crops-changed',sort);

const objectTip=document.createElement('div');objectTip.className='object-name-tip';objectTip.hidden=true;objectTip.setAttribute('role','tooltip');document.body.append(objectTip);
let hoveredObject=null;function hideObjectTip(){objectTip.hidden=true;hoveredObject=null;}
view.addEventListener('pointermove',e=>{if(moving||e.buttons||e.pointerType==='touch'||window.SadovodMachines?.selecting()){hideObjectTip();return;}const id=e.target.closest?.('[data-decor-id]')?.dataset.decorId,g=groups.get(id),o=id&&objects.find(o=>o.id===id);if(!o||moving||e.buttons||window.SadovodMachines?.selecting()){hideObjectTip();return}window.dispatchEvent(new CustomEvent('sadovod:cell-hover',{detail:null}));if(hoveredObject===o.id&&!objectTip.hidden)return;hoveredObject=o.id;objectTip.textContent=CATALOG[o.type].name;objectTip.hidden=false;const rect=g.querySelector('polygon').getBoundingClientRect(),w=objectTip.offsetWidth;objectTip.style.left=Math.max(8,Math.min(innerWidth-w-8,rect.left+rect.width/2-w/2))+'px';objectTip.style.top=Math.max(8,rect.top-objectTip.offsetHeight+4)+'px';window.dispatchEvent(new CustomEvent('sadovod:cell-hover',{detail:null}));});
view.addEventListener('pointerleave',hideObjectTip);view.addEventListener('pointerdown',hideObjectTip);window.addEventListener('sadovod:camera',hideObjectTip);window.addEventListener('sadovod:tool-selected',hideObjectTip);

window.addEventListener('sadovod:ground-changed',()=>{for(const o of activeObjects())if(['duck','swan'].includes(o.type))drawObject(o);});
