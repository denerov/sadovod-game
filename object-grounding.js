import {isPier,updatePierWater,removePierWater} from './pier-water.js?v=276';
import {CATALOG,groundPivot,isBridge} from './decor-model.js?v=276';
import {TREES} from './orchard-model.js?v=182';
import {isFence,edgeEnds} from './fence-model.js?v=207';
import {cellIndex} from './land-model.js?v=182';
const NS='http://www.w3.org/2000/svg',records=new WeakMap(),active=new Set();
const make=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);return n};
const project=(c,r)=>[384+(c-r)*32,(c+r)*16],f=n=>Number(n.toFixed(3));
const random=(x,y)=>{let s=Math.imul(Math.round(x*79),374761393)^Math.imul(Math.round(y*97),668265263);s=Math.imul(s^(s>>>13),1274126177);return ((s^(s>>>16))>>>0)/4294967296};
export const WORLD_LIGHT={x:.42,y:.22};
export function shadowAssetKey(frame,plant=false,bridge=false){return JSON.stringify([frame.src,frame.width,frame.height,frame.anchorX,frame.anchorY,frame.projection||null,frame.groundEnds||null,frame.groundPolygon||null,plant,bridge])}
const plantFeetReady=typeof window==='undefined'?Promise.resolve({}):
 fetch('https://sadovod-webgl-engine-test.ddenerov.chatgpt.site/assets/plant-feet-v269.json').then(r=>r.ok?r.json():{}).catch(()=>({}));
export const isPlant=o=>!isBridge(o)&&(!!TREES[o.type]||CATALOG[o.type]?.category==='trees'||/дерев|куст|смородин|крыжовник|самшит|гортензи|можжевельник/i.test(CATALOG[o.type]?.name||''));
export function plantRootGeometry(x,y,radius,cells,profile=[]){
 const blades=['',''];let shade='';
 if(surfaceAt(x,y,cells)!=='grass')return {blades,soil:'',shade};
 const rx=Math.max(.6,Math.min(12,radius));
 // The source already contains roots; use only their lower silhouette.
 const support=profile.length?profile:Array.from({length:25},(_,i)=>[x+(i/24*2-1)*rx,y]);
 shade=support.map(([px,py],i)=>(i?'L':'M')+f(px)+' '+f(py-.16)).join('')+support.slice().reverse().map(([px,py])=>'L'+f(px+.12)+' '+f(py+.25)).join('')+'Z';
 // The front blades actually occlude the lower sprite, in scattered clusters.
 for(let i=0;i<support.length*2;i++){
  const n=random(x+i*4.7,y-i*2.3);if(n<.27)continue;
  const point=support[Math.floor(i/2)],px=point[0]+(n-.5)*.3,py=point[1]+.08+n*.16,h=.35+n*.65,lean=(random(px,py)-.5)*.4,w=.055+n*.045;
  if(surfaceAt(px,py,cells)!=='grass')continue;
  blades[n>.62?1:0]+=`M${f(px-w)} ${f(py)}Q${f(px)} ${f(py-h*.6)} ${f(px+lean)} ${f(py-h)}Q${f(px+w)} ${f(py-h*.4)} ${f(px+w)} ${f(py)}Z`;
 }
 return {blades,soil:'',shade};
}
// One world light direction, independent of camera position. Preserve the
// complete ground line of diagonal fences, not only the middle pivot.
export function shadowProjection(pivotY,slope=0,pivotX=0){const t=pivotY-slope*pivotX,{x:lx,y:ly}=WORLD_LIGHT;return [1+lx*slope,(1+ly)*slope,-lx,-ly,lx*t,(1+ly)*t]}
export function frameShadowProjection(o,box,frame){
 if(!isFence(o)||!frame?.groundEnds)return shadowProjection(box.pivotY);
 const points=frame.groundEnds.map(([x,y])=>{if(frame.projection){const [a,b,c,d,e,f]=frame.projection;return [box.x+(a*x+c*y+e)*box.scale,box.y+(b*x+d*y+f)*box.scale]}return [box.x+x*box.scale,box.y+y*box.scale]});
 const [a,b]=points,slope=(b[1]-a[1])/(b[0]-a[0]);return Number.isFinite(slope)?shadowProjection((a[1]+b[1])/2,slope,(a[0]+b[0])/2):shadowProjection(box.pivotY);
}
export function surfaceAt(x,y,cells){return cells[cellIndex(Math.floor((x-384)/64+y/32),Math.floor(y/32-(x-384)/64))]}
export function groundingTips(o,cells,baseRadius){
 const p=groundPivot(o),[px,py]=project(p.column,p.row),plant=!!TREES[o.type]||/дерев|куст|смородин|крыжовник|самшит|гортензи|можжевельник/i.test(CATALOG[o.type]?.name||'');
 const roots=isFence(o)?edgeEnds(o).map(([c,r])=>project(c,r)):[[px,py]],paths=['',''],radius=isFence(o)?.95:plant?(baseRadius||4):2.1;
 for(const [rx,ry]of roots)for(let i=0;i<36;i++){
  const a=i/35*Math.PI,x=rx+Math.cos(a)*radius,y=ry+Math.sin(a)*radius*.27+.1,n=random(x,y);if(n<.28||surfaceAt(x,y,cells)!=='grass')continue;
  const h=.55+n*.95,w=.09+n*.08,lean=(n-.5)*.6;paths[n>.6?1:0]+=`M${f(x-w)} ${f(y)}Q${f(x-w*.4)} ${f(y-h*.45)} ${f(x+lean)} ${f(y-h)}Q${f(x+w*.5)} ${f(y-h*.4)} ${f(x+w)} ${f(y)}Z`;
 }return paths;
}
// Project from each column's actual support plane. A wide building or bridge
// cannot use a single horizontal billboard baseline.
export function supportRange(points,x,fallback){
 if(!points?.length)return [fallback,fallback];const ys=[];
 for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if(Math.abs(b[0]-a[0])<.001){if(Math.abs(x-a[0])<.01)ys.push(a[1],b[1]);continue}const t=(x-a[0])/(b[0]-a[0]);if(t>=0&&t<=1)ys.push(a[1]+(b[1]-a[1])*t)}
 if(!ys.length){const nearest=points.reduce((a,b)=>Math.abs(a[0]-x)<Math.abs(b[0]-x)?a:b);return [nearest[1],nearest[1]]}return [Math.min(...ys),Math.max(...ys)];
}
export function projectedShadowPoint(x,y,points,pivotY,bridge=false,deckHeight=0){const [top,bottom]=supportRange(points,x,pivotY),base=bridge?top:bottom;if(!bridge&&y>=top&&y<=bottom)return [x,y];
 // A bridge deck is its own support plane. Projecting the deck and fascia onto
 // the water produced a second, displaced bridge that looked as if it had
 // fallen over. Only rails/posts above the deck cast a land-style shadow.
 if(bridge&&y>=top)return null;
 const h=Math.max(0,base-y)+deckHeight;return [x+WORLD_LIGHT.x*h,Math.max(y,base)+WORLD_LIGHT.y*h]}
