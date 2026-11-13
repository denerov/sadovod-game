import {timberSVG} from './gate-timber.js?v=182';
import {gateParts} from './gate-leaf.js?v=182';
import {doubleGateParts,doubleGatePoint} from './double-gate.js?v=182';
const NS='http://www.w3.org/2000/svg',make=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
const points=poly=>poly.map(p=>p.join(' ')).join(' ');let serial=0;const motion=new WeakMap();
export function renderGateParts(g,o,frame,box,src){
 if(!src)return;
 let parts=g.querySelector('[data-gate-parts]'),state=motion.get(g);
 if(!parts){
  const id='gate-parts-'+(++serial),defs=make('defs');parts=make('g',{'data-gate-parts':'','pointer-events':'none'});parts.append(defs);
  for(let side=0;side<2;side++){const leaf=make('g',{'data-gate-half':side,'data-timber-id':id+'-wood-'+side});leaf.append(make('g',{'data-timber':''}),make('polygon',{'data-leaf-hit':'',fill:'transparent','pointer-events':'all'}));parts.append(leaf);}
  const clip=make('clipPath',{id:id+'-posts',clipPathUnits:'userSpaceOnUse'});clip.append(make('polygon'),make('polygon'));defs.append(clip);parts.append(make('image',{'data-gate-posts':'','clip-path':`url(#${id}-posts)`,width:256,height:256}));g.append(parts);
 }
 const geometry=gateParts(o.rotation),clips=parts.querySelectorAll('clipPath');
 [...clips[0].children].forEach((p,i)=>p.setAttribute('points',points(geometry.posts[i])));
 parts.setAttribute('transform',`translate(${box.x} ${box.y}) scale(${box.scale})`);parts.querySelectorAll('image').forEach(n=>n.setAttribute('href',src));
 const target=o.open?1:0,halves=[...parts.querySelectorAll('[data-gate-half]')].sort((a,b)=>Number(a.dataset.gateHalf)-Number(b.dataset.gateHalf));
 const paint=value=>{
  let top=Math.min(...geometry.posts.flat().map(p=>p[1]));
  halves.forEach((half,side)=>{
   half.querySelector('[data-timber]').innerHTML=timberSVG(o.rotation,side,value,half.dataset.timberId);
   const quad=doubleGateParts(o.rotation,side).leaf.map(([x,y])=>doubleGatePoint(o.rotation,side,{x,y},value));half.querySelector('[data-leaf-hit]').setAttribute('points',quad.map(p=>`${p.x},${p.y}`).join(' '));top=Math.min(top,...quad.map(p=>p.y));
  });
  // Draw the nearer half last while retaining fixed posts above both hinges.
  const order=halves.map((half,side)=>({half,y:doubleGatePoint(o.rotation,side,{x:127.5,y:170},value).y})).sort((a,b)=>a.y-b.y);for(const {half}of order)parts.insertBefore(half,parts.querySelector('[data-gate-posts]'));
  g.dataset.gateArtTop=String(box.y+top*box.scale);g.firstElementChild.style.display='none';
 };
 if(state?.raf)cancelAnimationFrame(state.raf);motion.set(g,{rotation:o.rotation,value:target,target,raf:0});paint(target);
}
