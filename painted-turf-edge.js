import {shoreSections} from './shore-geometry.js?v=182';
const NS='http://www.w3.org/2000/svg',SIZE=96,SCALE=5;
let material;
function loadMaterial(){
 return material??=(async()=>{
  const image=new Image();image.src='https://sadovod-webgl-engine-test.ddenerov.chatgpt.site/assets/terrain-v252/grass-cut.png';await image.decode();
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
  const rgba=ctx.getImageData(0,0,image.width,image.height).data,edge=[];
  for(let x=0;x<image.width;x++){let y=image.height-1;while(y>0&&rgba[(y*image.width+x)*4+3]<180)y--;edge.push(y)}
  return {image,edge};
 })();
}
// Cache small raster sectors rather than mounting a sprite for every blade.
// World-space sectors remain unchanged during camera movement and are replaced
// only when a contour crossing that sector changes.
export class PaintedTurfEdge{
 constructor(){this.node=document.createElementNS(NS,'g');this.node.dataset.paintedTurf='true';this.tiles=new Map();this.signature='';loadMaterial().then(m=>{this.material=m;this.update(this.pending||'',this.pendingOptions)}).catch(e=>console.error('Turf edge material',e))}
 update(d,options={}){
  this.pending=d;this.pendingOptions=options;const signature=d+'|'+(options.key||'')+'|'+!!options.front+'|'+(options.soil!==false);if(!this.material||signature===this.signature)return;this.signature=signature;
  const sectors=new Map(),{image,edge}=this.material;
  for(const loop of shoreSections(d))for(let i=0;i<loop.length-1;i++){
   const p=loop[i],q=loop[i+1],length=Math.hypot(q.x-p.x,q.y-p.y);if(length<.001||options.accept&&!options.accept({x:(p.x+q.x)/2,y:(p.y+q.y)/2,nx:(p.nx+q.nx)/2,ny:(p.ny+q.ny)/2}))continue;
   const segment={p,q,length};
   for(let y=Math.floor((Math.min(p.y,q.y)-5)/SIZE);y<=Math.floor((Math.max(p.y,q.y)+5)/SIZE);y++)for(let x=Math.floor((Math.min(p.x,q.x)-5)/SIZE);x<=Math.floor((Math.max(p.x,q.x)+5)/SIZE);x++){
    const key=x+','+y;if(!sectors.has(key))sectors.set(key,{x,y,segments:[]});sectors.get(key).segments.push(segment);
   }
  }
  for(const [key,tile]of this.tiles)if(!sectors.has(key)){tile.node.remove();this.tiles.delete(key)}
  let changed=0;
  for(const [key,{x,y,segments}]of sectors){
   // A changed loop can choose a different starting vertex. Sector identity
   // must depend on its geometry, not on the traversal's starting point.
   segments.sort((a,b)=>a.p.x-b.p.x||a.p.y-b.p.y||a.q.x-b.q.x||a.q.y-b.q.y);
   const signature=!!options.front+'|'+(options.soil!==false)+'|'+segments.map(s=>[s.p.x,s.p.y,s.q.x,s.q.y].map(v=>v.toFixed(3)).join(',')).join(';');let tile=this.tiles.get(key);if(tile?.signature===signature)continue;
   const canvas=document.createElement('canvas');canvas.width=canvas.height=SIZE*SCALE;const ctx=canvas.getContext('2d');
   ctx.scale(SCALE,SCALE);ctx.translate(-x*SIZE,-y*SIZE);
   for(const {p,q,length}of segments){
    const tx=(q.x-p.x)/length,ty=(q.y-p.y)/length,ny=tx;
    // Visible cut faces sit behind the exposed soil. Keep sprite blades screen
    // upright instead of rotating them into the tangent around every corner.
    // The other sides retain the upright batched vegetation in PathSurface.
    const face=options.front?Math.abs(ny):ny;if(face<=.12)continue;
    // Use short authored strips at a fixed texture scale. The outer transparent
    // pixels expose earth; the inner edge blends into the grass material.
    const scale=52/768,sourceWidth=Math.ceil((length+.16)/scale),available=Math.max(1,image.width-sourceWidth-1);
    const sourceX=((Math.round((p.x*3.7+p.y*2.1)/scale)%available)+available)%available,sourceY=edge[sourceX];
    ctx.save();ctx.globalAlpha=Math.min(1,(face-.12)*3);ctx.transform(tx,ty,0,1,p.x,p.y);
    const cropHeight=options.soil===false?17:37,top=options.soil===false?-17:-23;ctx.drawImage(image,sourceX,sourceY-23,sourceWidth,cropHeight,-.08,top*scale,length+.16,cropHeight*scale);
    ctx.restore();
   }
   if(!tile){const n=document.createElementNS(NS,'image');for(const [k,v]of Object.entries({x:x*SIZE,y:y*SIZE,width:SIZE,height:SIZE,preserveAspectRatio:'none'}))n.setAttribute(k,v);this.node.append(n);tile={node:n};this.tiles.set(key,tile)}
   tile.signature=signature;tile.node.setAttribute('href',canvas.toDataURL('image/png'));changed++;
  }
  this.node.dataset.rebuiltSectors=changed;this.node.dataset.sectors=this.tiles.size;
  window.dispatchEvent(new Event('sadovod:terrain-material-ready'));
 }
}
