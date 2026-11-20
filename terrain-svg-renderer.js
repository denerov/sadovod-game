import {landBoundary,cellColumn,cellRow} from './land-model.js?v=182';
import {contour} from './terrain-geometry.js?v=254';
import {shoreSections} from './shore-geometry.js?v=182';
import {terrainContacts} from './terrain-contacts.js?v=266';
import {PathSurface} from './path-surface.js?v=278';
import {PaintedTurfEdge} from './painted-turf-edge.js?v=262';
import {bedCoverage,terrainSampler,landSide,roadShoreApron} from './terrain-boundaries.js?v=258';
import {terrainMaterial,waterMaterial} from './terrain-material.js?v=262';

const NS='http://www.w3.org/2000/svg',SEED=0x5ad0c0d;
const el=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n};
const project=(c,r,u=.5,v=.5)=>[384+(c+u-r-v)*32,(c+u+r+v)*16];
const noise=(x,y,s=0)=>{let n=(Math.imul(Math.round(x*37)+s+SEED,374761393)^Math.imul(Math.round(y*41)-s,668265263))>>>0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295};
const pathNode=(d,attrs={})=>el('path',{d,...attrs});
let rendererSequence=0;

class TerrainLayer{
 constructor(name){this.node=el('g',{'data-landscape-layer':name,'pointer-events':'none'});this.signature=''}
 replace(signature,...children){if(signature===this.signature)return false;this.signature=signature;this.node.replaceChildren(...children);return true}
}

export class TerrainSurface extends TerrainLayer{
 constructor(ids){super('TerrainSurface');this.ids=ids}
 update(cells){const d=landBoundary(cells);this.replace(d,pathNode(d,{fill:`url(#${this.ids.path})`,'data-surface':'earth-base'}),pathNode(d,{fill:`url(#${this.ids.grass})`,'data-surface':'grass',mask:`url(#${this.ids.turfMask})`}));return d}
}

export class GrassDetail extends TerrainLayer{
 constructor(ids){super('GrassDetail');this.ids=ids;this.chunks=[];this.view=null}
 setView(view){
  this.view=view;
 }
 update(cells,landD){
  const signature=landD+'|'+cells.length;if(signature===this.signature)return;
  const chunks=new Map(),chunkFor=(c,r)=>{const key=(c>>3)+','+(r>>3);if(chunks.has(key))return chunks.get(key);const c0=(c>>3)*8,r0=(r>>3)*8,points=[[c0,r0],[c0+8,r0],[c0,r0+8],[c0+8,r0+8]].map(([a,b])=>project(a,b,0,0)),chunk={fine:['',''],tufts:['',''],left:Math.min(...points.map(p=>p[0]))-8,right:Math.max(...points.map(p=>p[0]))+8,top:Math.min(...points.map(p=>p[1]))-8,bottom:Math.max(...points.map(p=>p[1]))+8};chunks.set(key,chunk);return chunk};
  cells.forEach((type,i)=>{if(!type||type==='void')return;const c=cellColumn(i),r=cellRow(i),cluster=noise(c>>1,r>>1,101),count=cluster>.76?5:cluster>.38?3:2,chunk=chunkFor(c,r),fine=chunk.fine,tufts=chunk.tufts;
   for(let k=0;k<count;k++){const q=noise(c*11+k,r*13-k,109),u=.08+noise(c*17+k,r*19,113)*.84,v=.08+noise(c*23,r*29+k,127)*.84,[x,y]=project(c,r,u,v),h=.55+q*1.25,lean=(noise(c+k,r-k,131)-.5)*.62;fine[q>.55?1:0]+=`M${x.toFixed(2)} ${y.toFixed(2)}q${(lean*.25).toFixed(2)} ${(-h*.55).toFixed(2)} ${lean.toFixed(2)} ${(-h).toFixed(2)}`}
   if(cluster>.83){const [x,y]=project(c,r,.18+noise(c,r,139)*.64,.2+noise(c,r,149)*.6),blades=3+Math.floor(cluster*3);for(let k=0;k<blades;k++){const side=(k-(blades-1)/2)*.28,h=1.55+noise(c+k,r-k,151)*1.55,lean=(noise(c-k,r+k,157)-.5)*.9;tufts[k&1]+=`M${(x+side).toFixed(2)} ${y.toFixed(2)}q${(lean*.25).toFixed(2)} ${(-h*.5).toFixed(2)} ${lean.toFixed(2)} ${(-h).toFixed(2)}`}}
  });
  const clip=el('clipPath',{id:this.ids.clip});clip.append(pathNode(landD));const group=el('g',{'clip-path':`url(#${this.ids.clip})`,mask:`url(#${this.ids.turfMask})`});this.chunks=[];
  for(const chunk of chunks.values()){const node=el('g',{'data-grass-chunk':'true'});chunk.fine.forEach((d,i)=>d&&node.append(pathNode(d,{fill:'none',stroke:i?'#48a63e':'#23782d','stroke-width':i?'.15':'.12','stroke-linecap':'round',opacity:i?'.48':'.37','data-lod':'medium'})));chunk.tufts.forEach((d,i)=>d&&node.append(pathNode(d,{fill:'none',stroke:i?'#46a03b':'#176d28','stroke-width':'.18','stroke-linecap':'round',opacity:'.68','data-lod':'near'})));group.append(node);this.chunks.push({...chunk,node})}
  this.replace(signature,clip,group);this.setView(this.view);
 }
}

