// Housing groups already owned animals; it never creates animals or changes recipes.
export const PEN_ANIMALS=Object.freeze({pen_cow:['dairy-cow'],pen_pig:['pig'],pen_goat:['goat'],pen_rabbit:['rabbit'],pen_chicken:['white-hen','red-hen','black_chicken'],pen_sheep:['sheep'],pen_pigeon:['pigeon'],pen_undyandyolik:['undyandyolik'],pen_duck:['duck'],pen_goose:['goose'],pen_swan:['swan']});
export const isPen=o=>!!PEN_ANIMALS[o?.type];
export const compatible=(pen,animal)=>!!PEN_ANIMALS[pen?.type]?.includes(animal?.type);
// Explicitly approved capacities; old excess residents remain owned.
export const penCapacity=pen=>({pen_cow:4,pen_pigeon:10,pen_undyandyolik:3}[pen?.type]??Infinity);
export const penResidents=(pen,objects)=>objects.filter(o=>o.housedIn===pen?.id&&compatible(pen,o));
export const penHasRoom=(pen,objects)=>penResidents(pen,objects).length<penCapacity(pen);
export function housingParent(o,objects){return o.housedIn?objects.find(p=>p.id===o.housedIn&&compatible(p,o)):null;}
export function productionObjects(objects){return objects.filter(o=>!o.stored&&!housingParent(o,objects)?.stored);}
export function fieldObjects(objects){return objects.filter(o=>!o.stored&&!housingParent(o,objects));}
// Persist the stall identity: removing one cow must not reseat her neighbours.
export function withStableCowSlots(objects){
 const changes=new Map();
 for(const pen of objects.filter(o=>Number.isFinite(penCapacity(o)))){
  const capacity=penCapacity(pen),members=penResidents(pen,objects),used=new Set(),pending=[];
  for(const cow of members){const slot=cow.housingSlot;if(Number.isInteger(slot)&&slot>=0&&slot<capacity&&!used.has(slot))used.add(slot);else pending.push(cow);}
  for(const cow of pending){const slot=Array.from({length:capacity},(_,i)=>i).find(i=>!used.has(i));if(slot===undefined)continue;used.add(slot);changes.set(cow.id,{...cow,housingSlot:slot});}
 }
 return changes.size?objects.map(o=>changes.get(o.id)||o):objects;
}
export function assignAnimal(objects,penId,animalId){const pen=objects.find(o=>o.id===penId&&!o.stored),animal=objects.find(o=>o.id===animalId);if(!pen||!animal||!compatible(pen,animal)||housingParent(animal,objects)||!penHasRoom(pen,objects))return null;return withStableCowSlots(objects.map(o=>o.id===animalId?Object.fromEntries(Object.entries({...o,housedIn:penId}).filter(([k])=>!['stored','storedAt','housingPausedAt','housingSlot'].includes(k))):o));}
export function releaseAnimal(objects,penId,animalId,clock){const animal=objects.find(o=>o.id===animalId&&o.housedIn===penId);if(!animal||objects.filter(o=>o.stored).length>=30)return null;return objects.map(o=>o.id===animalId?Object.fromEntries(Object.entries({...o,stored:true,storedAt:clock}).filter(([k])=>!['housedIn','housingPausedAt','housingSlot'].includes(k))):o);}
