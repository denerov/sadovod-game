import {GARDEN_PRODUCTS} from './garden-products-v186.js?v=276';
import {bridgePivot,bridgeBounds} from './bridge-model.js?v=203';
import {PEN_DESIGNS} from './pen-designs-v183.js?v=207';
import {MAX_GRID_SIZE,MAX_CELLS} from './land-model.js?v=182';
import {restoredTypes} from './chain-model.js?v=210';
import {cellIndex} from './land-model.js?v=182';
import {BIRDS} from './bird-model.js?v=182';
import {WINERY,VINEYARD} from './wine-model.js?v=182';
import {KETCHUP_FACTORY} from './ketchup-model.js?v=209';
import {DAIRY_COW,DAIRY_FACTORY} from './dairy-model.js?v=209';
import {FACTORIES} from './factory-model.js?v=210';
import {FENCES,isFence,edgePivot,edgeEnds,edgeKey,edgeCrosses} from './fence-model.js?v=207';
import {CHICKENS} from './animal-model.js?v=182';
import {TREES} from './orchard-model.js?v=182';
import {MACHINES} from './machinery-model.js?v=210';
import {applyPriceBalance} from './price-balance-v288.js?v=288';
// A placed product owns one fixed square of cells. Rotation never changes its
// ground pivot, reserved cells, scale or location. New products use this contract.
export const CATALOG={...GARDEN_PRODUCTS,...PEN_DESIGNS,...restoredTypes,...BIRDS,winery:WINERY,vineyard:VINEYARD,'ketchup-factory':KETCHUP_FACTORY,'dairy-cow':DAIRY_COW,'dairy-factory':DAIRY_FACTORY,...FACTORIES,...MACHINES,...TREES,...CHICKENS,...FENCES,house:{name:'Луганская усадьба',size:2,canvasHeight:110},bench:{name:'Стахановская лавочка',size:1,canvasHeight:48,placement:'edge-cell'},hay:{name:'Сено',size:1,canvasHeight:56},scarecrow:{name:'Пугало',size:1,canvasHeight:57,placement:'subcell'}};
applyPriceBalance(CATALOG);
export const isSmallAnimal=o=>!!CHICKENS[o.type]||['black_chicken','rabbit','pigeon','pig'].includes(o.type);
// Half-cell translations, NOT smaller collision boxes or resized artwork.
// Old integer anchors retain the exact same pivot. Only explicit moves snap.
for(const [id,d]of Object.entries(CATALOG))if(!d.placement&&(d.category==='decor'||id==='hay')&&d.placementRule!=='bridge')d.placement='center-grid';
export const INITIAL=[{id:'house-1',type:'house',column:3,row:2,rotation:0},{id:'bench-1',type:'bench',column:6,row:5,rotation:0},{id:'hay-1',type:'hay',column:3,row:7,rotation:0},{id:'scarecrow-1',type:'scarecrow',column:8,row:4,rotation:0}];
export const nextRotation=rotation=>(rotation+1)%4;
export const isBridge=o=>CATALOG[o.type]?.placementRule==='bridge';
export function bridgeCells(o){return [{column:o.column+1,row:o.row+1,water:true}];}
export function placeBridgeAt(o,column,row,cells,objects=[],autoRotate=true){
 // Terrain must never override the orientation chosen by the player.
 return {...o,column:Math.floor(column)-1,row:Math.floor(row)-1};
}
export function footprint(o){const size=o.type==='pen_cow'&&o.cowYardSize===3?3:CATALOG[o.type].size;return {w:size,h:size}}
export const DECOR_POSITIONS=Object.freeze({center:[.5,.5],north:[0,0],east:[1,0],south:[1,1],west:[0,1]});
export const EDGE_POSITIONS=Object.freeze({center:[.5,.5],north:[.5,.12],east:[.88,.5],south:[.5,.88],west:[.12,.5]});
export const hasFreePlacement=o=>['center-grid','free-cell','edge-cell','subcell','quarter-cell','half-cell'].includes(CATALOG[o.type]?.placement);
export function placementGrid(o){return CATALOG[o.type]?.placement==='half-cell'?[2,1]:CATALOG[o.type]?.placement==='quarter-cell'?[2,2]:[3,4]}
export function benchSize(o){return o.type==='vineyard'?{w:.912,h:.912}:o.type==='bench'||o.type==='stakhanov_bench'?{w:.84,h:.84}:{w:.72,h:.72}}
const edgeMetrics=new Map();
export function registerPlacementFrames(type,frames){if(CATALOG[type]?.placement!=='edge-cell')return;const scale=fittedScale({type,column:0,row:0,rotation:0},frames);edgeMetrics.set(type,frames.map(f=>{const poly=f.groundPolygon||f.hitPolygon.filter(p=>p[1]>=f.anchorY-f.height*.12),cs=[],rs=[];for(const [x,y]of poly){const dx=(x-f.anchorX)*scale,dy=(y-f.anchorY)*scale;cs.push(dx/64+dy/32);rs.push(dy/32-dx/64)}return {minC:Math.min(...cs),maxC:Math.max(...cs),minR:Math.min(...rs),maxR:Math.max(...rs)};}));}
export function edgeSupport(o){return edgeMetrics.get(o.type)?.[o.rotation]||{minC:-.36,maxC:.36,minR:-.36,maxR:.36};}
export function groundPivot(o){
 if(isBridge(o))return bridgePivot(o);
 if(isFence(o))return edgePivot(o);
 const {w,h}=footprint(o),kind=CATALOG[o.type]?.placement;
 if(!hasFreePlacement(o))return {column:o.column+w/2,row:o.row+h/2};
 if(kind==='center-grid')return {column:o.column+w/2+(o.centerShiftX||0),row:o.row+h/2+(o.centerShiftY||0)};
 let p=o.offsetX!==undefined?[o.offsetX,o.offsetY]:(kind==='edge-cell'?EDGE_POSITIONS:DECOR_POSITIONS)[o.position||'center'];
 if(kind==='edge-cell'&&o.placementVersion===137){const b=edgeSupport(o),gap=.015;p=[.5-(b.minC+b.maxC)/2,.5-(b.minR+b.maxR)/2];if(o.position==='north')p[1]=gap-b.minR;if(o.position==='south')p[1]=1-gap-b.maxR;if(o.position==='west')p[0]=gap-b.minC;if(o.position==='east')p[0]=1-gap-b.maxC;}else if(kind==='edge-cell'&&o.offsetX===undefined){const b=benchSize(o);p=[Math.max(b.w/2,Math.min(1-b.w/2,p[0])),Math.max(b.h/2,Math.min(1-b.h/2,p[1]))];}
 return {column:o.column+p[0],row:o.row+p[1]};
}
// Existing coordinates are preserved on load. Snapping only happens after an
// explicit user move; quarter cells and the twelve decor slots share one grid.
export function placeDecorAt(o,column,row){
 if(CATALOG[o.type]?.placement==='center-grid'){const n=CATALOG[o.type].size,c=Math.round(column*2)/2-n/2,r=Math.round(row*2)/2-n/2,result={...o,column:Math.floor(c),row:Math.floor(r),centerShiftX:c-Math.floor(c),centerShiftY:r-Math.floor(r)};delete result.offsetX;delete result.offsetY;delete result.position;return result;}
 const c=Math.floor(column),r=Math.floor(row),u=column-c,v=row-r;
 if(CATALOG[o.type]?.placement==='edge-cell'){
  const distance=position=>{const p=groundPivot({...o,column:c,row:r,position,offsetX:undefined,offsetY:undefined,placementVersion:137}),dc=p.column-column,dr=p.row-row;return (dc-dr)**2+((dc+dr)/2)**2;};
  const position=Object.keys(EDGE_POSITIONS).sort((a,b)=>distance(a)-distance(b))[0];
  const result={...o,column:c,row:r,position,placementVersion:137};delete result.offsetX;delete result.offsetY;return result;
 }
 const [nx,ny]=placementGrid(o),x=Math.min(nx-1,Math.max(0,Math.floor(u*nx))),y=Math.min(ny-1,Math.max(0,Math.floor(v*ny)));
 const result={...o,column:c,row:r,offsetX:(x+.5)/nx,offsetY:(y+.5)/ny};delete result.position;return result;
}
// Fit the lower supporting part of the sprite into its reserved ground cells.
// One factor for all four directions prevents size changes when rotating.
const scaleCache=new WeakMap();
export function fittedScale(o,frames){
 if(isBridge(o)&&frames[0]?.modularBridge)return .25;
 let cache=scaleCache.get(frames);if(!cache){cache=new Map();scaleCache.set(frames,cache)}
 const cacheKey=o.type+':'+footprint(o).w;
 if(cache.has(cacheKey))return cache.get(cacheKey);
 // Geometrically assembled cow yard: exactly 3x3, no generic 6% inset.
 if(o.type.startsWith('pen_')&&frames.every(f=>f.cellPixels===128))return 32/128;
 if(o.type==='winery'&&frames[o.rotation]?.tileWidth)return 128/frames[o.rotation].tileWidth;
 const base=CATALOG[o.type].canvasHeight/frames[0].height;
 if(TREES[o.type]||isFence(o))return base;
 const b=CATALOG[o.type]?.placement==='edge-cell'?benchSize(o):CATALOG[o.type]?.placement==='center-grid'||isBridge(o)?footprint(o):occupiedBounds(o);
 let factor=frames.every(f=>f.groundPolygon)?Infinity:1;
 for(const f of frames){const ground=f.groundPolygon||f.fitPolygon||f.hitPolygon.filter(p=>p[1]>=f.anchorY-f.height*.12);for(const [x,y]of ground){const dx=(x-f.anchorX)*base,dy=(y-f.anchorY)*base,c=Math.abs(dx/64+dy/32),r=Math.abs(dy/32-dx/64);if(c)factor=Math.min(factor,b.w*.47/c);if(r)factor=Math.min(factor,b.h*.47/r)}}
 const scale=base*(Number.isFinite(factor)?factor:1)*(CATALOG[o.type].renderScale||1);cache.set(cacheKey,scale);return scale;
}
export const PIER_DROP=4.2;
export function spriteBox(o,frames){const d=CATALOG[o.type],a=frames[o.rotation],pivot=groundPivot(o),scale=fittedScale(o,frames),x=384+(pivot.column-pivot.row)*32,y=(pivot.column+pivot.row)*16;return {x:x-a.anchorX*scale,y:y-a.anchorY*scale+(a.pierPiles?PIER_DROP:0),width:a.width*scale,height:a.height*scale,pivotX:x,pivotY:y,scale}}
export function validateFrames(frames,locked=false){if(!Array.isArray(frames)||frames.length!==(locked?1:4))throw Error('Product needs exactly four views');const first=frames[0];frames.forEach((a,i)=>{if(!Array.isArray(a.hitPolygon)||a.hitPolygon.length<3||a.hitPolygon.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite))||a.rotation!==i*90||typeof a.src!=='string'||!a.src||!(a.width>0)||a.width!==first.width||a.height!==first.height||!Number.isFinite(a.anchorX)||!Number.isFinite(a.anchorY)||a.anchorX<0||a.anchorX>a.width||a.anchorY<0||a.anchorY>a.height)throw Error('Invalid four-view sprite contract')});return frames}
export function covers(o,c,r){if(isFence(o))return false;if(isBridge(o))return bridgeCells(o).some(p=>p.column===c&&p.row===r);if(CATALOG[o.type]?.placement==='center-grid'){const b=occupiedBounds(o);return c+1>b.c&&r+1>b.r&&c<b.c+b.w&&r<b.r+b.h;}const {w,h}=footprint(o);return c>=o.column&&c<o.column+w&&r>=o.row&&r<o.row+h}
export function occupiedBounds(o){if(isBridge(o))return bridgeBounds(o);if(isFence(o)){const [a,b]=edgeEnds(o);return {c:a[0],r:a[1],w:b[0]-a[0],h:b[1]-a[1]};}const {w,h}=footprint(o);if(CATALOG[o.type]?.placement==='center-grid')return {c:o.column+(o.centerShiftX||0),r:o.row+(o.centerShiftY||0),w,h};if(!hasFreePlacement(o))return {c:o.column,r:o.row,w,h};if(CATALOG[o.type]?.placement==='edge-cell'){const pivot=groundPivot(o);if(o.placementVersion===137){const b=edgeSupport(o);return {c:pivot.column+b.minC,r:pivot.row+b.minR,w:b.maxC-b.minC,h:b.maxR-b.minR};}const size=benchSize(o);return {c:pivot.column-size.w/2,r:pivot.row-size.h/2,...size};}
 const [nx,ny]=placementGrid(o),pivot=groundPivot(o);return {c:pivot.column-1/nx/2,r:pivot.row-1/ny/2,w:1/nx,h:1/ny};}

