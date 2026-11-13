import {POST_CLEARANCE} from './park-post-clearance-v188.js?v=188';
import {bridgeJoins} from './bridge-model.js?v=203';
import {applyBridgeVisual} from './bridge-visual.js?v=270';
import {isFence,edgeEnds,edgePivot} from './fence-model.js?v=207';
export const isCurb=o=>o?.type?.startsWith('curb_');
// All styles participate at a vertex. A curb stops before a fence post.
export function boundaryJoins(objects,previewId=null){
 const vertices=new Map(),cuts=new Map();
 for(const o of objects){if(o.stored||!isFence(o))continue;cuts.set(o.id,[false,false]);
  edgeEnds(o).slice().sort((a,b)=>(a[0]-a[1])-(b[0]-b[1])).forEach((p,side)=>{const key=p.join(',');if(!vertices.has(key))vertices.set(key,[]);vertices.get(key).push({o,side});});}
 for(const list of vertices.values()){
  const fences=list.filter(x=>!isCurb(x.o));
  if(fences.length){const inset=Math.max(...fences.map(x=>POST_CLEARANCE[x.o.type]?.[x.o.rotation]?.[x.side]??14));for(const x of list.filter(x=>isCurb(x.o)))cuts.get(x.o.id)[x.side]=inset;}
  const styles=new Map();for(const x of list){if(!styles.has(x.o.type))styles.set(x.o.type,[]);styles.get(x.o.type).push(x);}
  for(const same of styles.values()){if(same.length<2)continue;same.sort((a,b)=>{const p=edgePivot(a.o),q=edgePivot(b.o);return Number(a.o.id===previewId)-Number(b.o.id===previewId)||(q.column+q.row)-(p.column+p.row)||a.o.rotation-b.o.rotation||a.o.id.localeCompare(b.o.id)});for(const x of same.slice(1))if(!cuts.get(x.o.id)[x.side])cuts.get(x.o.id)[x.side]=true;}
 }
 for(const [id,bridgeMask]of bridgeJoins(objects,previewId))cuts.set(id,{bridgeMask});
 return cuts;
}
const NS='http://www.w3.org/2000/svg';
function node(tag,attrs={}){const el=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))el.setAttribute(k,v);return el;}
export function applyBoundaryClip(group,image,o,frame,box,cuts){
 if(frame.modularBridge){image.removeAttribute('clip-path');image.removeAttribute('visibility');applyBridgeVisual(image,frame,cuts.get(o.id)?.bridgeMask||0);return;}
 if(frame.curbRepeat){renderCurb(group,image,o,frame,box,cuts);return;}
 group.querySelector('[data-curb-sections]')?.remove();image.removeAttribute('visibility');
 if(!frame.jointTrim){image.removeAttribute('clip-path');return;}
 const [left,right]=cuts.get(o.id)||[false,false];
 if(!left&&!right){image.removeAttribute('clip-path');return;}
 let clip=group.querySelector('[data-boundary-clip]');
 if(!clip){clip=node('clipPath',{'data-boundary-clip':'',id:'joint-'+o.id,clipPathUnits:'userSpaceOnUse'});clip.append(node('rect'));group.append(clip);}
 const x0=left?frame.jointTrim[0]:0,x1=right?frame.jointTrim[1]:frame.width;
 for(const [k,v]of Object.entries({x:box.x+x0*box.scale,y:box.y-100,width:(x1-x0)*box.scale,height:box.height+200}))clip.firstElementChild.setAttribute(k,v);
 image.setAttribute('clip-path',`url(#${clip.id})`);
}
function renderCurb(group,image,o,f,box,cuts){
 image.setAttribute('visibility','hidden');image.removeAttribute('clip-path');
 let layer=group.querySelector('[data-curb-sections]');if(!layer){layer=node('g',{'data-curb-sections':'','pointer-events':'none'});group.append(layer);}
 const cut=cuts.get(o.id)||[false,false],key=[image.getAttribute('href'),o.rotation,box.x,box.y,box.scale,...cut].join('|');if(layer.dataset.key===key)return;layer.dataset.key=key;layer.replaceChildren();
 const slope=o.rotation%2?-.5:.5,scale=box.scale,n=f.curbRepeat,src=image.getAttribute('href');
 for(let i=0;i<n;i++){
  const s=scale/n,cx=box.pivotX+(-64+(i+.5)*128/n)*scale,cy=box.pivotY+(-64+(i+.5)*128/n)*slope*scale;
  const left=i===0?(cut[0]===true?64:typeof cut[0]==='number'?64+cut[0]:48):64+i*128/n;
  const right=i===n-1?(cut[1]===true?192:typeof cut[1]==='number'?192-cut[1]:208):64+(i+1)*128/n;
  const id='curb-'+o.id+'-'+i,clip=node('clipPath',{id,clipPathUnits:'userSpaceOnUse'});
  clip.append(node('rect',{x:box.x+left*scale,y:box.y-100,width:Math.max(0,(right-left)*scale),height:box.height+200}));layer.append(clip);
  const g=node('g',{'clip-path':`url(#${id})`}),[a,b,c,d,e,h]=f.segmentProjection;
  const im=node('image',{href:src,x:0,y:0,width:f.width,height:f.height,transform:`matrix(${s*a} ${s*b} ${s*c} ${s*d} ${cx+s*(e-128)} ${cy+s*(h-200)})`});g.append(im);layer.append(g);
 }
}