export class PathMask extends TerrainLayer{
 constructor(ids){super('PathMask');this.ids=ids}
 update(d){if(!d){this.replace('');return}this.replace(d,
  pathNode(d,{fill:'none',stroke:'#4a351f','stroke-width':'3.2','stroke-linejoin':'round',opacity:'.36'}),
  pathNode(d,{fill:'none',stroke:'#90704b','stroke-width':'2.25','stroke-linejoin':'round',opacity:'.62'}),
  pathNode(d,{fill:`url(#${this.ids.path})`,'fill-rule':'evenodd'}),
  pathNode(d,{fill:'none',stroke:'#f1d8aa','stroke-width':'.34','stroke-linejoin':'round',opacity:'.22'}))}
}

export class WaterMask extends TerrainLayer{
 constructor(ids){super('WaterMask');this.ids=ids}
 update(d){if(!d){this.replace('');return}this.replace(d,pathNode(d,{fill:`url(#${this.ids.water})`,'fill-rule':'evenodd','data-surface':'water'}))}
}

export class ShoreTransition extends TerrainLayer{
 constructor(ids){super('ShoreTransition');this.ids=ids;this.painted=new PaintedTurfEdge()}
 update(d,sampler,materialKey=''){
  if(!d){this.painted.update('');this.replace('');return}const signature=d+'|'+materialKey;if(signature===this.signature)return;this.painted.update(d,{key:materialKey,front:true,accept:p=>!sampler||landSide(p,sampler)==='grass'});
  const clip=el('clipPath',{id:this.ids.waterClip,clipPathUnits:'userSpaceOnUse'});clip.append(pathNode(d,{'clip-rule':'evenodd'}));
  const localDefs=el('defs');localDefs.append(clip);
  const inWater=el('g',{'clip-path':`url(#${this.ids.waterClip})`});
  // Feather the waterline with overlapping translucent strokes inside the pond.
  // Live filters would rasterize the bounds of all ponds together.
  inWater.append(...[5.2,3.8,2.4,1.2].map(width=>pathNode(d,{fill:'none',stroke:'#8abfb0','stroke-width':width,opacity:.075,'data-shallow-water':'true'})));
  let bank='',shadow='',turfContact='',earthContact='';
  for(const loop of shoreSections(d))for(let i=0;i<loop.length-1;i++){
   const p=loop[i],q=loop[i+1],material=sampler?landSide(p,sampler):'grass',earth=material==='path'||material==='bed',face=Math.max(0,(p.ny+q.ny)/2),height=earth?.12+face*.35:.22+face*.8;
   if(earth)earthContact+=`M${p.x} ${p.y}L${q.x} ${q.y}`;else if(material==='grass')turfContact+=`M${p.x} ${p.y}L${q.x} ${q.y}`;
   if(face>.08){
    bank+=`M${p.x} ${p.y}L${q.x} ${q.y}L${q.x} ${q.y+height}L${p.x} ${p.y+height}Z`;
    shadow+=`M${p.x} ${p.y+height}L${q.x} ${q.y+height}L${q.x+.45} ${q.y+height+.75}L${p.x+.45} ${p.y+height+.75}Z`;
   }
  }
  inWater.append(pathNode(shadow,{fill:'#254944',opacity:.13}),pathNode(bank,{fill:`url(#${this.ids.shore})`,'data-bank-face':'true'}));
  // A narrow wet contact separates the turf top from the water without a thick
  // decorative border. Bank height is visible only on the receiving faces.
  this.replace(signature,localDefs,inWater,pathNode(turfContact,{fill:'none',stroke:'#50643a','stroke-width':.2,opacity:.46}),pathNode(earthContact,{fill:'none',stroke:'#756346','stroke-width':.22,opacity:.56}),this.painted.node);
 }
}

