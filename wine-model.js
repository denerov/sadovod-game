// User-approved balance, 4 October 2026.
export const VINEYARD={name:'Виноградник дедушки Саши',cost:400,minutes:15,yield:8,sale:10,size:1,canvasHeight:78,placement:'edge-cell',description:'Виноград для винодельни. После сбора снова даёт урожай.'};
export const WINERY={name:'Винодельня',cost:2400,minutes:15,input:8,yield:4,size:2,canvasHeight:130,description:'Производит вино «Коктебель» из винограда.'};
export const WINE={name:'Коктебель',sale:60};
const count=n=>Number.isSafeInteger(n)&&n>=0?n:0;
export function restoreWine(saved){const out={vines:{},factories:{}};for(const kind of ['vines','factories'])for(const [id,v]of Object.entries(saved?.[kind]||{})){if(!v||count(v.output)<1||!Number.isFinite(v.remaining)||v.remaining<0||!Number.isFinite(v.total)||v.total<=0)continue;out[kind][id]={remaining:Math.min(v.remaining,v.total),total:v.total,output:count(v.output),...(kind==='vines'?{mature:!!v.mature}:{ready:count(v.ready)})};}return out;}
function vineCycle(mature=false){return {remaining:VINEYARD.minutes*60000,total:VINEYARD.minutes*60000,output:VINEYARD.yield,mature};}
export function vineStage(v){if(!v)return 0;if(v.remaining<=0)return 5;const p=1-v.remaining/v.total;if(v.mature)return p<.35?2:p<.7?3:4;return p<.15?0:p<.35?1:p<.55?2:p<.75?3:4;}
export function activateWine(s,o){
 if(!o||typeof o.id!=='string')return false;
 if(o.type==='vineyard'){
  if(!Number.isFinite(VINEYARD.minutes)||!Number.isFinite(VINEYARD.yield))return {action:'unconfigured'};
  const v=s.wine.vines[o.id]??=vineCycle();if(v.remaining>0)return {action:'growing',remaining:v.remaining};
  const n=v.output;s.stock.grape+=n;s.wine.vines[o.id]=vineCycle(true);return {action:'harvest',count:n};
 }
 if(o.type!=='winery')return false;
 const f=s.wine.factories[o.id];if(f?.ready){const n=f.ready;s.stock.wine+=n;delete s.wine.factories[o.id];return {action:'collect',count:n};}if(f)return {action:'working',remaining:f.remaining};
 const d=WINERY;if(![d.input,d.yield,d.minutes].every(n=>Number.isFinite(n)&&n>0))return {action:'unconfigured'};
 if(s.stock.grape<d.input)return {action:'missing',input:d.input};s.stock.grape-=d.input;s.wine.factories[o.id]={remaining:d.minutes*60000,total:d.minutes*60000,ready:0,output:d.yield};return {action:'start'};
}
export function advanceWine(s,ms,active){if(!Number.isFinite(ms)||ms<=0)return;const seen=new Set();for(const o of active){if(seen.has(o.id))continue;seen.add(o.id);if(o.type==='vineyard'){if(!Number.isFinite(VINEYARD.minutes)||!Number.isFinite(VINEYARD.yield))continue;const v=s.wine.vines[o.id]??=vineCycle();v.remaining=Math.max(0,v.remaining-ms);}else if(o.type==='winery'){const f=s.wine.factories[o.id];if(!f||f.ready)continue;f.remaining=Math.max(0,f.remaining-ms);if(!f.remaining)f.ready=f.output;}}}
