import {plantStage,GROWING_PLANTS} from './plant-growth-model.js?v=264';
import {loadSprite} from './sprite-cache.js?v=214';
let catalog={};
const catalogReady=fetch('./assets/growth-v264/catalog.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json()}).then(data=>{catalog=data;window.dispatchEvent(new Event('sadovod:plant-art-ready'));return data});
export async function ensurePlantArt(type,rotation=0){if(!GROWING_PLANTS.has(type))return;await catalogReady;const frame=catalog[type]?.[0]?.[rotation];if(frame)await loadSprite(frame.src)}
window.SadovodPlantArt=Object.freeze({seedlingFrames:type=>catalog[type]?.[0]});
export function decoratePlant(group,o,box,state){
 if(!GROWING_PLANTS.has(o.type))return false;
 const stage=plantStage(o,state?.chains?.[o.id]),frame=catalog[o.type]?.[stage]?.[o.rotation];
 if(!frame)return false;
 const image=group.firstElementChild;group.hitFrame=frame;
 if(image.getAttribute('href')!==frame.src)image.setAttribute('href',frame.src);
 image.removeAttribute('transform');
 for(const k of ['x','y','width','height'])image.setAttribute(k,box[k]);
 group.querySelector('polygon')?.setAttribute('points',frame.hitPolygon.map(([x,y])=>`${box.x+x*box.scale},${box.y+y*box.scale}`).join(' '));
 group.dataset.plantStage=stage;group.artBox={x:box.pivotX,y:box.y+Math.min(...frame.hitPolygon.map(p=>p[1]))*box.scale};
 return true;
}
catalogReady.catch(e=>console.error('Plant catalogue',e));
window.addEventListener('sadovod:crops-changed',()=>window.dispatchEvent(new Event('sadovod:plant-growth-tick')));
