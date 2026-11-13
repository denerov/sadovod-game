import {CATALOG,groundPivot,occupiedBounds,isBridge} from './decor-model.js?v=268';
import {TREES} from './orchard-model.js?v=182';

const project=(c,r)=>[384+(c-r)*32,(c+r)*16];
const f=n=>Number(n.toFixed(2));
const polygon=points=>'M'+points.map(p=>p.map(f).join(' ')).join('L')+'Z';
const diamond=(b,inset=.08)=>polygon([project(b.c+inset,b.r+inset),project(b.c+b.w-inset,b.r+inset),project(b.c+b.w-inset,b.r+b.h-inset),project(b.c+inset,b.r+b.h-inset)]);
const ellipse=(x,y,rx,ry)=>`M${f(x-rx)} ${f(y)}a${f(rx)} ${f(ry)} 0 1 0 ${f(rx*2)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-rx*2)} 0`;

function profile(o){
 if(isBridge(o))return 'pier';
 if(TREES[o.type]||CATALOG[o.type]?.category==='trees')return 'tree';
 if(o.type==='house'||['factories','structures'].includes(CATALOG[o.type]?.category))return 'building';
 return 'none';
}

// These masks use the existing placement anchors. They are visual-only, so old
// saves and all collision/economy rules stay byte-for-byte compatible.
export function terrainContacts(objects=[]){
 let soil='',foundation='',entries='';
 for(const o of objects){const kind=profile(o);if(kind==='none'||kind==='pier')continue;
  const p=groundPivot(o),[x,y]=project(p.column,p.row),b=occupiedBounds(o);
  if(kind==='tree')continue; // Grounding uses the current sprite's roots, not a second cell-centred patch.
  const inset=Math.min(.14,Math.max(.055,Math.min(b.w,b.h)*.045));foundation+=diamond(b,inset);
  const dirs=[[0,1],[-1,0],[0,-1],[1,0]],d=dirs[o.rotation&3],[ex,ey]=project(p.column+d[0]*b.w*.46,p.row+d[1]*b.h*.46);entries+=ellipse(ex,ey+.12,Math.max(2.4,Math.min(b.w,b.h)*3.2),1.35);
 }
 return {soil,foundation,entries,signature:objects.map(o=>[o.id,o.type,o.column,o.row,o.rotation,o.centerShiftX||0,o.centerShiftY||0].join(':')).join('|')};
}