export class ObjectContact extends TerrainLayer{
 constructor(){super('ObjectContact')}
 update(objects){const c=terrainContacts(objects);this.replace(c.signature,
  c.soil&&pathNode(c.soil,{fill:'#735438',opacity:'.76'}),
  c.entries&&pathNode(c.entries,{fill:'#a0835c',opacity:'.62'}));}
}

export class EdgeVegetation extends TerrainLayer{
 constructor(){super('EdgeVegetation')}
 update(pathD,waterD,sampler,materialKey=''){
  const signature=pathD+'|'+waterD+'|'+materialKey;if(signature===this.signature)return;const blades=['',''],tips=['',''];let stoneD='',stoneLight='',submergedD='',plantD='';
  for(const [type,d,salt] of [['path',pathD,411],['water',waterD,751]])for(const loop of shoreSections(d||''))for(let i=0;i<loop.length-1;i++)for(let sample=0;sample<3;sample++){
   const a=loop[i],b=loop[i+1],t=sample/3,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,nx:a.nx+(b.nx-a.nx)*t,ny:a.ny+(b.ny-a.ny)*t},n=noise(p.x,p.y,salt),grass=!sampler||landSide(p,sampler)==='grass';if(n>.2&&grass){const x=p.x-p.nx*(.18+n*.28),y=p.y-p.ny*(.18+n*.28),h=.38+n*.65,lean=(noise(p.x,p.y,salt+9)-.5)*.65;blades[n>.64?1:0]+=`M${x.toFixed(2)} ${y.toFixed(2)}q${(lean*.25).toFixed(2)} ${(-h*.52).toFixed(2)} ${lean.toFixed(2)} ${(-h).toFixed(2)}`}
   if(type==='water'&&n>.28&&grass){const x=p.x-p.nx*.22,y=p.y-p.ny*.22,h=.4+n*.65,w=.055+n*.055,lean=(noise(x,y,783)-.5)*.6;tips[n>.6?1:0]+=`M${x-w} ${y+.1}Q${x-w*.4} ${y-h*.5} ${x+lean} ${y-h}Q${x+w*.5} ${y-h*.4} ${x+w} ${y+.1}Z`}
   if(type==='water'&&sample===0&&n>.98){const x=p.x+p.nx*.45,y=p.y+p.ny*.45,rx=.35+n*.3;stoneD+=`M${x-rx} ${y}L${x-rx*.55} ${y-rx*.48}L${x+rx*.22} ${y-rx*.62}L${x+rx*.82} ${y-rx*.2}L${x+rx} ${y+rx*.2}L${x+rx*.1} ${y+rx*.43}L${x-rx*.7} ${y+rx*.28}Z`;stoneLight+=`M${x-rx*.55} ${y-rx*.48}L${x+rx*.22} ${y-rx*.62}L${x+rx*.82} ${y-rx*.2}`;}
   if(type==='water'&&sample===0&&n>.982&&grass){const x=p.x-p.nx*.7,y=p.y-p.ny*.7;plantD+=`M${x.toFixed(2)} ${y.toFixed(2)}q-1 -1.4 -1.4-2.7M${x.toFixed(2)} ${y.toFixed(2)}q.8-1.5 1.2-2.8`}
   if(type==='water'&&sample===0&&n>.975){const x=p.x+p.nx*1.4,y=p.y+p.ny*1.4,rx=.72+n*.4;submergedD+=`M${(x-rx).toFixed(2)} ${y.toFixed(2)}a${rx.toFixed(2)} ${(rx*.48).toFixed(2)} 0 1 0 ${(rx*2).toFixed(2)} 0a${rx.toFixed(2)} ${(rx*.48).toFixed(2)} 0 1 0 ${(-rx*2).toFixed(2)} 0`}
  }
  const children=[];tips.forEach((d,i)=>d&&children.push(pathNode(d,{fill:i?'#398d22':'#287d1d','data-lod':'medium'})));blades.forEach((d,i)=>d&&children.push(pathNode(d,{fill:'none',stroke:i?'#3fa03c':'#176b29','stroke-width':i?'.13':'.11','stroke-linecap':'round',opacity:'.88','data-lod':'near'})));
  if(submergedD)children.push(pathNode(submergedD,{fill:'#4e8e8a',opacity:'.32','data-lod':'near','data-submerged-shore-stones':'true'}));
  if(stoneD)children.push(pathNode(stoneD,{fill:'#969882',stroke:'#5d7164','stroke-width':'.09',opacity:'.86','data-lod':'near'}));
  if(stoneLight)children.push(pathNode(stoneLight,{fill:'none',stroke:'#c5c5a5','stroke-width':'.14',opacity:'.75','data-lod':'near'}));
  if(plantD)children.push(pathNode(plantD,{fill:'none',stroke:'#237a36','stroke-width':'.32','stroke-linecap':'round','data-lod':'near'}));this.replace(signature,...children);
 }
}

