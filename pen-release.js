import {canPlace,groundPivot,hasFreePlacement,placeDecorAt} from './decor-model.js?v=268';
import {fieldObjects} from './pen-model.js?v=207';
import {MAX_GRID_SIZE} from './land-model.js?v=182';
// Explicit release places a resident on free ground; never routes animals to storage.
export function releaseResident(objects,penId,animalId,cells){
 const parent=objects.find(o=>o.id===penId&&!o.stored),animal=objects.find(o=>o.id===animalId&&o.housedIn===penId);
 if(!parent||!animal)return null;
 const base={...animal};for(const key of ['housedIn','housingPausedAt','housingSlot','stored','storedAt'])delete base[key];
 const active=fieldObjects(objects),pivot=groundPivot(parent),candidates=[];
 for(let row=0;row<MAX_GRID_SIZE;row++)for(let column=0;column<MAX_GRID_SIZE;column++){
  const o=hasFreePlacement(base)?placeDecorAt(base,column+.5,row+.5):{...base,column,row};
  if(canPlace(o,active,cells))candidates.push(o);
 }
 candidates.sort((a,b)=>(a.column-pivot.column)**2+(a.row-pivot.row)**2-((b.column-pivot.column)**2+(b.row-pivot.row)**2));
 if(!candidates.length)return null;
 return objects.map(o=>o.id===animalId?candidates[0]:o);
}
