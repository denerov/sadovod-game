import {canPlace} from './decor-model.js?v=268';
import {fieldObjects} from './pen-model.js?v=207';

// Old saves must not expand over neighbouring objects, crops, water or unowned land.
// No IDs, animal membership, coordinates, production or currency are changed.
export function markLegacyCowYards(objects){
 return objects.map(o=>o.type==='pen_cow'&&o.cowYardSize===undefined?{...o,cowYardSize:3}:o);
}
export function expandedCowYard(o){return o.type==='pen_cow'?{...o,cowYardSize:4}:o;}
export function upgradeCowYards(objects,cells){
 let result=objects.slice();
 for(const o of result){
  if(o.type!=='pen_cow'||o.cowYardSize===4)continue;
  const candidate=expandedCowYard(o);
  if(o.stored||canPlace(candidate,fieldObjects(result),cells))result=result.map(x=>x.id===o.id?candidate:x);
 }
 return result;
}