function defs(ids){
 const out=el('defs'),pattern=(id,w,h,children)=>{const p=el('pattern',{id,patternUnits:'userSpaceOnUse',width:w,height:h});p.append(...children);return p};
 out.append(
  pattern(ids.grass,160,160,[el('rect',{width:160,height:160,fill:'#238b23'})]),
  pattern(ids.path,64,64,[el('rect',{width:64,height:64,fill:'#b5a17b'})]),
  pattern(ids.water,192,192,[el('rect',{width:192,height:192,fill:'#1899c2'})]),
  pattern(ids.shore,32,32,[el('rect',{width:32,height:32,fill:'#806c43'}),el('image',{href:'./assets/terrain-v252/earth.png',width:32,height:32,opacity:'.28'})])
 );
 for(const [id,material,size]of [[ids.grass,terrainMaterial('./assets/terrain-v252/grass-cut.png',192,.60),52],[ids.path,terrainMaterial('./assets/terrain-v252/earth.png',256),56],[ids.water,waterMaterial(),192]]){
  const p=out.querySelector('#'+id);material.then(href=>{p.setAttribute('width',size);p.setAttribute('height',size);p.replaceChildren(el('image',{href,width:size,height:size,preserveAspectRatio:'none'}));window.dispatchEvent(new Event('sadovod:terrain-material-ready'))}).catch(error=>console.error('Terrain material',error));
 }
 return out;
}

export function terrainPixelRatio(){return 1}

export class TerrainRenderer{
 constructor(svg){const prefix='le-'+(++rendererSequence)+'-',ids=this.ids={grass:prefix+'grass',path:prefix+'path',water:prefix+'water',shore:prefix+'shore',clip:prefix+'land-clip',turfMask:prefix+'turf-mask',earthClip:prefix+'earth-clip',waterClip:prefix+'water-clip',shallowBlur:prefix+'shallow-blur',contactBlur:prefix+'contact-blur'};this.svg=svg;this.defs=defs(ids);this.root=el('g',{'data-terrain-engine':'LandscapeEngine-2.0','pointer-events':'none','data-seed':SEED});this.layers={surface:new TerrainSurface(ids),grass:new GrassDetail(ids),path:new PathSurface(ids),shore:new ShoreTransition(ids),water:new WaterMask(ids),contact:new ObjectContact(),edge:new EdgeVegetation()};this.root.append(this.layers.surface.node,this.layers.grass.node,this.layers.path.node,this.layers.water.node,this.layers.shore.node,this.layers.contact.node,this.layers.edge.node);svg.prepend(this.root);svg.prepend(this.defs)}
 setView(view={}){this.layers.grass.setView(view);const scale=Number(view.scale)||1,lod=scale<.58?'far':scale<1.05?'medium':'near';if(this.root.dataset.lod===lod)return;this.root.dataset.lod=lod;for(const n of this.root.querySelectorAll?.('[data-lod="near"]')||[])n.style.display=lod==='near'?'':'none';for(const n of this.root.querySelectorAll?.('[data-lod="medium"]')||[])n.style.display=lod==='far'?'none':''}
 update(cells,objects=[]){
  const signature=cells.join('|');if(signature!==this.cellsSignature){this.cellsSignature=signature;this.root.dataset.terrainRevision=String((Number(this.root.dataset.terrainRevision)||0)+1);
   const landD=this.layers.surface.update(cells),pathD=contour(cells,'path'),waterD=contour(cells,'water'),bedD=bedCoverage(cells),sample=terrainSampler(cells,pathD,waterD,bedD),apron=roadShoreApron(waterD,sample);
   this.layers.grass.update(cells,landD);this.layers.path.update(cells,sample,apron);this.layers.shore.update(waterD,sample,pathD+'|'+bedD);this.layers.water.update(waterD);this.layers.edge.update('',waterD,sample,pathD+'|'+bedD);
  }
  this.layers.contact.update(objects);requestAnimationFrame(()=>{window.dispatchEvent(new Event('sadovod:terrain-painted'));window.dispatchEvent(new Event('sadovod:terrain-ready'))});
 }
}
