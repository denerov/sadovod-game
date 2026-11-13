const NS='http://www.w3.org/2000/svg',records=new WeakMap(),active=new Set();let serial=0;
const el=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n};
const path=points=>'M'+points.map(p=>p.map(n=>Number(n.toFixed(3))).join(' ')).join('L')+'Z';
export const isPier=o=>o?.type==='shore_3';

function pileCut(p, surfaceY){
 const {x,rx,corner,bottom}=p,edge=rx+2;
 return path([[x-edge,surfaceY-corner],[x,surfaceY+corner],[x+edge,surfaceY-corner],[x+edge,bottom],[x-edge,bottom]]);
}

export function pierWaterGeometry(box,frame){
 return (frame.pierPiles||[]).map(p=>{
  const x=box.x+p.x*box.scale,groundY=box.y+p.y*box.scale-.65;
  // The dry cut starts on the actual post, below the fascia. The water
  // surface is higher on the post so the submerged portion remains visible.
  const rx=p.half*box.scale,corner=rx*.4,bottom=box.y+p.bottom*box.scale+2;
  return {x,y:groundY-2.25,groundY,rx,corner,bottom};
 });
}
function inFill(node,x,y){return node?.isPointInFill(new DOMPoint(x,y))}
function paint(r){
 const water=r.plot.querySelector('[data-surface="water"]'),grass=r.plot.querySelector('[data-surface="grass"]');
 const waterD=water?.getAttribute('d')||'',signature=[waterD,grass?.getAttribute('d'),r.frame.src,r.box.x,r.box.y,r.box.scale].join('|');
 if(signature===r.signature)return;r.signature=signature;
 r.clipPath.setAttribute('d',waterD);
 for(const k of ['x','y','width','height']){r.white.setAttribute(k,r.box[k]);r.mask.setAttribute(k,r.box[k])}
 const masks=[],lines=[];let blades='';
 for(const [i,p] of pierWaterGeometry(r.box,r.frame).entries()){
  const {x,y,groundY,rx,corner,bottom}=p,wet=inFill(water,x,groundY);
  if(wet){
   const id=r.mask.id+'-depth-'+i;
   const depth=el('linearGradient',{id,gradientUnits:'userSpaceOnUse',x1:x,x2:x,y1:y-corner,y2:bottom});
   depth.append(el('stop',{offset:0,'stop-color':'#929292'}),el('stop',{offset:1,'stop-color':'#161616'}));
   masks.push(depth,el('path',{d:pileCut(p,y),fill:`url(#${id})`}));
   lines.push(el('path',{d:`M${x-rx-.45} ${y-.1}Q${x} ${y+corner*2+1} ${x+rx+.45} ${y-.1}`,fill:'none',stroke:'#a6d9d5','stroke-width':.28,opacity:.52}));
  }else{
   masks.push(el('path',{d:pileCut(p,groundY),fill:'black'}));
   for(let j=0;j<14;j++){
    const u=j/13*2-1,px=x+u*rx,py=groundY+corner*(1-2*Math.abs(u))+.16,n=Math.abs((Math.sin(px*71+py*37)*43758.5453)%1);
    if(n<.24||inFill(water,px,py)||!inFill(grass,px,py))continue;
    const h=.35+n*.65;
    blades+=`M${px-.10} ${py}Q${px-.16} ${py-h*.6} ${px+(n-.5)*.32} ${py-h}L${px+.13} ${py}Z`;
   }
  }
 }
 r.sections.replaceChildren(...masks);r.ripples.replaceChildren(...lines);
 r.grassContact.setAttribute('d',blades);r.grassContact.setAttribute('mask',grass?.getAttribute('mask')||'');
 r.image.setAttribute('mask',`url(#${r.mask.id})`);
}
export function updatePierWater(plot,group,o,image,box,frame){
 if(!isPier(o)){removePierWater(group);return false}
 let r=records.get(group);
 if(!r){
  const id='pier-water-'+(++serial),defs=el('defs'),clip=el('clipPath',{id:id+'-clip',clipPathUnits:'userSpaceOnUse'}),clipPath=el('path',{'clip-rule':'evenodd'});clip.append(clipPath);
  const mask=el('mask',{id:id+'-mask',maskUnits:'userSpaceOnUse',maskContentUnits:'userSpaceOnUse','mask-type':'luminance'}),white=el('rect',{fill:'white'}),sections=el('g');mask.append(white,sections);defs.append(clip,mask);
  const ripples=el('g',{'data-pier-waterline':'','pointer-events':'none','clip-path':`url(#${clip.id})`}),grassContact=el('path',{'data-pier-grass-contact':'',fill:'#2b8025','pointer-events':'none'});group.append(defs,ripples,grassContact);
  r={plot,group,image,defs,clipPath,mask,white,sections,ripples,grassContact};records.set(group,r);active.add(r);
 }
 r.box=box;r.frame=frame;paint(r);return true;
}
export function removePierWater(group){const r=records.get(group);if(!r)return;r.image.removeAttribute('mask');r.defs.remove();r.ripples.remove();r.grassContact.remove();records.delete(group);active.delete(r)}
let groundFrame=0;if(typeof window!=='undefined')window.addEventListener('sadovod:ground-changed',()=>{if(!groundFrame)groundFrame=requestAnimationFrame(()=>{groundFrame=0;for(const r of active)if(r.group.isConnected)paint(r)})});
