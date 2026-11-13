import {PARK_BOUNDARIES} from './park-content-v181.js?v=189';
import {PREMIUM_FENCE} from './premium-v207.js?v=207';
import {MAX_GRID_SIZE,MAX_CELLS} from './land-model.js?v=182';
// A section belongs to an edge, never the interior of a cell.
export const FENCES={
 'lugansk-fence':{name:'Луганский забор',cost:500,coal:2,size:1,canvasHeight:64,placement:'boundary',allowedSurfaces:['grass','path','soil','bed'],description:'Простой деревянный забор для фермы и первого загона. Секции соединяются по краям клеток.'},
 'lugansk-gate':{name:'Луганские ворота',cost:250,coal:1,size:1,canvasHeight:64,placement:'boundary',allowedSurfaces:['grass','path','soil','bed'],description:'Деревянные ворота к луганскому забору. Устанавливаются между секциями на любой стороне клетки.'}
};
Object.assign(FENCES,PARK_BOUNDARIES);
FENCES.undy_fence=PREMIUM_FENCE;
export const isFence=o=>!!FENCES[o?.type];
export function edgeEnds(o){const c=o.column,r=o.row;return [[[c,r],[c+1,r]],[[c+1,r],[c+1,r+1]],[[c,r+1],[c+1,r+1]],[[c,r],[c,r+1]]][o.rotation];}
export function edgeKey(o){return edgeEnds(o).map(p=>p.join(',')).join(':');}
export function edgePivot(o){const [a,b]=edgeEnds(o);return {column:(a[0]+b[0])/2,row:(a[1]+b[1])/2};}
export function placeFenceAt(o,column,row){const c=Math.max(0,Math.min(MAX_GRID_SIZE-1,Math.floor(column))),r=Math.max(0,Math.min(MAX_GRID_SIZE-1,Math.floor(row))),x=Math.max(0,Math.min(1,column-c)),y=Math.max(0,Math.min(1,row-r));const distances=[y,1-x,1-y,x];const rotation=distances.indexOf(Math.min(...distances));return {...o,column:c,row:r,rotation};}
export function edgeCrosses(o,b){const [a,z]=edgeEnds(o),e=1e-8;if(a[0]===z[0])return a[0]>b.c+e&&a[0]<b.c+b.w-e&&a[1]<b.r+b.h-e&&z[1]>b.r+e;return a[1]>b.r+e&&a[1]<b.r+b.h-e&&a[0]<b.c+b.w-e&&z[0]>b.c+e;}

export const isGate=o=>o?.type==='lugansk-gate';
export function toggleGate(o){return isGate(o)?{...o,open:!o.open}:o;}
