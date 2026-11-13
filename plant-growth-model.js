import {RESTORED} from './legacy-data.js?v=282';
export const GROWING_PLANTS=new Set(['gooseberry','strawberry','wild_strawberry','red_currant','black_currant','orange_tree','stakhanov_chestnut','autumn_maple','autumn_birch','autumn_oak','autumn_rowan','raspberry']);
// These park plants have no approved production recipe. One hour is solely
// their visual establishment time; it grants no goods, currency or XP.
export const ESTABLISHMENT_MS=3600000;
export function initialisePlant(o,now=Date.now(),existing=false){
 if(!GROWING_PLANTS.has(o.type)||o.plantGrowth)return false;
 o.plantGrowth={plantedAt:now,duration:RESTORED[o.type]?.recipe?.duration||ESTABLISHMENT_MS,established:existing};return true;
}
export function plantStage(o,job,now=Date.now()){
 if(!GROWING_PLANTS.has(o.type))return null;
 const g=o.plantGrowth,elapsed=g&&Number.isFinite(g.plantedAt)?Math.max(0,now-g.plantedAt):Infinity,duration=Math.max(1,g?.duration||ESTABLISHMENT_MS);
 if(g&&!g.established&&elapsed<duration){const p=elapsed/duration;return p<.25?0:p<.6?1:2;}
 const recipe=RESTORED[o.type]?.recipe;
 if(recipe)return job?.remaining===0?3:2;
 return 3;
}
