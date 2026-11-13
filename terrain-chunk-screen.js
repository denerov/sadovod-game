// The approved SVG remains the authoring source, but never participates in
// camera motion after this cache is ready. It is rasterised once into small,
// immutable world-space chunks; zoom and pan only redraw those bitmaps.
const svg=document.querySelector('.plot');
const canvas=document.querySelector('.terrain-chunk-screen');
const ctx=canvas?.getContext('2d',{alpha:true,desynchronized:true});
const TILE=192,RASTER_SCALE=2,MAX_PARALLEL=3;
let view=window.SadovodCameraView||null,revision=0,frame=0,building=false,pendingRebuild=false;
let tiles=new Map(),sourceRoot=null;

const key=(x,y)=>x+','+y;
const absoluteImages=node=>{
 for(const image of node.querySelectorAll('image')){
  const href=image.getAttribute('href')||image.getAttributeNS('http://www.w3.org/1999/xlink','href');
  if(href&&!href.startsWith('data:')&&!href.startsWith('blob:')&&!href.startsWith('#'))image.setAttribute('href',new URL(href,location.href).href);
 }
};
const bitmap=async(blob,width,height)=>{
 if('createImageBitmap'in window)try{return await createImageBitmap(blob)}catch{}
 const url=URL.createObjectURL(blob),image=new Image();image.decoding='async';image.src=url;await image.decode();
 const buffer=document.createElement('canvas');buffer.width=width;buffer.height=height;buffer.getContext('2d').drawImage(image,0,0,width,height);URL.revokeObjectURL(url);
 return buffer;
};
function bounds(root){
 const b=root.getBBox(),left=Math.floor((b.x-18)/TILE)*TILE,top=Math.floor((b.y-18)/TILE)*TILE;
 return {left,top,right:Math.ceil((b.x+b.width+18)/TILE)*TILE,bottom:Math.ceil((b.y+b.height+18)/TILE)*TILE};
}
function sourceMarkup(root,x,y){
 const defs=[...svg.querySelectorAll(':scope > defs')].map(n=>n.cloneNode(true));
 const landscape=root.cloneNode(true);
 landscape.style.visibility='';
 landscape.querySelector('[data-landscape-layer="ObjectContact"]')?.remove();
 landscape.querySelectorAll('[data-lod]').forEach(n=>n.style.display='');
 for(const node of [...defs,landscape])absoluteImages(node);
 const width=TILE*RASTER_SCALE,height=TILE*RASTER_SCALE;
 return {width,height,text:`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${x} ${y} ${TILE} ${TILE}" preserveAspectRatio="none">${defs.map(n=>n.outerHTML).join('')}${landscape.outerHTML}</svg>`};
}
async function makeTile(root,x,y,generation){
 const {width,height,text}=sourceMarkup(root,x,y),blob=new Blob([text],{type:'image/svg+xml'}),image=await bitmap(blob,width,height);
 if(generation!==revision){image.close?.();return null}
 return {x,y,image};
}
async function bake(){
 if(building){pendingRebuild=true;return}const root=svg.querySelector('[data-terrain-engine]');if(!root)return;
 building=true;const generation=++revision,box=bounds(root),jobs=[];
 for(let y=box.top;y<box.bottom;y+=TILE)for(let x=box.left;x<box.right;x+=TILE)jobs.push([x,y]);
 const next=new Map();let cursor=0;
 const worker=async()=>{while(cursor<jobs.length){const [x,y]=jobs[cursor++],tile=await makeTile(root,x,y,generation);if(tile)next.set(key(x,y),tile);draw()}};
 try{
  await Promise.all(Array.from({length:Math.min(MAX_PARALLEL,jobs.length)},worker));
  if(generation!==revision)return;
  for(const tile of tiles.values())tile.image.close?.();tiles=next;sourceRoot=root;root.style.visibility='hidden';
  document.documentElement.dataset.terrainRenderer='chunks';draw();
 }catch(error){console.error('Terrain chunk cache',error);root.style.visibility='';}
 finally{if(generation===revision){building=false;if(pendingRebuild){pendingRebuild=false;bake()}}}
}
function resize(){
 if(!view||!canvas)return false;const dpr=Math.min(devicePixelRatio||1,2),w=Math.max(1,Math.round(view.width*dpr)),h=Math.max(1,Math.round(view.height*dpr));
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}return dpr;
}
function paint(){
 frame=0;if(!ctx||!view||!tiles.size)return;const dpr=resize();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.setTransform(view.scale*dpr,0,0,view.scale*dpr,view.x*dpr,view.y*dpr);
 const left=-view.x/view.scale,top=-view.y/view.scale,right=(view.width-view.x)/view.scale,bottom=(view.height-view.y)/view.scale;
 for(const tile of tiles.values())if(tile.x+TILE>=left&&tile.x<=right&&tile.y+TILE>=top&&tile.y<=bottom)ctx.drawImage(tile.image,tile.x,tile.y,TILE,TILE);
}
function draw(){if(!frame)frame=requestAnimationFrame(paint)}
window.addEventListener('sadovod:camera-frame',event=>{view=event.detail;draw()});
window.addEventListener('resize',draw);
let rebuildTimer=0;
// Keep drawing the previous complete generation while the changed landscape
// is baked. Swap all chunks atomically; never expose a half-built map.
const rebuild=()=>{clearTimeout(rebuildTimer);rebuildTimer=setTimeout(bake,80)};
window.addEventListener('sadovod:terrain-ready',()=>setTimeout(bake,0),{once:true});
window.addEventListener('sadovod:terrain-material-ready',rebuild);
