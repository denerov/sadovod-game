import {CROP_STAGES} from './crop-stages-v165.js?v=295';
import {sproutAnchors} from './sprout-layout.js?v=182';
const NS='http://www.w3.org/2000/svg';
const node=(tag,attrs)=>{const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));return e;};
export const cropStage=p=>p>=1?3:p>=.35?2:p>=.08?1:0;
export function renderCropStages(g,type,stage,c,r){
 const frames=CROP_STAGES[type];let group=g.querySelector('[data-growth-v165]');
 if(!frames){if(group)group.style.display='none';return null;}
 if(!group){group=node('g',{'data-growth-v165':'','pointer-events':'none'});g.append(group);}
 group.style.display='';
 const art=frames[stage],heights={carrot:[4,8,12,16],corn:[5,12,24,30],pumpkin:[4,7,10,13],clover:[3,5,7,9],cucumber:[4,9,14,18]}[type];
 const height=heights[stage],width=Math.min(type==='pumpkin'?19:18,height*art.width/art.height);
 group.replaceChildren();let top=Infinity;
 for(const a of sproutAnchors(c,r)){const h=width*art.height/art.width,y=a.y-h;top=Math.min(top,y);group.append(node('image',{href:art.src,x:a.x-width/2,y,width,height:h,preserveAspectRatio:'xMidYMax meet','pointer-events':'none'}));}
 return top;
}
