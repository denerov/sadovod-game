const NS='http://www.w3.org/2000/svg';
const node=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);return n};
const clamp=t=>Math.max(0,Math.min(1,t)),smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
export function createDigEffects(plot,image){
 const defs=node('defs'),mask=node('mask',{id:'shovel-ground-mask',maskUnits:'userSpaceOnUse',x:-10,y:-10,width:1700,height:1200}),white=node('rect',{x:-10,y:-10,width:1700,height:1200,fill:'white'}),cut=node('path',{fill:'black'});
 mask.append(white,cut);defs.append(mask);
 const turf=node('pattern',{id:'dig-turf',patternUnits:'userSpaceOnUse',width:160,height:160});turf.append(node('rect',{width:160,height:160,fill:'#278b32'}),node('image',{href:'https://sadovod-webgl-engine-test.ddenerov.chatgpt.site/assets/surfaces/grass-v44.webp',width:160,height:160,opacity:.65}));defs.append(turf);plot.append(defs);
 const lip=node('g',{'pointer-events':'none'}),crease=node('ellipse',{rx:2.4,ry:.55,fill:'#3d3920',opacity:.55}),cover=node('path',{fill:'url(#dig-turf)'});lip.append(crease,cover);plot.append(lip);
 const dust=node('g',{'pointer-events':'none','data-dig-soil':'true'});plot.append(dust);
 const particles=Array.from({length:36},(_,i)=>{const seed=((i*37)%17)/17,p=node('ellipse',{rx:.55+seed*.9,ry:.4+seed*.65,fill:['#57321a','#79502b','#95663b','#684020'][i%4]});dust.append(p);return p});
 let active=false;
 function clear(){if(active){image.removeAttribute('mask');dust.style.display=lip.style.display='none'}active=false}
 function update(state,frame,flipped,target){
  if(state.action!=='dig'||state.complete||!target){clear();return}
  const {phase,progress,position}=state,scale=.12*frame.scale,direction=flipped?-1:1;
  active=true;
  // Reveal the blade first, then bury its tip continuously behind an irregular turf lip.
  // The old phase-based rectangle removed blade and handle in a single jump.
  const penetration=progress<.38?smooth((progress-.12)/.26):1-smooth((progress-.38)/.12);
  if(phase<=3&&penetration>0){
   image.setAttribute('mask','url(#shovel-ground-mask)');
   const x=frame.left+frame.anchorX+25,y=frame.top+frame.anchorY+9-penetration*23,w=frame.width-frame.anchorX-25;
   cut.setAttribute('d',`M${x} ${y+2}q8 -3 15 -1t17 0l${Math.max(0,w-32)} 0v100h${-w}Z`);
   const centerX=position.x+direction*(25+w*.44)*scale,groundY=position.y+(9-penetration*23)*scale;
   const half=2.5+penetration*.5;crease.setAttribute('cx',centerX);crease.setAttribute('cy',groundY);lip.style.display='';
   cover.setAttribute('d',`M${centerX-half} ${groundY+.3}q1 -.6 2 -.1l.7 -.5 1 .4 1 -.3 .8 .5 .8 -.2v1.1h${-half*2.1}Z`);
   lip.setAttribute('opacity',penetration);
  }else{image.removeAttribute('mask');lip.style.display='none'}
  dust.style.display=progress>=.50&&progress<.98?'':'none';
  if(progress<.50||progress>=.98)return;
  const startX=position.x+direction*13,startY=position.y-19,endX=384+(target.column-target.row)*32,endY=(target.column+target.row+1)*16;
  particles.forEach((p,i)=>{const delay=i*.0035,t=clamp((progress-.62-delay)/.25),seed=((i*37)%17)/17;
   p.setAttribute('cx',startX+(endX-startX)*t+(seed-.5)*(4+9*t));p.setAttribute('cy',startY+(endY-startY)*t-5*Math.sin(Math.PI*t)+((i*13)%7-3)*(.45+t*.4));p.setAttribute('opacity',t>.9?(1-t)*10:1);
  });
 }
 dust.style.display=lip.style.display='none';return {update,clear};
}
