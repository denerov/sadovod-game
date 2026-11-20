import {TerrainPainter} from './terrain-painter.js?v=242';
const sources={grass:'grass-farmandia-v227.webp',road:'path-farmandia-v1.webp',water:'water-farmandia-v227.webp',stones:'pebbles-v60.webp',soil:'bed-221.webp'};
const load=async name=>{const image=new Image();image.decoding='async';image.src='./assets/surfaces/'+name;await image.decode();return image};
export function terrainPixelRatio(width,height,dpr=1,coarse=false){return width>0&&height>0?Math.min(dpr||1,3,Math.sqrt((coarse?5000000:6000000)/(width*height))):1}
export class TerrainRenderer{
 constructor(target){this.target=target;this.revision=0;this.frame=0;this.images={};this.loads=new Map()}
 ensure(key){if(!this.loads.has(key))this.loads.set(key,load(sources[key]).then(image=>{this.images[key]=image;return image}).catch(error=>{this.loads.delete(key);throw error}));return this.loads.get(key)}
 async update(cells){this.cells=[...cells];const generation=this.generation=(this.generation||0)+1;
  // First paint waits only for materials actually present, not every decoration.
  const needed=['grass'];if(cells.includes('path'))needed.push('road');if(cells.includes('water'))needed.push('water');if(cells.includes('bed'))needed.push('soil');
  try{await Promise.all(needed.map(key=>this.ensure(key)));if(generation!==this.generation)return;
   if(!this.painter){this.painter=new TerrainPainter(this.images,()=>this.target);this.waterMotion={canvas:{style:{}},update(){}}}
   this.painter.prepare(this.cells);this.queue();
  }catch(error){console.error('Terrain initialization failed',error);window.dispatchEvent(new CustomEvent('sadovod:action-error',{detail:{message:'Не удалось загрузить участок. Обновите страницу.'}}))}
 }
 decorations(){const keys=[];if(this.cells.includes('path')&&!this.images.stones)keys.push('stones');if(keys.length)Promise.all(keys.map(key=>this.ensure(key))).then(()=>this.queue()).catch(()=>{})}
 setView(view){if(!view.width||!view.height)return;
  if(this.view&&['width','height','x','y','scale','dpr'].every(key=>this.view[key]===view[key]))return;
  this.view=view;
  const old=this.committed;
  if(old&&old.width===view.width&&old.height===view.height&&old.dpr===view.dpr){
   const ratio=view.scale/old.scale;
   const x=view.x-(old.x+this.padding)*ratio,y=view.y-(old.y+this.padding)*ratio;
   this.target.style.transformOrigin='0 0';
   this.target.style.transform=`translate3d(${x}px,${y}px,0) scale(${ratio})`;
   // Transform the existing texture throughout the whole gesture. Repainting a
   // multi-megapixel terrain canvas every 20% zoom step made mobile Safari
   // pause and then jump. One final native-resolution paint happens on settle.
   if(this.waterMotion)this.waterMotion.canvas.style.visibility='hidden';
   clearTimeout(this.settle);
   const paintedWidth=(old.width+this.padding*2)*ratio,paintedHeight=(old.height+this.padding*2)*ratio;
   // Repaint a cheap draft before the transformed buffer reaches the viewport.
   // Otherwise a fast pan exposes the rectangular edge of the canvas.
   if(x>-24||y>-24||x+paintedWidth<view.width+24||y+paintedHeight<view.height+24)this.queue(false,true);
   this.settle=setTimeout(()=>this.queue(),140);return;
  }
  clearTimeout(this.settle);this.queue();
 }
 queue(immediate=false,moving=false){if(!this.painter||!this.cells||!this.view)return;if(this.frame){if(!immediate){if(!moving)this.pendingMoving=false;return;}cancelAnimationFrame(this.frame)}
  this.pendingMoving=moving;
  const paint=()=>{const moving=this.pendingMoving;this.frame=0;if(!moving)clearTimeout(this.settle);clearTimeout(this.motion);this.motion=0;
   const pad=this.padding=Math.round(Math.min(this.view.width,this.view.height)*(matchMedia('(pointer:coarse)').matches ? .38 : .5));
   const painted={...this.view,width:this.view.width+pad*2,height:this.view.height+pad*2,x:this.view.x+pad,y:this.view.y+pad};
   painted.dpr=terrainPixelRatio(painted.width,painted.height,this.view.dpr,matchMedia('(pointer:coarse)').matches);
   // Bounded draft during gestures; the settle timer restores full retina quality.
   if(moving)painted.dpr=Math.min(painted.dpr,1,Math.sqrt(1500000/(painted.width*painted.height)));
   const result=this.painter.draw(this.cells,painted);
   this.lastPaint=performance.now();
   this.target.style.width=painted.width+'px';this.target.style.height=painted.height+'px';
   this.waterMotion.canvas.style.visibility='';this.waterMotion.update(this.view,this.painter);this.committed=this.view;this.target.style.transform=`translate(${-pad}px,${-pad}px)`;Object.assign(this.target.dataset,{terrainRevision:String(++this.revision),renderMs:result.renderMs.toFixed(1),renderer:'canvas',pixelRatio:painted.dpr.toFixed(2)});
   window.dispatchEvent(new Event('sadovod:terrain-painted'));if(this.revision===1)window.dispatchEvent(new Event('sadovod:terrain-ready'));this.decorations();
  };if(immediate)paint();else this.frame=requestAnimationFrame(paint);
 }
}
