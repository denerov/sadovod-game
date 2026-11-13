// Shadows are baked once per pose, rather than filtering a live animated SVG tree.
export class PoseShadow {
 constructor(element){this.element=element;this.cache=new Map();this.key=null}
 prepare(source,frame,flipped=false){
  if(!source)return;
  const key=[source.src,frame.left,frame.top,frame.width,frame.height,frame.anchorX,frame.anchorY,frame.scale,flipped].join('|');
  let pose=this.cache.get(key);
  if(!pose){
   const scale=.0672*frame.scale,density=3,pad=3;
   const anchor=flipped?frame.width-frame.anchorX:frame.anchorX;
   const project=(x,y)=>{x=(x-anchor)*scale;y=(y-frame.anchorY)*scale;return [x-.32*y,.12*x-.20*y]};
   const corners=[[0,0],[frame.width,0],[0,frame.height],[frame.width,frame.height]].map(p=>project(...p));
   const left=Math.min(...corners.map(p=>p[0]))-pad,top=Math.min(...corners.map(p=>p[1]))-pad;
   const width=Math.max(...corners.map(p=>p[0]))+pad-left,height=Math.max(...corners.map(p=>p[1]))+pad-top;
   const raw=document.createElement('canvas');raw.width=Math.ceil(width*density);raw.height=Math.ceil(height*density);
   const c=raw.getContext('2d');c.scale(density,density);c.translate(-left,-top);c.transform(1,.12,-.32,-.20,0,0);c.scale(scale,scale);c.translate(-anchor,-frame.anchorY);
   if(flipped){c.translate(frame.width,0);c.scale(-1,1)}
   c.drawImage(source,frame.left,frame.top,frame.width,frame.height,0,0,frame.width,frame.height);
   c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='source-in';c.fillStyle='rgba(14,30,15,.27)';c.fillRect(0,0,raw.width,raw.height);
   const output=document.createElement('canvas');output.width=raw.width;output.height=raw.height;
   const out=output.getContext('2d');out.filter=`blur(${density*.8}px)`;out.drawImage(raw,0,0);
   pose={url:output.toDataURL('image/png'),left,top,width,height};this.cache.set(key,pose);
   if(this.cache.size>64)this.cache.delete(this.cache.keys().next().value);
   raw.width=raw.height=output.width=output.height=1;
  }
  return {...pose,key};
 }
 render(source,frame,position,flipped=false){
  const pose=this.prepare(source,frame,flipped);if(!pose)return;const key=pose.key;
  if(key!==this.key){this.element.setAttribute('href',pose.url);this.element.setAttribute('width',pose.width);this.element.setAttribute('height',pose.height);this.key=key}
  this.element.setAttribute('x',position.x+pose.left);this.element.setAttribute('y',position.y+pose.top);
 }
}