export function overlaps(a,b){if(isFence(a)&&isFence(b))return edgeKey(a)===edgeKey(b);if(isFence(a))return edgeCrosses(a,fenceClearance(b));if(isFence(b))return edgeCrosses(b,fenceClearance(a));const x=occupiedBounds(a),y=occupiedBounds(b),e=1e-8;return x.c<y.c+y.w-e&&x.c+x.w>y.c+e&&x.r<y.r+y.h-e&&x.r+x.h>y.r+e}
export function canPlace(o,objects,cells){const {w,h}=footprint(o);if(!validObject(o))return false;const check=isBridge(o)?occupiedBounds(o):{c:o.column,r:o.row,w,h};if(check.c<0||check.r<0||check.c+check.w>MAX_GRID_SIZE||check.r+check.h>MAX_GRID_SIZE)return false;if(CATALOG[o.type]?.placement==='center-grid'){const b=occupiedBounds(o);if(b.c<0||b.r<0||b.c+b.w>MAX_GRID_SIZE||b.r+b.h>MAX_GRID_SIZE)return false;}if(!surfaceFits(o,cells))return false;return !objects.some(x=>!x.stored&&x.id!==o.id&&overlaps(o,x))}
export function validObject(o){return o&&CATALOG[o.type]&&typeof o.id==='string'&&Number.isInteger(o.column)&&Number.isInteger(o.row)&&Number.isInteger(o.rotation)&&o.rotation>=0&&o.rotation<4&&(CATALOG[o.type].placement!=='center-grid'||[o.centerShiftX??0,o.centerShiftY??0].every(v=>v===0||v===.5))&&(!CATALOG[o.type].rotationLocked||o.rotation===0)&&(!hasFreePlacement(o)||(o.offsetX===undefined&&o.offsetY===undefined?(o.position===undefined||Object.hasOwn(DECOR_POSITIONS,o.position)):[o.offsetX,o.offsetY].every(v=>Number.isFinite(v)&&v>=0&&v<=1)))}

