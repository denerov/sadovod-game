// Shared material assembled once. Overlapping translated samples eliminate
// mirrored motifs; synthesis is independent of the map and camera.
const cache=new Map();
// Calm water has only low-contrast, periodic colour variation. Shore depth is
// supplied by its real coverage contour, never baked into rectangular tiles.
export function waterMaterial(){
 if(cache.has('water-254'))return cache.get('water-254');
 const promise=Promise.resolve().then(()=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(512,512);
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
   const a=x/512*Math.PI*2,b=y/512*Math.PI*2;
   const n=Math.sin(a+Math.sin(b)*.6)*1.5+Math.cos(2*b-a)*1.1+Math.sin(3*a+2*b)*.45,i=(y*512+x)*4;
   pixels.data[i]=5+n*.45;pixels.data[i+1]=155+n*.85;pixels.data[i+2]=204+n*.9;pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  // Very sparse short surface glints; no large waves or sine stripes.
  let seed=254;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  ctx.strokeStyle='rgba(206,240,235,.035)';ctx.lineWidth=.65;
  for(let i=0;i<35;i++){const x=rand()*480+16,y=rand()*512,w=5+rand()*18;ctx.beginPath();ctx.moveTo(x-w/2,y);ctx.quadraticCurveTo(x,y-.8,x+w/2,y);ctx.stroke()}
  return canvas.toDataURL('image/png');
 });cache.set('water-254',promise);return promise;
}
// Raster blades are drawn once into a shared material. They are fine upright
// strokes, rather than magnified clumps from a small illustrative crop.
export function lawnMaterial(){
 if(cache.has('lawn-248'))return cache.get('lawn-248');
 const promise=Promise.resolve().then(()=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=768;
  const ctx=canvas.getContext('2d'),size=768;let seed=0x5ad0248;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  const pixels=ctx.createImageData(size,size);
  for(let i=0;i<size*size;i++){const q=(rand()-.5)*7;pixels.data[i*4]=35+q;pixels.data[i*4+1]=139+q;pixels.data[i*4+2]=35+q*.7;pixels.data[i*4+3]=255}ctx.putImageData(pixels,0,0);
  ctx.lineCap='round';
  for(let i=0;i<44000;i++){
   const x=rand()*size,y=rand()*size,h=5+rand()*10,lean=(rand()-.5)*1.5,n=rand();
   ctx.strokeStyle=n<.4?'rgba(17,99,26,.48)':n<.84?'rgba(68,165,43,.56)':'rgba(96,176,49,.43)';ctx.lineWidth=.9+rand()*.65;
   // Draw wrapped copies only at the tile border to keep the repeat continuous.
   for(const dy of [0,size]){if(dy&&y>h)continue;ctx.beginPath();ctx.moveTo(x,y+dy);ctx.quadraticCurveTo(x+lean*.2,y+dy-h*.5,x+lean,y+dy-h);ctx.stroke()}
  }
  return canvas.toDataURL('image/png');
 });cache.set('lawn-248',promise);return promise;
}
export function terrainMaterial(src,patchSize=96,sampleHeight=1){
 const key=src+':'+patchSize+':'+sampleHeight;if(cache.has(key))return cache.get(key);
 const promise=(async()=>{
  const image=new Image();image.src=src;await image.decode();
  const source=document.createElement('canvas');source.width=image.naturalWidth;source.height=image.naturalHeight;
  const sc=source.getContext('2d',{willReadFrequently:true});sc.drawImage(image,0,0);const pixels=sc.getImageData(0,0,source.width,source.height).data;
  const step=Math.round(patchSize*2/3),count=6,size=step*count,weight=new Float32Array(size*size),rgb=new Float32Array(size*size*3);
  let seed=247;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  for(let row=0;row<count;row++)for(let col=0;col<count;col++){
   const ox=Math.floor(rand()*(source.width-patchSize)),oy=Math.floor(rand()*(Math.floor(source.height*sampleHeight)-patchSize));
   for(let y=0;y<patchSize;y++)for(let x=0;x<patchSize;x++){
    const w=Math.sin(Math.PI*(x+.5)/patchSize)**2*Math.sin(Math.PI*(y+.5)/patchSize)**2;
    const dst=((row*step+y)%size)*size+(col*step+x)%size,src=((oy+y)*source.width+ox+x)*4;
    weight[dst]+=w;for(let k=0;k<3;k++)rgb[dst*3+k]+=pixels[src+k]*w;
   }
  }
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d'),out=ctx.createImageData(size,size);
  for(let i=0;i<weight.length;i++){for(let k=0;k<3;k++)out.data[i*4+k]=rgb[i*3+k]/weight[i];out.data[i*4+3]=255}ctx.putImageData(out,0,0);
  return canvas.toDataURL('image/png');
 })();cache.set(key,promise);return promise;
}
