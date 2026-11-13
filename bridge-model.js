export const isModularBridge=o=>/^bridges_[1-4]$/.test(o?.type||'');
// Keep the old saved anchor: the centre of the old 3x3 reservation.
// A new compact module occupies ONLY its centre cell. No saved coordinates move.
export const bridgePivot=o=>({column:o.column+1.5,row:o.row+1.5});
export const bridgeBounds=o=>({c:o.column+1,r:o.row+1,w:1,h:1});
// Shared posts belong to the forward (greater depth) module. Preview never
// removes a post from an already placed neighbour; its own duplicates are hidden.
export function bridgeJoins(objects,previewId=null){
 const active=objects.filter(o=>isModularBridge(o)&&!o.stored&&!o.housedIn),index=new Map(),out=new Map();
 const key=(o,c=o.column,r=o.row)=>[o.type,o.rotation%2,c,r].join(':');
 for(const o of active)index.set(key(o),o);
 for(const o of active){const axis=o.rotation%2,prev=index.get(key(o,o.column-(axis?0:1),o.row-(axis?1:0))),next=index.get(key(o,o.column+(axis?0:1),o.row+(axis?1:0)));
  const mask=o.id===previewId?(prev?1:0)|(next?2:0):(next&&next.id!==previewId?2:0);
  out.set(o.id,mask);
 }return out;
}