function fenceClearance(o){const b=occupiedBounds(o);if(!isSmallAnimal(o))return b;const margin=.08;return {c:b.c-margin,r:b.r-margin,w:b.w+margin*2,h:b.h+margin*2};}

// Camera calibration maps the paving plane to the farm's 2:1 isometric grid.
export function spriteTransform(box,frame){if(!frame.projection)return '';const [a,b,c,d,e,f]=frame.projection;return `matrix(${a} ${b} ${c} ${d} ${e*box.scale+box.x-a*box.x-c*box.y} ${f*box.scale+box.y-b*box.x-d*box.y})`}
export function unprojectSprite(frame,p){if(!frame.projection)return p;const [a,b,c,d,e,f]=frame.projection,det=a*d-b*c,x=p.x-e,y=p.y-f;return {x:(d*x-c*y)/det,y:(a*y-b*x)/det}}

export function surfaceFits(o,cells){
 const d=CATALOG[o.type],n=footprint(o).w,dry=['grass','path'],rule=d.placementRule;
 if(isBridge(o))return bridgeCells(o).every(p=>['grass','path','water'].includes(cells[cellIndex(p.column,p.row)]));
 if(rule==='water-pen'){
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(cells[cellIndex(o.column+x,o.row+y)]!=='water')return false;
  for(let i=0;i<n;i++)for(const [c,r]of [[o.column+i,o.row-1],[o.column+i,o.row+n],[o.column-1,o.row+i],[o.column+n,o.row+i]])if(c>=0&&r>=0&&c<MAX_GRID_SIZE&&r<MAX_GRID_SIZE&&dry.includes(cells[cellIndex(c,r)]))return true;
  return false;
 }
 if(d.placement==='center-grid'){const b=occupiedBounds(o),allowed=d.allowedSurfaces||(rule==='water'?['water']:dry);for(let r=Math.floor(b.r);r<Math.ceil(b.r+b.h);r++)for(let c=Math.floor(b.c);c<Math.ceil(b.c+b.w);c++)if(!allowed.includes(cells[cellIndex(c,r)]))return false;return true;}
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const surface=cells[cellIndex(o.column+x,o.row+y)],[u,v]=[[x,y],[y,n-1-x],[n-1-x,n-1-y],[n-1-y,x]][o.rotation];
  let allowed=d.allowedSurfaces||dry;
  if(rule==='water')allowed=['water'];
  if(rule==='shore')allowed=v===0?dry:['water'];
  if(!allowed.includes(surface))return false;
 }return true;
}
