import {PAVINGS,PAVING_KEY,cleanPaving,layPaving} from './paving-model.js?v=207';
import {cellIndex,cellColumn,cellRow} from './land-model.js?v=182';
import {landBoundary} from './land-model.js?v=182';
import {pathAxis,rakeRemoval} from './path-progress.js?v=182';
import {contour} from './terrain-geometry.js?v=182';
import {FarmerActionQueue} from './action-queue.js?v=182';
import {FarmGround,DigQueue} from './farm-ground.js?v=182';
import {roundedBed} from './terrain-details.js?v=258';
import {bedEdgeNodes} from './bed-surface.js?v=258';
import {PaintedTurfEdge} from './painted-turf-edge.js?v=262';
import {bedCoverage} from './terrain-boundaries.js?v=258';
import {TerrainRenderer,terrainPixelRatio} from './terrain-svg-renderer.js?v=297';
(() => {
 const svg=document.querySelector('.plot'),NS='http://www.w3.org/2000/svg';
 const node=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);return n};
 const key='sadovod-surfaces-v1';let saved=[];try{saved=JSON.parse(localStorage.getItem(key)||'[]')}catch{}
 const ground=new FarmGround(saved,cells=>{try{window.SadovodSave.setItem(key,JSON.stringify(cells))}catch{}}),cells=ground.cells;
 let savedPaving={};try{savedPaving=JSON.parse(localStorage.getItem(PAVING_KEY)||'{}')}catch{}
 const paving=cleanPaving(savedPaving,cells),savePaving=()=>window.SadovodSave.setItem(PAVING_KEY,JSON.stringify(paving));
 const defs=node('defs'),clip=node('clipPath',{id:'farm-ground'});clip.append(node('path',{d:landBoundary(cells)}));
 const soil=node('pattern',{id:'dug-soil',patternUnits:'userSpaceOnUse',width:24,height:12});const soilImage=node('image',{width:24,height:12,preserveAspectRatio:'none'});soil.append(soilImage);defs.append(clip,soil);
 const restoredGrass=node('pattern',{id:'restored-grass',patternUnits:'userSpaceOnUse',width:46,height:44});restoredGrass.append(node('rect',{width:46,height:44,fill:'#278b32'}),node('image',{href:'./assets/surfaces/lawn-221.webp',width:46,height:44,opacity:.65}));defs.append(restoredGrass);
 const pavingLayer=node('g',{'pointer-events':'none','data-paving-layer':'true'}),pavingPatterns=new Set();
 const bedTurf=new PaintedTurfEdge(),bedLayer=node('g',{'pointer-events':'none'}),pendingLayer=node('g',{'pointer-events':'none'});svg.append(defs,pavingLayer,bedLayer,bedTurf.node,pendingLayer);
 const renderer=new TerrainRenderer(svg),beds=new Map(),markers=new Map(),rakeJobs=new Map();let signature='';
 function setCamera(view){renderer.setView({...view,dpr:terrainPixelRatio(view.width,view.height,window.devicePixelRatio,matchMedia('(pointer:coarse)').matches)})}
 window.addEventListener('sadovod:camera',e=>setCamera(e.detail));
 // Initial geometry only; subsequent camera events carry coordinates without layout reads.
 const area=svg.parentElement.getBoundingClientRect(),rect=svg.getBoundingClientRect(),v=svg.viewBox.baseVal,scale=Math.min(rect.width/v.width,rect.height/v.height);
 setCamera({width:area.width,height:area.height,scale,x:rect.left-area.left+(rect.width-v.width*scale)/2-v.x*scale,y:rect.top-area.top+(rect.height-v.height*scale)/2-v.y*scale});
 const project=(c,r)=>[(c-r)*32+384,(c+r)*16];
 function render(){
  let pavingChanged=false;for(const i of Object.keys(paving))if(cells[i]!=='path'){delete paving[i];pavingChanged=true}if(pavingChanged)savePaving();
  const next=JSON.stringify(paving)+cells.join('|');
  if(next!==signature){signature=next;renderer.update(cells.map((v,i)=>paving[i]?'grass':v),window.SadovodDecor?.getObjects?.()||[]);pavingLayer.replaceChildren();
   for(const id of new Set(Object.values(paving))){
    if(!pavingPatterns.has(id)){const a=PAVINGS[id].scene,pattern=node('pattern',{id,patternUnits:'userSpaceOnUse',width:32,height:32,patternTransform:'matrix(1 .5 -1 .5 384 0)'}),tile=node('svg',{width:32,height:32,viewBox:a.crop.join(' '),preserveAspectRatio:'none'});tile.append(node('image',{href:a.src,width:a.width,height:a.height}));pattern.append(tile);defs.append(pattern);pavingPatterns.add(id);}
    const selectedCells=cells.map((v,i)=>paving[i]===id?'grass':'void');pavingLayer.append(node('path',{d:landBoundary(selectedCells),fill:'url(#'+id+')'}));
   }
  }
  bedTurf.update(bedCoverage(cells),{front:true,soil:false});
  if(cells.includes('bed')&&!soilImage.hasAttribute('href'))soilImage.setAttribute('href','./assets/surfaces/bed-221.webp');
  cells.forEach((v,i)=>{const r=cellRow(i),c=cellColumn(i);
   if(v==='bed'&&!beds.has(i)){const g=node('g',{'data-dug-bed':i});g.append(node('path',{d:roundedBed(c,r),fill:'url(#dug-soil)'}));g.append(...bedEdgeNodes(roundedBed(c,r)));bedLayer.append(g);beds.set(i,g)}
   if(v!=='bed'&&beds.has(i)){beds.get(i).remove();beds.delete(i)}
   if(ground.pending.has(i)&&!markers.has(i)){const ps=[project(c,r),project(c+1,r),project(c+1,r+1),project(c,r+1)],marker=node('path',{d:rakeJobs.has(i)||v!=='grass'?'M'+ps.map(p=>p.join(' ')).join('L')+'Z':roundedBed(c,r),fill:'none',stroke:'#ead38c','stroke-opacity':.35,'stroke-width':.8,'data-pending-cell':i});pendingLayer.append(marker);markers.set(i,marker)}
   if(!ground.pending.has(i)&&markers.has(i)){markers.get(i).remove();markers.delete(i)}
  });
  window.dispatchEvent(new CustomEvent('sadovod:ground-changed'));
 }
 window.addEventListener('sadovod:decor-changed',()=>{signature='';render()});
 window.addEventListener('sadovod:decor-ready',()=>{signature='';render()});
 // Visual work state follows the farmer clock, not an independent CSS animation.
 window.addEventListener('sadovod:character-frame',e=>{const {action,column,row,progress}=e.detail;if(action!=='dig')return;const i=cellIndex(column,row),marker=markers.get(i);if(!marker)return;
  marker.setAttribute('stroke-opacity','1');marker.setAttribute('stroke-width','1.2');marker.dataset.progress=progress.toFixed(3);
  if(cells[i]==='grass'){const soil=Math.max(0,Math.min(1,(progress-.72)/.25));marker.setAttribute('fill','url(#dug-soil)');marker.setAttribute('fill-opacity',String(soil));}else{marker.setAttribute('fill','url(#restored-grass)');marker.setAttribute('fill-opacity',String(Math.max(0,Math.min(1,(progress-.72)/.25))));}
 });
 // A quiet ownership edge that stays fine at any camera zoom.
 const boundary=node('g',{'pointer-events':'none','data-land-boundary':'true'}),boundaryD=landBoundary(cells);
 boundary.append(node('path',{d:boundaryD,fill:'none',stroke:'rgba(184,207,116,.65)','stroke-width':1.2,'stroke-linejoin':'round','vector-effect':'non-scaling-stroke'}));svg.append(boundary);

 let selected=null,pavingSelection=null;
 document.querySelectorAll('[data-surface]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.surface;pavingSelection=null;svg.style.cursor='pointer'}));
 document.querySelector('.dock').addEventListener('click',e=>{if(e.target.closest('[data-tool]')){selected=null;pavingSelection=null;svg.style.cursor='grab'}});
 // The camera owns the gesture: a tap paints; dragging/pinching only moves the view.
 window.addEventListener('sadovod:cell-tap',e=>{const {column,row,tool}=e.detail;if(tool!=='landscape'||!selected)return;if(selected==='path'){enqueuePath(column,row);return}if(selected==='grass'){const action=describe(column,row,tool);if(action.valid)digQueue.restoreGrass(column,row);else window.dispatchEvent(new CustomEvent('sadovod:action-error',{detail:{message:action.text}}));return}if(ground.paint(column,row,selected)){window.SadovodSound?.play(selected==='water'?'water':'dig');window.dispatchEvent(new CustomEvent('sadovod:surface-placed',{detail:{column,row}}));render()}});
 let previousPath=null;
 const actions=new FarmerActionQueue(async(action,target)=>{
  const farmer=window.SadovodCharacter;if(!farmer)throw Error('Персонаж ещё загружается');await farmer.whenIdle();
  if(action==='rake'){const next=[...rakeJobs.values()].find(p=>p.column!==target.column||p.row!==target.row);target={...target,axis:pathAxis(target,previousPath,next,cells)}}
  await new Promise((resolve,reject)=>farmer.playAction(action,{...target,instant:action==='rake',onComplete:resolve,onCancel:()=>reject(Error('Действие прервано'))}).catch(reject));
  if(action==='rake')previousPath=target;
 });

 // Progress is a small SVG clip; the full terrain repaints only when a cell completes.
 window.addEventListener('sadovod:tool-selected',e=>{if(e.detail.action==='dig')soilImage.setAttribute('href','./assets/surfaces/bed-221.webp')});
 const roadPattern=node('pattern',{id:'rake-road',patternUnits:'userSpaceOnUse',width:43,height:29});
 const roadImage=node('image',{width:43,height:29});roadPattern.append(roadImage);defs.append(roadPattern);
 function enqueuePath(column,row){
  const i=ground.index(column,row);const pavingId=pavingSelection;
  if(i<0||ground.pending.has(i))return;
  if(pavingId){if(!['grass','path'].includes(cells[i])||paving[i]===pavingId)return;if(window.SadovodCrops.getState().coins<PAVINGS[pavingId].cost){window.dispatchEvent(new CustomEvent('sadovod:action-error',{detail:{message:'Недостаточно рублей для укладки плитки'}}));return;}}else if(cells[i]!=='grass')return;
  roadImage.setAttribute('href','./assets/surfaces/sand-221.webp');ground.pending.add(i);rakeJobs.set(i,{column,row,pavingId});render();
  actions.enqueue('rake',{column,row}).then(()=>{ground.pending.delete(i);if(pavingId){const result=layPaving({id:pavingId,index:i,cells,paving,spend:n=>window.SadovodCrops.spend(n),paint:()=>ground.paint(column,row,'path')});if(result?.refund)window.SadovodCrops.refund(result.refund);if(result===true)savePaving();else window.dispatchEvent(new CustomEvent('sadovod:action-error',{detail:{message:'Плитка не уложена: проверьте покрытие и баланс'}}));}else ground.paint(column,row,'path');window.SadovodSound?.play('dig');render()}).catch(error=>{ground.pending.delete(i);render();window.dispatchEvent(new CustomEvent('sadovod:action-error',{detail:{message:error.message||'Не удалось проложить дорожку. Попробуйте ещё раз.'}}))}).finally(()=>{const job=rakeJobs.get(i);rakeJobs.delete(i);requestAnimationFrame(()=>{job?.group?.remove();job?.clip?.remove()})});
 }
 window.addEventListener('sadovod:character-frame',e=>{const state=e.detail;if(state.action!=='rake')return;const i=cellIndex(state.column,state.row),job=rakeJobs.get(i);if(!job)return;
  const marker=markers.get(i);if(marker){marker.dataset.action='rake';marker.dataset.progress=state.workProgress.toFixed(3);marker.setAttribute('fill','none');marker.setAttribute('stroke-opacity',state.working?'1':'.4')}
  if(!state.working||job.pavingId)return;
  if(!job.group){const prospective=[...cells];for(const index of rakeJobs.keys())prospective[index]='path';job.clip=node('clipPath',{id:'rake-progress-'+i});job.mask=node('path');job.clip.append(job.mask);defs.append(job.clip);job.group=node('g',{'clip-path':`url(#rake-progress-${i})`});const d=contour(prospective,'path');job.group.append(node('path',{d,fill:'url(#rake-road)'}),node('path',{d,fill:'rgba(113,77,40,.18)'}));pendingLayer.prepend(job.group)}
  job.mask.setAttribute('d',rakeRemoval(state.column,state.row,state.axis,state.workProgress,cells));
 });
 const digQueue=new DigQueue(ground,target=>actions.enqueue('dig',target).then(()=>{window.SadovodSound?.play('dig')}),render,()=>window.dispatchEvent(new CustomEvent('sadovod:action-error',{detail:{message:'Не удалось выполнить копание. Нажмите на свободную клетку ещё раз.'}})));
 window.SadovodGround=Object.freeze({allowsUnderObject:tool=>tool==='landscape'&&selected==='path',cellIndex,choosePaving:id=>{if(!PAVINGS[id])return false;pavingSelection=id;selected='path';window.dispatchEvent(new CustomEvent('sadovod:action-error',{detail:{message:PAVINGS[id].name+' · '+PAVINGS[id].cost+' ₽ за клетку. Выберите газон или дорожку.'}}));return true;},expand:(level=1)=>{if(!ground.expand(level))return false;window.SadovodSound?.play('coins');clip.firstChild.setAttribute('d',landBoundary(cells));boundary.firstChild.setAttribute('d',landBoundary(cells));render();return true},machineReserve:(c,r)=>{const i=ground.index(c,r);if(i<0||ground.pending.has(i))return false;ground.pending.add(i);render();return true},machineRelease:(c,r)=>{ground.pending.delete(ground.index(c,r));render()},machineTill:(c,r)=>{const i=ground.index(c,r);if(i<0||cells[i]!=="grass")return false;ground.pending.delete(i);cells[i]="bed";ground.persist([...cells]);render();window.SadovodSound?.play('dig');return true},enqueueAction:(action,target)=>actions.enqueue(action,target),getCells:()=>[...cells],getAction:(column,row,tool)=>describe(column,row,tool),isPending:(column,row)=>ground.pending.has(cellIndex(column,row)),dig:(column,row)=>!window.SadovodDecor?.at(column,row)&&digQueue.enqueue(column,row)});
 window.addEventListener('sadovod:cell-tap',e=>{const {column,row,tool}=e.detail;if(tool==='shovel')digQueue.enqueue(column,row)});

 function describe(column,row,tool){const machine=window.SadovodMachines?.describe(column,row);if(machine)return machine;const i=ground.index(column,row),surface=cells[i];if(i<0)return null;
  const object=window.SadovodDecor?.at(column,row);if(object&&!(tool==='landscape'&&selected==='path'))return tool==='hand'?null:{text:'Клетка занята предметом',valid:false};
  if(ground.pending.has(i))return {text:rakeJobs.has(i)?'В очереди: дорожка':cells[i]==='grass'?'В очереди: копание':'В очереди: восстановление газона',valid:false};
  if(tool==='shovel')return surface==='grass'?{text:'Вскопать грядку',valid:true}:{text:'Копать можно только газон',valid:false};
  if(surface==='bed'&&['hand','watering'].includes(tool)){const cropAction=window.SadovodCrops?.describe(column,row,tool);if(cropAction)return cropAction}
  if(tool==='watering')return {text:'Выберите грядку с растением',valid:false};
  if(tool==='hand'&&window.SadovodCrops?.getSelected?.())return {text:'Сначала вскопайте грядку лопатой',valid:false};
  if(tool==='landscape'){
   if(!selected)return {text:'Выберите покрытие',valid:false};
   if(selected==='path'&&pavingSelection)return {text:paving[i]===pavingSelection?'Эта плитка уже уложена':PAVINGS[pavingSelection].name+' · '+PAVINGS[pavingSelection].cost+' ₽ за клетку',valid:['grass','path'].includes(surface)&&paving[i]!==pavingSelection&&window.SadovodCrops.getState().coins>=PAVINGS[pavingSelection].cost};
   if(selected==='path')return {text:surface==='grass'?'Проложить дорожку граблями':surface==='path'?'Дорожка уже проложена':'Дорожку можно проложить на газоне',valid:surface==='grass'};
   if(selected==='water')return {text:surface==='bed'?'Сначала уберите грядку':surface==='water'?'Здесь уже вода':'Сделать воду',valid:!['bed','water'].includes(surface)};
   if(window.SadovodCrops?.getCell?.(column,row)?.cropId)return {text:'Сначала соберите и уберите растение',valid:false};
   return {text:({grass:'Здесь уже газон',path:'Убрать дорожку → газон',water:'Засыпать воду → газон',bed:'Разровнять грядку → газон'})[surface],valid:surface!=='grass'};
  }
  return null;
 }

 render();
})();
