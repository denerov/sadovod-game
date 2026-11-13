import {doubleGatePoint,doubleGateDepth} from './double-gate.js?v=182';
// Each leaf is constructed from five solid boards, including a free-end stile.
// The full board volumes rotate; no whole-sprite cut or opaque side-wall is used.
const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
export function timberBoards(side){return [
 {poly:side?[[5,43],[43,8],[47,13],[9,48]]:[[5,8],[43,43],[47,38],[9,3]],depth:-.65},
 {poly:rect(0,0,51,8),depth:0}, {poly:rect(0,46,51,8),depth:0},
 {poly:rect(0,0,7,54),depth:.15}, {poly:rect(44,0,7,54),depth:.15}
];}
export function timberFaces(rotation,side,progress){
 const slope=rotation%2?-56/105:50/105,base=rotation%2?166:109,depth=doubleGateDepth(rotation,side,progress);
 const project=(u,v,z)=>{const x=side?129+u:75+u,y=base+slope*(x-75)+v,p=doubleGatePoint(rotation,side,{x,y},progress);return [p.x+depth.x*z,p.y+depth.y*z];};
 const faces=[];
 for(const [board,b]of timberBoards(side).entries()){
  const poly=b.poly,zs=[b.depth-.5,b.depth+.5];
  for(let face=0;face<6;face++){
   const local=face<2?poly.map(([u,v])=>[u,v,zs[face]]):(()=>{const i=face-2,j=(i+1)%4;return [[...poly[i],zs[0]],[...poly[j],zs[0]],[...poly[j],zs[1]],[...poly[i],zs[1]]];})();
   const points=local.map(p=>project(...p)),order=local.reduce((s,[u,v,z])=>s+project(u,0,z)[1],0)/4;
   faces.push({points,order,board,face,fill:face<2?'wood':face===2?'#e2a449':face===4?'#704017':'#a4692a',grain:face<2?Array.from({length:5},(_,i)=>{const t=(i+1)/6,a=poly[0].map((v,k)=>v+(poly[3][k]-v)*t),b=poly[1].map((v,k)=>v+(poly[2][k]-v)*t);return [project(...a,zs[face]),project((a[0]+b[0])/2,(a[1]+b[1])/2+.35,zs[face]),project(...b,zs[face])];}):[]});
  }
 }
 return faces.sort((a,b)=>a.order-b.order||a.face-b.face);
}
export function timberSVG(rotation,side,progress,id){const pts=p=>p.map(q=>q.map(v=>v.toFixed(3)).join(',')).join(' ');return `<defs><linearGradient id="${id}" x1="0" y1="0" x2=".2" y2="1"><stop stop-color="#f0b554"/><stop offset=".18" stop-color="#bb772f"/><stop offset=".62" stop-color="#a86121"/><stop offset=".86" stop-color="#c58a39"/><stop offset="1" stop-color="#794318"/></linearGradient></defs>`+timberFaces(rotation,side,progress).map(f=>`<polygon points="${pts(f.points)}" fill="${f.fill==='wood'?`url(#${id})`:f.fill}" stroke="#794819" stroke-width=".35" stroke-linejoin="round"/>${f.grain.map((p,i)=>`<polyline points="${pts(p)}" fill="none" stroke="${i%2?'#f5bc61':'#704117'}" stroke-opacity=".38" stroke-width=".45"/>`).join('')}`).join('');}
export function timberHit(rotation,p,progress){return [0,1].some(side=>timberFaces(rotation,side,progress).some(({points})=>{let yes=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const [x,y]=points[i],[u,v]=points[j];if((y>p.y)!==(v>p.y)&&p.x<(u-x)*(p.y-y)/(v-y)+x)yes=!yes;}return yes;}));}
