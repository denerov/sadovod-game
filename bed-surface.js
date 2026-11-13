import {shoreSections} from './shore-geometry.js?v=182';
import {terrainRandom} from './terrain-details.js?v=258';
const NS='http://www.w3.org/2000/svg',f=n=>n.toFixed(3);
export function bedEdgeGeometry(d){
 const blades=['',''],tips=['',''];let shade='';
 for(const loop of shoreSections(d))for(let i=0;i<loop.length-1;i++){
  const p=loop[i],q=loop[i+1],len=Math.hypot(q.x-p.x,q.y-p.y),count=Math.max(1,Math.ceil(len/.52));
  if(p.ny>.1)shade+=`M${f(p.x)} ${f(p.y)}L${f(q.x)} ${f(q.y)}L${f(q.x+.12)} ${f(q.y+.37)}L${f(p.x+.12)} ${f(p.y+.37)}Z`;
  for(let j=0;j<count;j++){const n=terrainRandom(Math.round(p.x*19)+j,Math.round(p.y*23),2581);if(n<.18)continue;const t=(j+.2+n*.6)/count,x=p.x+(q.x-p.x)*t-p.nx*.09,y=p.y+(q.y-p.y)*t-p.ny*.09,h=.42+n*.78,lean=(n-.5)*.32,w=.045+n*.05;
   blades[n>.6?1:0]+=`M${f(x)} ${f(y)}q${f(lean*.3)} ${f(-h*.55)} ${f(lean)} ${f(-h)}`;
   if(n>.35&&p.ny<.3)tips[n>.7?1:0]+=`M${f(x-w)} ${f(y)}Q${f(x)} ${f(y-h*.4)} ${f(x+lean)} ${f(y-h)}Q${f(x+w)} ${f(y-h*.35)} ${f(x+w)} ${f(y)}Z`;
  }
 }return {shade,blades,tips};
}
export function bedEdgeNodes(d){const g=bedEdgeGeometry(d),node=(attrs)=>{const n=document.createElementNS(NS,'path');for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);return n};return [node({d:g.shade,fill:'#293b1e',opacity:.32,'data-bed-recess':'true'}),...g.tips.map((d,i)=>node({d,fill:i?'#3e8d29':'#267c25','data-bed-grass':'true'})),...g.blades.map((d,i)=>node({d,fill:'none',stroke:i?'#469b32':'#277b27','stroke-width':.105,'stroke-linecap':'round','data-bed-grass':'true'}))]}
