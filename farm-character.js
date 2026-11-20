import {MAX_GRID_SIZE,MAX_CELLS} from './land-model.js?v=182';
import {cellIndex} from './land-model.js?v=182';
import {standingCell,walkableCell,wateringStance} from './farmer-placement.js?v=182';
import {StationaryActor,STATIONARY_ACTIONS} from './stationary-actor.js?v=182';
const plot=document.querySelector('.plot'),NS='http://www.w3.org/2000/svg',actor=new StationaryActor();
const viewport=document.createElementNS(NS,'svg'),image=document.createElementNS(NS,'image');
viewport.id='farmer-pose';viewport.setAttribute('pointer-events','none');viewport.append(image);plot.append(viewport);
const idlePoses={"man-linen":{"left":0,"top":0,"width":450,"height":724,"anchorX":230.5,"anchorY":720,"scale":0.7071823204419889},"woman-overalls":{"left":0,"top":0,"width":450,"height":724,"anchorX":251.0,"anchorY":720,"scale":0.7071823204419889},"man-coat":{"left":0,"top":0,"width":450,"height":724,"anchorX":232.5,"anchorY":720,"scale":0.7071823204419889},"woman-cardigan":{"left":0,"top":0,"width":450,"height":724,"anchorX":254.0,"anchorY":721,"scale":0.7071823204419889},"man-cardigan":{"left":0,"top":0,"width":450,"height":724,"anchorX":230.0,"anchorY":720,"scale":0.7071823204419889},"woman-coat":{"left":0,"top":0,"width":450,"height":724,"anchorX":260.5,"anchorY":721,"scale":0.7071823204419889},"man-overalls":{"left":0,"top":0,"width":450,"height":724,"anchorX":232.5,"anchorY":721,"scale":0.7071823204419889},"woman-linen":{"left":0,"top":0,"width":450,"height":724,"anchorX":220.0,"anchorY":721,"scale":0.7071823204419889}};
function profile(){try{const p=JSON.parse(localStorage.getItem('sadovod.character.v1'));return p&&['man','woman'].includes(p.gender)&&['linen','overalls','coat','cardigan'].includes(p.outfit)?p:{gender:'woman',outfit:'linen'}}catch{return{gender:'woman',outfit:'linen'}}}

let standing=null,lastTarget=null,busy=false,request=0,timer=0,idle=Promise.resolve(),release=()=>{},cancel=null;
const images=new Map();
function loadIdle(){const p=profile(),key=`${p.gender}-${p.outfit}`,src=`./assets/characters/${key}.webp`;if(!images.has(src))images.set(src,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve({src,pose:idlePoses[key]});img.onerror=()=>{images.delete(src);reject(Error('Не удалось загрузить персонажа'))};img.src=src}));return images.get(src)}
const farmCells=()=>{const cells=window.SadovodGround?.getCells()||Array(144).fill('grass');for(const i of window.SadovodDecor?.blockedCells()||[])cells[i]='object';return cells};
function paint({src,pose:f},cell){const scale=.0672*f.scale;image.setAttribute('href',src);image.setAttribute('width',f.width);image.setAttribute('height',f.height);viewport.setAttribute('viewBox',`0 0 ${f.width} ${f.height}`);viewport.setAttribute('x',cell.x-f.anchorX*scale);viewport.setAttribute('y',cell.y-f.anchorY*scale);viewport.setAttribute('width',f.width*scale);viewport.setAttribute('height',f.height*scale);viewport.style.display='';actor.position={x:cell.x,y:cell.y};actor.visible=true;document.documentElement.dataset.characterReady='true';window.dispatchEvent(new Event('sadovod:character-ready'));}
function saveStanding(){try{window.SadovodSave.setItem('sadovod.farmer.cell.v1',JSON.stringify(standing))}catch{}}
async function showIdle(cell,version=request){if(!cell)return;const art=await loadIdle();if(version!==request||busy)return;standing=cell;paint(art,cell);saveStanding()}
function ensureStanding(){if(busy)return;const cells=farmCells();if(standing&&(walkableCell(cells,standing.column,standing.row)||(standing.onBedEdge&&cells[cellIndex(standing.column,standing.row)]==='bed')))return;showIdle(standingCell(cells,lastTarget||standing||{column:5,row:5},!!lastTarget)).catch(()=>{})}
async function play(action,{column,row,width=1,height=1,axis,instant=false,onContact,onComplete,onCancel}={}){
 if(!Number.isInteger(column)||!Number.isInteger(row)||column<0||row<0||column>=MAX_GRID_SIZE||row>=MAX_GRID_SIZE)throw Error('Invalid farm cell');if(busy)throw Error('Персонаж занят');
 const target={column,row,width,height,axis},cells=farmCells(),cell=['water','sow','harvest'].includes(action)?wateringStance(cells,target,standing):standingCell(cells,target,true,standing);if(!cell)throw Error('Освободите газон или дорожку рядом с объектом');
 busy=true;idle=new Promise(resolve=>release=resolve);cancel=onCancel;const version=++request;
 try{const art=await loadIdle();if(version!==request)return;standing=cell;lastTarget=target;paint(art,cell);
 actor.play(action,{x:cell.x,y:cell.y,onContact:event=>{onContact?.(event);window.dispatchEvent(new CustomEvent('sadovod:character-contact',{detail:{...event,column,row}}))},onComplete:event=>{busy=false;cancel=null;saveStanding();release();onComplete?.(event);window.dispatchEvent(new CustomEvent('sadovod:character-complete',{detail:{...event,column,row}}));ensureStanding()}});
 window.dispatchEvent(new CustomEvent('sadovod:character-start',{detail:{action,column,row}}));
 // Test paving mode keeps positioning and transaction callbacks, omits only the wait.
 if(instant&&action==='rake'){actor.advance(actor.clip.duration);return}
 let previous=performance.now();
 const tick=()=>{if(version!==request||!busy)return;const now=performance.now();if(!document.hidden)actor.advance(Math.min(.15,(now-previous)/1000));previous=now;if(busy)timer=setTimeout(tick,100)};timer=setTimeout(tick,100);
 }catch(error){busy=false;cancel=null;release();ensureStanding();throw error}
}
window.SadovodCharacter=Object.freeze({preloadAction:()=>loadIdle().catch(()=>{}),playAction:play,hide(){request++;clearTimeout(timer);actor.hide();viewport.style.display='none';busy=false;const cb=cancel;cancel=null;release();cb?.()},whenIdle:()=>idle,isBusy:()=>busy,getState:()=>actor.frame(),actions:()=>STATIONARY_ACTIONS.filter(c=>['sow','water','harvest','pick','place','sit','stand','bush','tree','dig'].includes(c.id)).map(c=>({id:c.id,name:c.name}))});
window.addEventListener('sadovod:ground-changed',ensureStanding);window.addEventListener('sadovod:decor-changed',ensureStanding);
let saved;try{saved=JSON.parse(localStorage.getItem('sadovod.farmer.cell.v1'))}catch{}
const cells=farmCells(),initial=(saved?.onBedEdge?wateringStance(cells,saved,saved):null)||(saved&&walkableCell(cells,saved.column,saved.row)?{...saved,x:384+(saved.column-saved.row)*32,y:(saved.column+saved.row+1)*16}:standingCell(cells,{column:5,row:5},false));
showIdle(initial).catch(()=>window.dispatchEvent(new CustomEvent('sadovod:action-error',{detail:{message:'Не удалось загрузить персонажа. Обновите страницу.'}})));
