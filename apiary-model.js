export const BEE={name:'Донбасская пчела',cost:100,level:8,icon:'./assets/animals-v158/donbas_bee-0.webp',description:'Живёт в пасеке и производит мёд. После покупки ждёт заселения.'};
export const APIARY_CAPACITY=10;
// Living flowering crops, not harvested inventory. Mature flowers remain a
// nectar source until the player harvests them. Nectar never removes the crop.
export const NECTAR_CROPS={sunflower:30,lavender:45,clover:10};
export function nectarBeds(s){return Object.entries(s.cells||{}).filter(([,c])=>Object.hasOwn(NECTAR_CROPS,c.cropId)&&s.clock-c.plantedAt>=(c.cycle?.minutes??NECTAR_CROPS[c.cropId])*60000*.35).map(([id])=>id);}
const count=v=>Number.isSafeInteger(v)&&v>=0?v:0;
export function restoreApiaries(saved={}){return {apiaryVersion:saved.apiaryVersion===1?1:0,apiaries:Object.fromEntries(Object.entries(saved.apiaries||{}).filter(([id])=>id!=='__proto__').map(([id,v])=>[id,{bees:Math.min(APIARY_CAPACITY,count(v?.bees))}]))};}
export function migrateApiaries(model,objects){const s=model.state;if(s.apiaryVersion===1)return false;for(const o of objects)if(o.type==='beehive'&&!Object.hasOwn(s.apiaries,o.id))s.apiaries[o.id]={bees:1};s.apiaryVersion=1;return true;}
export const beeCount=(s,id)=>s.apiaries[id]?.bees||0;
export function transferBees(model,o,delta){const s=model.state;if(o?.type!=='beehive'||o.stored||!Number.isSafeInteger(delta)||!delta||s.chains[o.id])return false;const n=beeCount(s,o.id),next=n+delta,available=s.stock.donbas_bee||0;if(next<0||next>APIARY_CAPACITY||delta>available)return false;s.apiaries[o.id]={bees:next};s.stock.donbas_bee=available-delta;return true;}
