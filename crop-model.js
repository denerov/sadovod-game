import {MAX_GRID_SIZE,MAX_CELLS} from './land-model.js?v=182';
import {BEE,restoreApiaries,migrateApiaries,transferBees} from './apiary-model.js?v=210';
import {PRODUCTION_XP} from './balance-v141.js?v=209';
import {SALE_PRICES} from './trade-model.js?v=210';
import {EXTRA_CROPS,LEGACY_GOODS} from './legacy-data.js?v=282';
import {restoreChains,activateChain,advanceChains} from './chain-model.js?v=210';
import {cellIndex} from './land-model.js?v=182';
import {VINEYARD,WINE,restoreWine,activateWine,advanceWine} from './wine-model.js?v=182';
import {KETCHUP,restoreKetchup,activateKetchup,advanceKetchup} from './ketchup-model.js?v=209';
import {DAIRY_GOODS,restoreDairy,buyHay,activateDairy,advanceDairy} from './dairy-model.js?v=209';
import {restoreFactories,queueBatch,advanceFactories,collectFlour} from './factory-model.js?v=210';
import {restoreProgress,record,claimAchievement,claimDaily,refreshOrders,fulfillOrder} from './progress-model.js?v=210';
import {FUEL,MILL,progression,purchaseBlock} from './economy.js?v=210';
import {CHICKENS,EGG_PRICE} from './animal-model.js?v=182';
// Crop balance carried over from game-archive/dist/js/catalog.js.
export const CROPS={...EXTRA_CROPS,
 clover:{name:'Клевер',cost:8,minutes:10,yield:1,xp:4,sale:0,description:'Корм для коровы: после сбора пополняет запас кормового сена.'},
 wheat:{name:'Пшеница',cost:8,minutes:12,yield:2,xp:4,sale:6,description:'Золотистые колосья для муки и корма. Первый урожай вашей фермы.'},
 sunflower:{name:'Подсолнухи',cost:32,minutes:30,yield:2,xp:8,sale:19,description:'Солнечные цветы с крупными семечками. Основа для душистого масла.'},
 tomato:{name:'Помидоры',cost:20,minutes:18,yield:3,xp:6,sale:8,description:'Сочные красные плоды. Подойдут для продажи и будущих домашних соусов.'},
 lavender:{name:'Лаванда',cost:48,minutes:45,yield:2,xp:10,sale:30,description:'Ароматные фиолетовые соцветия для масел и парфюмерной мастерской.'}
};
Object.assign(CROPS.wheat,{cost:80,sale:70});Object.assign(CROPS.clover,{cost:80});Object.assign(CROPS.carrot,{cost:100,sale:75});Object.assign(CROPS.cucumber,{cost:120,sale:85});Object.assign(CROPS.tomato,{cost:160,sale:95});Object.assign(CROPS.corn,{cost:180,sale:110});Object.assign(CROPS.sunflower,{cost:240,sale:145});Object.assign(CROPS.pumpkin,{cost:320,sale:210});Object.assign(CROPS.lavender,{cost:420,sale:260});
export const SEED_PACK_SIZE=4;
export const bedCount=n=>`${n} ${n%10===1&&n%100!==11?"грядку":n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?"грядки":"грядок"}`;
const LEGACY={"wheat":{"minutes":12,"yield":2,"xp":7,"bonus":1},"sunflower":{"minutes":18,"yield":2,"xp":28,"bonus":6},"tomato":{"minutes":9,"yield":3,"xp":15,"bonus":3},"lavender":{"minutes":22,"yield":2,"xp":27,"bonus":6}};
const count=n=>Number.isSafeInteger(n)&&n>=0?n:0;
export class CropModel{
 constructor(saved={}){this.state={packVersion:1,coal:count(saved.coal),fuel:saved.fuel===undefined?20:count(saved.fuel),coins:Number.isFinite(saved.coins)&&saved.coins>=0?saved.coins:180,xp:count(saved.xp),clock:Math.max(0,Number(saved.clock)||0),seeds:{},stock:{},cells:{},hens:{}};if(Number.isFinite(saved.wallClockAt)&&saved.wallClockAt>0)this.state.wallClockAt=saved.wallClockAt;this.state.chains=restoreChains(saved.chains);Object.assign(this.state,restoreApiaries(saved));this.state.stock.donbas_bee=count(saved.stock?.donbas_bee);for(const k of Object.keys(LEGACY_GOODS))this.state.stock[k]=count(saved.stock?.[k]);this.state.wine=restoreWine(saved.wine);this.state.stock.grape=count(saved.stock?.grape);this.state.stock.wine=count(saved.stock?.wine);this.state.ketchupFactories=restoreKetchup(saved.ketchupFactories);this.state.stock.ketchup=count(saved.stock?.ketchup);this.state.dairy=restoreDairy(saved.dairy);for(const k of Object.keys(DAIRY_GOODS))this.state.stock[k]=count(saved.stock?.[k]);this.state.stock.egg=count(saved.stock?.egg);this.state.stock.flour=count(saved.stock?.flour);this.state.factories=restoreFactories(saved.factories);for(const [id,h]of Object.entries(saved.hens||{}))if(h&&Number.isFinite(h.readyAt)&&h.readyAt>=0)this.state.hens[id]={readyAt:h.readyAt};for(const id of Object.keys(CROPS)){this.state.seeds[id]=count(saved.seeds?.[id]);this.state.stock[id]=count(saved.stock?.[id])}for(const [i,c]of Object.entries(saved.cells||{}))if(/^\d+$/.test(i)&&+i<MAX_CELLS&&CROPS[c.cropId]&&Number.isFinite(c.plantedAt))this.state.cells[i]={cropId:c.cropId,plantedAt:c.plantedAt,watered:!!c.watered,cycle:saved.economyVersion===121?(c.cycle||{minutes:CROPS[c.cropId].minutes,yield:CROPS[c.cropId].yield,xp:CROPS[c.cropId].xp,bonus:0}):LEGACY[c.cropId]};this.state.journey=restoreProgress(saved.journey);this.state.economyVersion=121;this.state.rewardedLevel=Math.max(progression(this.state.xp).level,count(saved.rewardedLevel));}
 activateChain(o,fruit){return activateChain(this,o,fruit)}
 migrateApiaries(objects){return migrateApiaries(this,objects)}
 transferBees(o,delta){return transferBees(this,o,delta)}
 buyBee(){if(purchaseBlock('donbas_bee',this.state.xp)||this.state.coins<BEE.cost)return false;this.state.coins-=BEE.cost;this.state.stock.donbas_bee++;return true}
 advanceChains(ms,objects){advanceChains(this,ms,objects)}
 // Compatibility for an already-open old UI: retired purchases never charge.
 buySyrup(){return false}
 activateWine(o){const r=activateWine(this.state,o);if(r?.action==='collect'||r?.action==='harvest')this.addXP(r.action==='harvest'?PRODUCTION_XP.grape:PRODUCTION_XP.wine);return r}
 activateKetchup(o){const r=activateKetchup(this.state,o);if(r?.action==='collect')this.addXP(PRODUCTION_XP.ketchup);return r}
 buyHay(){return buyHay(this.state)}
 activateDairy(o){const r=activateDairy(this.state,o);if(r?.action==='collect')this.addXP(r.cow?PRODUCTION_XP.cow:PRODUCTION_XP.dairy);return r}
 queueBatch(id){return queueBatch(this.state,id)}
 collectFlour(id){const n=collectFlour(this.state,id);if(n)this.addXP(Math.floor(n/MILL.yield)*PRODUCTION_XP.mill);return n}
 recordProgress(key,amount=1){record(this.state,key,amount)}
 claimAchievement(id){return claimAchievement(this,id)}
 claimDaily(now){return claimDaily(this,now)}
 refreshOrders(objects=[]){return refreshOrders(this,progression(this.state.xp).level,objects)}
 fulfillOrder(id,fruit={}){return fulfillOrder(this,id,SALE_PRICES,fruit)}
 addXP(amount){if(!Number.isSafeInteger(amount)||amount<0)return;this.state.xp+=amount;const level=progression(this.state.xp).level;for(let n=this.state.rewardedLevel+1;n<=level;n++){this.state.coins+=10+2*n;if(n%10===0)this.state.coal++;if(n%5===0)this.state.fuel+=10;}this.state.rewardedLevel=Math.max(this.state.rewardedLevel,level);}
 buyFuel(){if(this.state.coins<FUEL.cost)return false;this.state.coins-=FUEL.cost;this.state.fuel+=FUEL.amount;return true;}
 storageInfo(extra={}){this.state.storageLevel=Math.min(6,count(this.state.storageLevel));const capacity=250+this.state.storageLevel*250,combined={...this.state.stock};for(const [id,n]of Object.entries(extra||{}))combined[id]=(combined[id]||0)+count(n);const used=Object.entries(combined).filter(([id])=>!['donbas_bee','hayFeed'].includes(id)).reduce((sum,[,n])=>sum+count(n),0);return{level:this.state.storageLevel+1,used,capacity,nextCost:this.state.storageLevel>=6?null:2500*2**this.state.storageLevel,max:this.state.storageLevel>=6};}
 upgradeStorage(){const info=this.storageInfo();if(info.max||this.state.coins<info.nextCost)return false;this.state.coins-=info.nextCost;this.state.storageLevel++;return this.storageInfo();}
 get(c,r){return this.state.cells[cellIndex(c,r)]}
 progress(c){return Math.max(0,Math.min(1,(this.state.clock-c.plantedAt)/((c.cycle?.minutes??CROPS[c.cropId].minutes)*60000)))}
 remaining(c){return Math.max(0,(c.cycle?.minutes??CROPS[c.cropId].minutes)*60000-(this.state.clock-c.plantedAt))}
 buy(id){const crop=CROPS[id];if(!crop||purchaseBlock(id,this.state.xp)||this.state.coins<crop.cost)return false;this.state.coins-=crop.cost;this.state.seeds[id]+=SEED_PACK_SIZE;return true}
 sow(c,r,id){if(!CROPS[id]||this.get(c,r)||!this.state.seeds[id])return false;this.state.seeds[id]--;this.state.cells[cellIndex(c,r)]={cropId:id,plantedAt:this.state.clock,watered:false,cycle:{minutes:CROPS[id].minutes,yield:CROPS[id].yield,xp:CROPS[id].xp,bonus:0}};this.addXP(1);record(this.state,'sown');return true}
 water(c,r){const crop=this.get(c,r);if(!crop||crop.watered||this.progress(crop)>=1)return false;crop.watered=true;crop.plantedAt-=(crop.cycle?.minutes??CROPS[crop.cropId].minutes)*60000*.3;return true}
 harvest(c,r){const crop=this.get(c,r);if(!crop||this.progress(crop)<1)return false;const def={...CROPS[crop.cropId],...crop.cycle};this.state.stock[crop.cropId==='clover'?'hayFeed':crop.cropId]+=def.yield;this.state.coins+=def.bonus||0;this.addXP(def.xp);delete this.state.cells[cellIndex(c,r)];record(this.state,'harvested');return {name:def.name,yield:def.yield}}
 feedHen(o){const def=CHICKENS[o?.type];if(!def||this.state.hens[o.id]||this.state.stock.wheat<1)return false;this.state.stock.wheat--;this.state.hens[o.id]={readyAt:this.state.clock+def.minutes*60000};return true}
 harvestEggs(o){const def=CHICKENS[o?.type],hen=this.state.hens[o?.id];if(!def||!hen||hen.readyAt>this.state.clock)return false;this.state.stock.egg+=def.yield;record(this.state,'eggs',def.yield);delete this.state.hens[o.id];this.addXP(o.type==='white-hen'?3:5);return {name:'Яйца',yield:def.yield}}
 sell(id,amount=this.state.stock[id]){const price=SALE_PRICES[id];if(!Number.isSafeInteger(amount)||amount<=0||!(price>0)||(this.state.stock[id]||0)<amount)return false;const value=amount*price;this.state.stock[id]-=amount;this.state.coins+=value;record(this.state,'sales',value);return true;}

 advance(ms,activeFactoryIds=Object.keys(this.state.factories),activeDairy=[],activeKetchup=[],activeWine=[]){if(Number.isFinite(ms)&&ms>0){this.state.clock+=ms;advanceFactories(this.state,ms,activeFactoryIds);advanceDairy(this.state,ms,activeDairy);advanceKetchup(this.state,ms,activeKetchup);advanceWine(this.state,ms,activeWine)}}
}
export const timeLabel=ms=>{const seconds=Math.ceil(ms/1000);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`};
