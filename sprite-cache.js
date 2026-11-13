// A sprite is exposed to the scene only after its bytes have been decoded.
const entries=new Map();let active=0;const waiting=[];
async function slot(){if(active>=4)await new Promise(resolve=>waiting.push(resolve));else active++;}
function release(){const next=waiting.shift();if(next)next();else active--;}

export function readySprite(src){return entries.get(src)?.value||null}
export function loadSprite(src){
 if(src.includes('#xywh='))return loadAtlasSprite(src);
 const old=entries.get(src);if(old?.value)return Promise.resolve(old.value);if(old?.promise)return old.promise;if(old?.retryAt>Date.now())return Promise.reject(Error('Sprite retry pending'));
 const entry={};entries.set(src,entry);
 entry.promise=(async()=>{
  for(let attempt=0;attempt<3;attempt++){
   let timer,error;await slot();
   try{
    // Ordinary same-origin sprites stay on their real URL. Creating a Blob URL
    // for every placed asset duplicates browser cache ownership and prevented
    // decoded frames from being reclaimed on large farms.
    const work=(async()=>{const image=new Image();image.decoding='async';image.src=attempt?src+(src.includes('?')?'&':'?')+'retry='+attempt:src;await image.decode();return {src:image.currentSrc||image.src,image,width:image.naturalWidth,height:image.naturalHeight};})();
    entry.value=await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Sprite timeout')),12000)})]);return entry.value;
   }catch(e){error=e;if(attempt===2){entry.retryAt=Date.now()+30000;throw e;}}
   finally{clearTimeout(timer);release();}
   if(error)await new Promise(resolve=>setTimeout(resolve,500*2**attempt));
  }
 })().finally(()=>{entry.promise=null});return entry.promise;
}

async function loadAtlasSprite(src){
 const old=entries.get(src);if(old?.value)return old.value;if(old?.promise)return old.promise;
 const entry={};entries.set(src,entry);entry.promise=(async()=>{
  const [base,part]=src.split('#xywh='),[x,y,w,h]=part.split(',').map(Number);
  if(![x,y,w,h].every(Number.isFinite)||w<=0||h<=0)throw Error('Invalid sprite region');
  const sheet=await loadSprite(base),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  canvas.getContext('2d').drawImage(sheet.image,x,y,w,h,0,0,w,h);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Sprite extraction failed');
  const url=URL.createObjectURL(blob),image=new Image();image.src=url;await image.decode();
  return entry.value={src:url,image,width:w,height:h};
 })().catch(error=>{entries.delete(src);throw error}).finally(()=>{entry.promise=null});return entry.promise;
}
