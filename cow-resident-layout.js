// ONE plan in barn-local coordinates, never an independently arranged view.
// u runs along the barn, v runs from its back edge towards the courtyard gate.
export const COW_RESIDENT_SLOTS=Object.freeze([
 Object.freeze([.30,.69]),Object.freeze([.56,.43]),
 Object.freeze([.57,.90]),Object.freeze([.87,.63]),
]);
export function rotateCowSlot([u,v],rotation){
 for(let i=0;i<((rotation%4)+4)%4;i++)[u,v]=[1-v,u];
 return [u,v];
}
// Calibrate only contact coordinates to the existing painted ground plane.
// Neither cow nor building pixels are warped, mirrored or resized here.
export function cowSlotAnchor(slot,rotation,frame){
 const [u,v]=rotateCowSlot(COW_RESIDENT_SLOTS[slot],rotation);
 const [a,b,c,d]=frame.groundPolygon;
 return [0,1].map(k=>(1-u)*(1-v)*a[k]+u*(1-v)*b[k]+u*v*c[k]+(1-u)*v*d[k]);
}
// Barn atlas and cow atlas enumerate quarter turns in opposite directions.
export const cowResidentRotation=rotation=>(4-rotation%4)%4;
