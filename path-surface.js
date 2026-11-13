import {contour} from './terrain-geometry.js?v=251';
import {shoreSections} from './shore-geometry.js?v=182';
import {PaintedTurfEdge} from './painted-turf-edge.js?v=262';
import {bedCoverage,landSide} from './terrain-boundaries.js?v=258';
const NS='http://www.w3.org/2000/svg';
const node=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);return n};
const path=(d,attrs)=>node('path',{d,...attrs});
const random=(x,y,salt)=>{let h=Math.imul(Math.round(x*97)^salt,374761393)^Math.imul(Math.round(y*89),668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296};
const f=n=>n.toFixed(2);
// The vertical face is visible where the grass is behind the exposed earth.
// Its height is a world-space distance, independent of cell count and zoom.
export function turfCutGeometry(d,accept=()=>true){
 const faces=['','',''],shadows=['','',''];let roots='',lip='';
 const height=p=>.62+.1*Math.sin(p.x*.31+p.y*.17)+.07*Math.sin(p.x*.73-p.y*.23);
 for(const loop of shoreSections(d))for(let i=0;i<loop.length-1;i++){
  const p=loop[i],q=loop[i+1],facing=(p.ny+q.ny)/2;if(facing<=.08||!accept(p))continue;
  const a=height(p)*Math.min(1,facing*1.6),b=height(q)*Math.min(1,facing*1.6),tone=facing>.8?0:facing>.5?1:2;
  faces[tone]+=`M${f(p.x)} ${f(p.y)}L${f(q.x)} ${f(q.y)}L${f(q.x)} ${f(q.y+b)}L${f(p.x)} ${f(p.y+a)}Z`;
  lip+=`M${f(p.x)} ${f(p.y)}L${f(q.x)} ${f(q.y)}`;
  for(let k=0;k<3;k++)shadows[k]+=`M${f(p.x)} ${f(p.y+a+.25+k*.28)}L${f(q.x)} ${f(q.y+b+.25+k*.28)}`;
  const n=random(p.x,p.y,269);if(n>.42)roots+=`M${f(p.x)} ${f(p.y+.18)}l${f((n-.5)*.36)} ${f(a*.65)}`;
 }
 return {faces,shadows,roots,lip};
}

// Light arrives from upper left. Only a raised edge facing the projected light
// vector can cast onto the soil. A fixed translation preserves light direction
// across bends instead of outlining the entire road with a dark stroke.
export function turfCastGeometry(d,accept=()=>true){
 let umbra='',penumbra='';
 for(const loop of shoreSections(d))for(let i=0;i<loop.length-1;i++){
  const p=loop[i],q=loop[i+1],facing=(p.nx+q.nx)*.3+(p.ny+q.ny)*.65;if(facing<=.08||!accept(p))continue;
  const h=.95+.13*Math.sin(p.x*.31+p.y*.17)+.09*Math.sin(p.x*.73-p.y*.23);
  for(const [k,scale]of [1,.52].entries()){
   const sx=.65*h*scale,sy=1.3*h*scale,shape=`M${f(p.x)} ${f(p.y)}L${f(q.x)} ${f(q.y)}L${f(q.x+sx)} ${f(q.y+sy)}L${f(p.x+sx)} ${f(p.y+sy)}Z`;
   if(k)umbra+=shape;else penumbra+=shape;
  }
 }
 return {umbra,penumbra};
}

// The cut only changes coverage. Materials stay anchored in world coordinates.
export class PathSurface {
 constructor(ids){
  this.ids=ids;this.node=node('g',{'data-landscape-layer':'PathSurface','pointer-events':'none'});
  const defs=node('defs');
  this.grassMask=node('mask',{id:ids.turfMask,maskUnits:'userSpaceOnUse',x:-1400,y:-100,width:3600,height:1900,'mask-type':'luminance','data-camera-turf-mask':'true'});
  this.grassMask.append(node('rect',{x:-1400,y:-100,width:3600,height:1900,fill:'white'}));
  this.cut=path('',{fill:'black','fill-rule':'evenodd'});this.bedCut=path('',{fill:'black'});this.apronCut=path('',{fill:'black'});this.grassMask.append(this.cut,this.bedCut,this.apronCut);
  const earthClip=node('clipPath',{id:ids.earthClip,clipPathUnits:'userSpaceOnUse'});this.clipPath=path('',{'clip-rule':'evenodd'});earthClip.append(this.clipPath);
  defs.append(this.grassMask,earthClip);this.node.append(defs);
  const earth=node('g',{'clip-path':`url(#${ids.earthClip})`});
  this.relief=node('g',{'data-turf-cut':'true',opacity:.45});
  this.contact=path('',{fill:'none',stroke:'#42602b','stroke-width':.2,opacity:.16});
  earth.append(this.contact,this.relief);this.fringe=node('g',{'data-path-fringe':'true'});this.painted=new PaintedTurfEdge();this.castShadow=node('g',{'data-turf-cast-shadow':'true','clip-path':`url(#${ids.earthClip})`});this.node.append(earth,this.painted.node,this.castShadow,this.fringe);
 }
 update(cells,sample,apronD=''){
  const d=contour(cells,'path'),beds=bedCoverage(cells),signature=d+'|'+beds+'|'+apronD+'|'+cells.join(',');if(signature===this.signature)return;this.signature=signature;
  const accept=sample?p=>landSide(p,sample)==='grass':()=>true;
  this.bedCut.setAttribute('d',beds);this.apronCut.setAttribute('d',apronD);this.painted.update(d,{key:signature,accept});
  for(const n of [this.cut,this.clipPath,this.contact])n.setAttribute('d',d);
  const relief=turfCutGeometry(d,accept);
  this.relief.replaceChildren(
   ...relief.shadows.map((d,i)=>path(d,{fill:'none',stroke:'#3e3320','stroke-width':.65,opacity:[.14,.085,.04][i]})),
   ...relief.faces.map((d,i)=>path(d,{fill:['#46602a','#51612d','#636339'][i]})),
   path(relief.roots,{fill:'none',stroke:'#a38f53','stroke-width':.12,opacity:.55}),
   path(relief.lip,{fill:'none',stroke:'#267a24','stroke-width':.25,opacity:.8})
  );
  const blades=['','',''],leaves=['',''],tips=['','',''];let bladeShadow='';
  for(const loop of shoreSections(d))for(let i=0;i<loop.length-1;i++)for(let sample=0;sample<4;sample++){
   const a=loop[i],b=loop[i+1],t=sample/4,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,nx:a.nx+(b.nx-a.nx)*t,ny:a.ny+(b.ny-a.ny)*t},q=random(p.x,p.y,247);if(q<.23||!accept(p))continue;
   const count=q>.84?3:q>.55?2:1;
   for(let k=0;k<count;k++){
    const t=random(p.x+k*3,p.y-k*5,251),side=(k-(count-1)/2)*.28;
    const x=p.x-p.nx*(.12+t*.34)+p.ny*side,y=p.y-p.ny*(.12+t*.34)-p.nx*side,h=.3+t*.62,lean=(random(x,y,257)-.5)*.38;
    blades[k%3]+=`M${x.toFixed(2)} ${y.toFixed(2)}q${(lean*.25).toFixed(2)} ${(-h*.65).toFixed(2)} ${lean.toFixed(2)} ${(-h).toFixed(2)}`;
    bladeShadow+=`M${f(x)} ${f(y)}Q${f(x+lean*.25+h*.25)} ${f(y+h*.45)} ${f(x+lean+h*.55)} ${f(y+h*.9)}`;
    if(p.ny<.12&&t>.28){const width=.07+t*.08,height=.4+t*.55;
     tips[k%3]+=`M${f(x-width)} ${f(y+.1)}Q${f(x-width*.5)} ${f(y-height*.45)} ${f(x+lean)} ${f(y-height)}Q${f(x+width*.5)} ${f(y-height*.4)} ${f(x+width)} ${f(y+.1)}Z`;
    }
    if(t>.87)leaves[k%2]+=`M${(x-.12).toFixed(2)} ${y.toFixed(2)}Q${(x-.08).toFixed(2)} ${(y-h*.52).toFixed(2)} ${(x+lean).toFixed(2)} ${(y-h).toFixed(2)}Q${(x+.16).toFixed(2)} ${(y-h*.38).toFixed(2)} ${(x+.12).toFixed(2)} ${(y+.08).toFixed(2)}Z`;
   }
  }
  const cast=turfCastGeometry(d,accept);
  this.castShadow.replaceChildren(path(cast.penumbra,{fill:'#202416',opacity:.09}),path(cast.umbra,{fill:'#242819',opacity:.14}),path(bladeShadow,{fill:'none',stroke:'#202619','stroke-width':.16,'stroke-linecap':'round',opacity:.15}));
  this.fringe.replaceChildren(...tips.map((d,i)=>path(d,{fill:['#287d1d','#398d22','#479b2a'][i]})),...leaves.map((d,i)=>path(d,{fill:i?'#348f29':'#267b24'})),...blades.map((d,i)=>path(d,{fill:'none',stroke:['#226f22','#328c28','#4b9d2d'][i],'stroke-width':[.19,.16,.12][i],'stroke-linecap':'round'})));
 }
}
