// Small water-only overlay. No repeated moving texture, full-map redraw or per-frame allocation.
const noise=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
export class WaterMotion {
 constructor(ground){this.canvas=document.createElement('canvas');this.canvas.className='water-motion';this.canvas.setAttribute('aria-hidden','true');ground.after(this.canvas);this.mask=document.createElement('canvas');this.raf=0;this.last=0;
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(this.raf);this.raf=0}else this.start()});
 }
 update(view,painter){this.view=view;const points=painter.shore.flat();
  if(!points.length){this.canvas.hidden=true;cancelAnimationFrame(this.raf);this.raf=0;return}
  const xs=points.map(p=>p.x*view.scale+view.x),ys=points.map(p=>p.y*view.scale+view.y);
  const left=Math.max(0,Math.floor(Math.min(...xs))),top=Math.max(0,Math.floor(Math.min(...ys))),right=Math.min(view.width,Math.ceil(Math.max(...xs))),bottom=Math.min(view.height,Math.ceil(Math.max(...ys)));
  this.canvas.hidden=right<=left||bottom<=top;if(this.canvas.hidden){cancelAnimationFrame(this.raf);this.raf=0;return}
  this.dpr=Math.min(view.dpr,matchMedia('(pointer:coarse)').matches?1:2);this.left=left;this.top=top;const w=Math.max(1,Math.ceil((right-left)*this.dpr/128)*128),h=Math.max(1,Math.ceil((bottom-top)*this.dpr/128)*128);
  for(const c of [this.canvas,this.mask])if(c.width!==w||c.height!==h){c.width=w;c.height=h}
  Object.assign(this.canvas.style,{left:left+'px',top:top+'px',width:w/this.dpr+'px',height:h/this.dpr+'px'});
  const ctx=this.mask.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  if(this.geometry!==painter.waterD){this.geometry=painter.waterD;this.events=[];
   // Stable random sites; clip rings at islands and land, never animate across the bank.
   for(let i=0;i<280;i++){const x=noise(i*3+1)*1536-384,y=noise(i*3+2)*768;if(ctx.isPointInPath(painter.waterPath,x,y,'evenodd'))this.events.push({x,y,phase:noise(i*3+3)*18,period:12+noise(i+7)*8,radius:5+noise(i+11)*7,bubble:noise(i+19)>.48})}
  }
  ctx.setTransform(view.scale*this.dpr,0,0,view.scale*this.dpr,(view.x-left)*this.dpr,(view.y-top)*this.dpr);
  ctx.fillStyle='#fff';ctx.fill(painter.waterPath,'evenodd');ctx.globalCompositeOperation='destination-out';ctx.strokeStyle='#000';ctx.lineWidth=5;ctx.stroke(painter.waterPath);
  this.draw(performance.now());this.start();
 }
 start(){if(!this.raf&&!this.canvas.hidden&&!document.hidden)this.raf=requestAnimationFrame(t=>this.tick(t))}
 tick(t){this.raf=0;if(document.hidden||this.canvas.hidden)return;if(this.canvas.style.visibility==='hidden'||document.querySelector('dialog[open]')){this.start();return;}if(t-this.last>=1000/(matchMedia('(pointer:coarse)').matches?20:30)){this.draw(t);this.last=t}this.start()}
 draw(t){if(!this.events)return;const ctx=this.canvas.getContext('2d'),v=this.view,d=this.dpr,time=t/1000;
  ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
  ctx.setTransform(v.scale*d,0,0,v.scale*d,(v.x-this.left)*d,(v.y-this.top)*d);
  // Soft short wavelets drift continuously; rings and bubbles remain separate events.
  for(const e of this.events){const phase=(time*.14+e.phase*.13)%1,fade=Math.sin(phase*Math.PI),x=e.x+Math.sin(time*.32+e.phase)*3,y=e.y+Math.cos(time*.27+e.phase)*1.1;
   ctx.globalAlpha=.09*fade;ctx.strokeStyle='#a6e3e8';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(x-6,y);ctx.bezierCurveTo(x-2,y-1.8,x+1,y+1.5,x+7,y-.8);ctx.stroke();
   ctx.globalAlpha=.045*fade;ctx.strokeStyle='#086f9a';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(x-5,y+1.1);ctx.bezierCurveTo(x-1,y-.5,x+2,y+2.4,x+7,y+.1);ctx.stroke();
  }
  for(const e of this.events){const age=(time+e.phase)%e.period;if(age>5.5)continue;
   if(e.bubble&&age<1.2){const a=Math.sin(age/1.2*Math.PI),r=.45+age*.65;ctx.globalAlpha=a*.65;ctx.lineWidth=.32;ctx.strokeStyle='#c8f5ed';ctx.beginPath();ctx.ellipse(e.x,e.y-age*.45,r,r*.68,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#e2fff8';ctx.beginPath();ctx.ellipse(e.x-r*.25,e.y-age*.45-r*.3,.28,.18,0,0,Math.PI*2);ctx.fill()}
   for(let ring=0;ring<3;ring++){const progress=(age-ring*.48)/4.1;if(progress<=0||progress>=1)continue;const radius=1+e.radius*progress,alpha=Math.sin(Math.PI*progress)*Math.pow(1-progress,.7)*.28;ctx.lineWidth=.3;ctx.globalAlpha=alpha;ctx.strokeStyle='#b5e9e6';ctx.beginPath();ctx.ellipse(e.x,e.y,radius,radius*.46,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=alpha*.45;ctx.strokeStyle='#08789d';ctx.beginPath();ctx.ellipse(e.x,e.y+.45,radius,radius*.46,0,.1,Math.PI-.1);ctx.stroke()}
  }
  ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='destination-in';ctx.drawImage(this.mask,0,0);ctx.globalCompositeOperation='source-over';this.canvas.dataset.frame=String((Number(this.canvas.dataset.frame)||0)+1);
 }
}
