import {spriteBox} from './decor-model.js?v=268';
import {cowSlotAnchor,cowResidentRotation,COW_RESIDENT_SLOTS} from './cow-resident-layout.js?v=201';

// A housed cow keeps its normal farm size; the enclosure must not miniaturize it.
// Legacy pens retain their existing sizing until their individual redesign.
export function residentPlacements(pen,frame,box,members,getFrames){
 const cow=pen.type==='pen_cow',rotation=cow?cowResidentRotation(pen.rotation):(frame.residentRotation??pen.rotation);
 const anchors=cow?COW_RESIDENT_SLOTS.map((_,slot)=>cowSlotAnchor(slot,pen.rotation,frame)):frame.residentAnchors;
 return members.slice(0,anchors?.length||0).flatMap((animal,i)=>{
  const frames=getFrames(animal.type),a=frames?.[rotation];if(!a)return [];
  const slot=cow||frame.stableResidents?(animal.housingSlot??i):i;if(!anchors[slot])return [];
  const [x,y]=anchors[slot];
  const scale=frame.naturalResidentScale?spriteBox({...animal,rotation},frames).scale*frame.naturalResidentScale:(frame.residentHeight||frame.height*(animal.type==='dairy-cow'?.09:['pig','goat','sheep'].includes(animal.type)?.10:.075))/a.height*box.scale;
  return [{animal,frame:a,rotation,slot,x:box.x+x*box.scale-a.anchorX*scale,y:box.y+y*box.scale-a.anchorY*scale,width:a.width*scale,height:a.height*scale,footY:box.y+y*box.scale}];
 }).sort((a,b)=>a.footY-b.footY);
}
