import {flattenShore} from './shore-geometry.js?v=182';
export function terrainRandom(x,y,salt){let v=Math.imul(x^salt,374761393)^Math.imul(y,668265263);v=Math.imul(v^(v>>>13),1274126177);return ((v^(v>>>16))>>>0)/4294967296}
export function roundedBed(c,r){
 const project=(x,y)=>[(x-y)*32+384,(x+y)*16],inset=.055;
 const ps=[project(c+inset,r+inset),project(c+1-inset,r+inset),project(c+1-inset,r+1-inset),project(c+inset,r+1-inset)];
 let d='';ps.forEach((p,j)=>{const a=ps[(j+3)%4],b=ps[(j+1)%4],round=.11+terrainRandom(c,r,j+6401)*.035,near=q=>[p[0]+(q[0]-p[0])*round,p[1]+(q[1]-p[1])*round];d+=(j?'L':'M')+near(a).join(' ')+'Q'+p.join(' ')+' '+near(b).join(' ')});const loop=flattenShore(d+'Z')[0].slice(0,-1);return loop.map((p,i)=>{const a=loop[(i+loop.length-1)%loop.length],b=loop[(i+1)%loop.length],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,n=(terrainRandom(Math.round(p[0]*8),Math.round(p[1]*8),6421)-.5)*.36;return (i?'L':'M')+(p[0]-dy/l*n).toFixed(3)+' '+(p[1]+dx/l*n).toFixed(3)}).join('')+'Z';
}
export function waterContour(loop){
 const corners=loop.map((p,j)=>{
  const prev=loop[(j+loop.length-1)%loop.length],next=loop[(j+1)%loop.length],la=Math.hypot(prev[0]-p[0],prev[1]-p[1]),lb=Math.hypot(next[0]-p[0],next[1]-p[1]);
  // Small worn corners preserve the cell logic without exposing round tiles.
  const radius=Math.min(la*.26,lb*.26,4.5+terrainRandom(Math.round(p[0]),Math.round(p[1]),6501)*5.5);
  const toward=(q,l)=>[p[0]+(q[0]-p[0])*radius/l,p[1]+(q[1]-p[1])*radius/l];
  return {p,a:toward(prev,la),b:toward(next,lb)};
 });
 let d='M'+corners[0].a.join(' ');
 corners.forEach(({p,b},j)=>{
  d+='Q'+p.join(' ')+' '+b.join(' ');const end=corners[(j+1)%corners.length].a,dx=end[0]-b[0],dy=end[1]-b[1],len=Math.hypot(dx,dy)||1,n=Math.max(2,Math.ceil(len/6));
  // Only fine deterministic erosion. The former amplitude produced obvious
  // semicircles and conflicted with straight fences on cell boundaries.
  for(let k=0;k<n;k++){const t=(k+.5)/n,u=(k+1)/n,x=b[0]+dx*t,y=b[1]+dy*t,slow=Math.sin(x*.11+y*.17)*.35,grain=(terrainRandom(Math.round(x*3),Math.round(y*3),6511)-.5)*1.35,broad=Math.sin(x*.041-y*.073)*.3,wobble=slow+grain+broad;d+='Q'+[x-dy/len*wobble,y+dx/len*wobble,b[0]+dx*u,b[1]+dy*u].join(' ')}
 });return d+'Z';
}
