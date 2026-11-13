import {PRODUCTION_PRICES} from './balance-v141.js?v=209';
import {restoredTypes} from './chain-model.js?v=210';
import {EXTRA_CROPS,RESTORED} from './legacy-data.js?v=282';
import {MAX_CELLS} from './land-model.js?v=182';
// Approved Sadovod-economy-v1, 03 October 2026.
export const WITHDRAWN_PRODUCTS=new Set(['lavender_distillery','cannery']);
export const FUEL={name:'Топливо',cost:40,amount:100};
export const MILL={name:'Пшеничная фабрика',cost:1500,minutes:12,input:4,yield:2,sale:PRODUCTION_PRICES.flour,level:7};
export const UNLOCKS={donbas_bee:8,...Object.fromEntries(Object.entries({...restoredTypes,...EXTRA_CROPS}).map(([k,v])=>[k,v.level])),'wheat-mill':MILL.level,duck:3,swan:6,clover:3,'dairy-cow':4,'dairy-factory':6,'ketchup-factory':5,vineyard:9,winery:10,orchard:14,wheat:1,tomato:2,sunflower:4,lavender:6,apple:3,mandarin:5,cherry:6,apricot:8,peach:10,pear:12,'sweet-cherry':14,linden:16,'white-hen':3,'red-hen':5,tractor:8,seeder:10,combine:12};
// A production unlock cannot precede its earliest obtainable ingredient.
const sourceLevels=()=>{const levels={hayFeed:1,syrup:1,fuel:1,milk:UNLOCKS['dairy-cow'],grape:UNLOCKS.vineyard,flour:UNLOCKS['wheat-mill'],egg:UNLOCKS['white-hen']};for(const id of [...Object.keys(EXTRA_CROPS),'wheat','tomato','sunflower','lavender','apple','mandarin','cherry','apricot','peach','pear','sweet-cherry','linden'])levels[id]=UNLOCKS[id]||1;for(const[id,d]of Object.entries(RESTORED)){const out=d.recipe?.output;if(out)levels[out]=Math.min(levels[out]??Infinity,UNLOCKS[id]||1)}return levels;};
for(let pass=0;pass<Object.keys(RESTORED).length;pass++){let changed=false;const levels=sourceLevels();for(const[id,d]of Object.entries(RESTORED)){const required=Math.max(UNLOCKS[id]||1,...Object.keys(d.recipe?.input||{}).map(k=>levels[k]||1));if(required!==(UNLOCKS[id]||1)){UNLOCKS[id]=required;changed=true}}if(!changed)break;}
export const TREE_XP={apple:5,mandarin:6,cherry:7,apricot:8,peach:9,pear:10,'sweet-cherry':11,linden:12};
export const xpForNext=level=>level>=200?0:Math.round(20+15*(level-1)+3*(level-1)**1.4);
export function progression(xp=0){let level=1,base=0;while(level<200&&xp>=base+xpForNext(level)){base+=xpForNext(level);level++;}const next=xpForNext(level);return {level,base,next,percent:next?Math.min(100,Math.floor((xp-base)/next*100)):100};}
// Purchased land is the only bed limit. Player level no longer caps fields.
export const bedLimit=()=>MAX_CELLS;
export const henLimit=level=>level>=20?16:level>=5?8:level>=3?4:0;
export function purchaseBlock(type,xp,objects=[]){if(WITHDRAWN_PRODUCTS.has(type))return 'Снято с продажи';const level=progression(xp).level,required=UNLOCKS[type]||1;if(level<required)return `Откроется на уровне ${required}`;if(type==='wheat-mill'&&objects.filter(o=>o.type===type).length>=(level>=20?2:1))return `Лимит фабрик: ${level>=20?2:1}`;if(['white-hen','red-hen'].includes(type)&&objects.filter(o=>['white-hen','red-hen'].includes(o.type)).length>=henLimit(level))return `Лимит куриц: ${henLimit(level)}. Следующее увеличение — ${level<5?'на уровне 5':level<20?'на уровне 20':'достигнут максимум'}`;return '';}
