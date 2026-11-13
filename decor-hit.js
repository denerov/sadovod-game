import {timberHit} from './gate-timber.js?v=182';
import {gatePostHit} from './gate-leaf.js?v=182';
import {CHICKENS} from './animal-model.js?v=182';
import {isFence,isGate} from './fence-model.js?v=207';
import {spriteBox,unprojectSprite} from './decor-model.js?v=276';
export function pointInPolygon(p,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const [x,y]=points[i],[a,b]=points[j];if((y>p.y)!==(b>p.y)&&p.x<(a-x)*(p.y-y)/(b-y)+x)inside=!inside;}return inside;}
export function decorHits(objects,assets,p,alphaHit=()=>true,visibleFrame=()=>null){
 const hits=[];
 for(const o of objects){const frames=assets[o.type],frame=visibleFrame(o)||frames?.[o.rotation];if(!frame||!frames)continue;const b=spriteBox(o,frames),local=unprojectSprite(frame,{x:(p.x-b.x)/b.scale,y:(p.y-b.y)/b.scale});
  const hit=isGate(o)?(gatePostHit(o.rotation,local)&&alphaHit(frame,local))||timberHit(o.rotation,local,o.open?1:0):pointInPolygon(local,frame.hitPolygon)&&(frame.curbRepeat||alphaHit(frame,local));
  if(hit)hits.push({o,depth:b.pivotY});
 }
 return hits.sort((a,b)=>Number(!!CHICKENS[b.o.type])-Number(!!CHICKENS[a.o.type])||b.depth-a.depth).map(h=>h.o.id);
}
export function resolveDecorHit(objects,assets,p,preferredId,alphaHit=()=>true){return decorHits(objects,assets,p,alphaHit)[0];}
