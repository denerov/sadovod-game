import {rakeStroke} from './path-progress.js?v=182';
const NS='http://www.w3.org/2000/svg';
const node=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n};
const rand=i=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x)};
const crops=[[64,92,437,368],[567,50,399,411],[1061,80,428,381],[78,541,424,406],[544,525,461,417],[1056,576,435,365]];
export function createRakeEffects(plot){
 const group=node('g',{'pointer-events':'none','data-rake-debris':'true'});group.style.display='none';plot.append(group);let loaded=false;
 // Fixed pool: reused sprites, no DOM creation or extra animation timer per stroke.
 const particles=Array.from({length:24},(_,i)=>{
  const g=node('g'),grass=i<16;let img=null;
  if(grass){const [x,y,w,h]=crops[i%6],size=4.8+rand(i)*3.2,clip=node('svg',{x:-size*.5,y:-size,width:size,height:size,viewBox:`${x} ${y} ${w} ${h}`,overflow:'hidden'});img=node('image',{width:1536,height:1024});clip.append(img);g.append(clip)}
  else g.append(node('ellipse',{rx:.45+rand(i)*.55,ry:.28+rand(i+2)*.35,fill:['#624020','#89623a','#a17b48'][i%3]}));
  group.append(g);return {g,img};
 });
 function warm(){if(loaded)return;const preload=new Image();preload.src='https://sadovod-webgl-engine-test.ddenerov.chatgpt.site/assets/surfaces/grass-tufts-v69.webp';particles.forEach(p=>p.img?.setAttribute('href',preload.src));loaded=true}
 window.addEventListener('sadovod:tool-selected',e=>{if(e.detail.action==='rake')warm()});
 function clear(){group.style.display='none'}
 function update(state){
  if(state.action!=='rake'||!state.working||state.complete){clear();return}
  if(!loaded)warm();
  const p=state.workProgress,dir=state.direction,axis=state.axis,cx=384+(state.column-state.row)*32,cy=(state.column+state.row+1)*16;
  group.style.display='';group.dataset.progress=p.toFixed(3);let visible=0;
  particles.forEach(({g},i)=>{
   const delay=.105+rand(i+17)*.065,stroke=p>=.5+delay?1:0,birth=stroke*.5+delay,t=(p-birth)/.40;
   if(t<0||t>1){g.style.display='none';return}g.style.display='';visible++;
   const cross=(rand(i+29)-.5)*.65,at=rakeStroke(birth).cleared,along=(at-.5)*Math.hypot(32,16);
   // Origins span the actual rake front in the cell's projected cross direction.
   const crossX=(axis.column?-32:32)*cross,crossY=16*cross;
   const spread=(rand(i+3)-.5)*(7+10*t),x=cx+dir.x*along+crossX-dir.x*t*(5+rand(i+5)*7)-dir.y*spread;
   const y=cy+dir.y*along+crossY-dir.y*t*(5+rand(i+5)*7)+dir.x*spread*.5-Math.sin(Math.PI*t)*(8+rand(i+11)*8);
   g.setAttribute('transform',`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${((rand(i)*70-35)+(rand(i+9)-.5)*230*t).toFixed(1)})`);g.setAttribute('opacity',Math.min(1,(1-t)*3).toFixed(2));
  });group.dataset.visible=String(visible);
 }
 return {update,clear};
}