let terrainCache,terrainSignature='',terrainVersion=0;
function terrainData(cells){if(!terrainCache){const signature=cells.join('|');if(signature!==terrainSignature){terrainSignature=signature;terrainVersion++}terrainCache={cells,version:terrainVersion};requestAnimationFrame(()=>{terrainCache=null})}return terrainCache}
function contact(r,cells){const terrain=terrainData(cells),o=r.object,signature=[o.type,o.column,o.row,o.rotation,o.position,o.offsetX,o.offsetY,r.pivotX,r.pivotY,r.baseRadius,r.frame?.src,r.footX,r.footY,terrain.version].join(':');if(r.signature===signature)return;r.signature=signature;
 if(isPlant(o)){
  const g=plantRootGeometry(r.footX??r.pivotX,r.footY??r.pivotY,r.baseRadius||3,cells,r.contactProfile||[]);
  const profile=r.contactProfile||[],grassFill=r.group.parentElement?.querySelector('[data-surface="grass"]')?.getAttribute('fill'),cover=profile.length&&grassFill?profile.map(([x,y],i)=>(i?'L':'M')+f(x)+' '+f(y-.65-random(x,y)*.85)).join('')+profile.slice().reverse().map(([x,y])=>'L'+f(x)+' '+f(y+2)).join('')+'Z':'';
  r.fringe.replaceChildren(...(cover?[make('path',{d:cover,fill:grassFill,mask:r.group.parentElement?.querySelector('[data-surface="grass"]')?.getAttribute('mask')||'', 'data-root-turf-cover':'true'})]:[]),...g.blades.map((d,i)=>make('path',{d,fill:i?'#47952a':'#287524'})));
 }else{r.fringe.replaceChildren(...groundingTips(o,cells,r.baseRadius).map((d,i)=>make('path',{d,fill:i?'#398d22':'#287d1d'})))}
}
function refreshPlantFeet(record){
 const {group,source}=record;
 if(!group.isConnected||!isPlant(record.object))return;
 const frame=group.hitFrame||record.frame;
 const x=Number(source.getAttribute('x')),y=Number(source.getAttribute('y'));
 const width=Number(source.getAttribute('width')),scale=width/frame.width;
 const key=[shadowAssetKey(frame,true),x,y,width].join('|');
 if(record.footKey===key)return;
 record.footKey=key;
 record.frame=frame;
 plantFeetReady.then(feet=>{
  if(record.footKey!==key||records.get(group)!==record||!group.isConnected)return;
  const profile=feet[shadowAssetKey(frame,true)];
  record.baseRadius=profile?Math.max(.45,Math.min(12,profile.footRadius*width)):undefined;
  record.footX=profile?x+profile.footX*scale:undefined;
  record.footY=profile?y+profile.footY*scale:undefined;
  record.contactProfile=profile?.contactProfile.map(([px,py])=>[x+px*scale,y+py*scale])||[];
  record.signature=null;
  contact(record,record.cells);
 });
}
export function updateGrounding(plot,group,o,image,box,cells,frame){
 if(isPier(o)){updatePierWater(plot,group,o,image,box,frame);return}
 let record=records.get(group);
 if(!record){
  const fringe=make('g',{'data-object-grass-contact':'true','pointer-events':'none'});
  group.append(fringe);
  record={fringe,source:image,group};
  records.set(group,record);
  active.add(record);
 }
 Object.assign(record,{object:{...o},frame,pivotX:box.pivotX,pivotY:box.pivotY,cells:terrainData(cells).cells});
 contact(record,record.cells);
 refreshPlantFeet(record);
}
export function removeGrounding(group){
 removePierWater(group);
 const record=records.get(group);
 if(!record)return;
 record.fringe.remove();
 records.delete(group);
 active.delete(record);
}
if(typeof window!=='undefined'){
 window.addEventListener('sadovod:plant-frame',e=>{
  const record=records.get(e.detail?.group);
  if(record)refreshPlantFeet(record);
 });
 window.addEventListener('sadovod:ground-changed',()=>{
  const cells=window.SadovodGround?.getCells();
  if(!cells)return;
  terrainCache=null;
  for(const record of active){record.cells=cells;contact(record,cells)}
 });
}
