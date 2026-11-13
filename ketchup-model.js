import {PRODUCTION_PRICES} from './balance-v141.js?v=209';
// User-approved balance: 1800 ₽; 4 tomatoes → 2 ketchup / 12 active minutes; 24 ₽ each.
export const KETCHUP_FACTORY={name:'Кетчупный завод',cost:1800,minutes:12,input:4,yield:2,size:2,canvasHeight:125,description:'Превращает спелые помидоры в кетчуп.'};
export const KETCHUP={name:'Кетчуп',sale:PRODUCTION_PRICES.ketchup};
const count=n=>Number.isSafeInteger(n)&&n>=0?n:0;
export function restoreKetchup(saved){const out={};for(const [id,v]of Object.entries(saved||{})){if(!v||!Number.isFinite(v.remaining)||v.remaining<0)continue;out[id]={remaining:v.remaining,ready:count(v.ready),output:count(v.output)};}return out;}
export function activateKetchup(s,o){
 if(o?.type!=='ketchup-factory'||typeof o.id!=='string')return false;
 const f=s.ketchupFactories[o.id];
 if(f?.ready){const n=f.ready;s.stock.ketchup+=n;delete s.ketchupFactories[o.id];return {action:'collect',count:n};}
 if(f)return {action:'working',remaining:f.remaining};
 const d=KETCHUP_FACTORY;if(![d.input,d.yield,d.minutes].every(n=>Number.isFinite(n)&&n>0))return {action:'unconfigured'};
 if(s.stock.tomato<d.input)return {action:'missing',input:d.input};
 s.stock.tomato-=d.input;s.ketchupFactories[o.id]={remaining:d.minutes*60000,ready:0,output:d.yield};return {action:'start'};
}
export function advanceKetchup(s,ms,activeIds){if(!Number.isFinite(ms)||ms<=0)return;for(const id of new Set(activeIds)){const f=s.ketchupFactories[id];if(!f||f.ready)continue;f.remaining=Math.max(0,f.remaining-ms);if(!f.remaining)f.ready=f.output;}}
