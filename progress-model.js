import {SALE_PRICES,orderProducts} from './trade-model.js?v=210';
// Sadovod adaptation of Farmandia's achievements and daily return loop.
// Amounts are our balance, not claimed historical Farmandia values.
export const ACHIEVEMENTS=[
 {id:'sow4',stat:'sown',target:4,title:'Первые всходы',detail:'Засейте 4 грядки',coins:12,xp:4},
 {id:'harvest12',stat:'harvested',target:12,title:'Первый урожай',detail:'Соберите урожай с 12 грядок',coins:30,xp:10},
 {id:'sell100',stat:'sales',target:100,title:'Своя торговля',detail:'Продайте продукции на 100 ₽',coins:20,xp:8},
 {id:'eggs10',stat:'eggs',target:10,title:'Птичий двор',detail:'Соберите 10 яиц',coins:30,xp:10},
 {id:'fruit20',stat:'fruit',target:20,title:'Плодовый сад',detail:'Соберите 20 плодов с деревьев',coins:40,xp:12},
 {id:'orders5',stat:'orders',target:5,title:'Надёжный поставщик',detail:'Выполните 5 заказов',coins:40,xp:12},
 {id:'harvest100',stat:'harvested',target:100,title:'Опытный земледелец',detail:'Соберите урожай со 100 грядок',coins:100,xp:30},
 {id:'orders25',stat:'orders',target:25,title:'Постоянные покупатели',detail:'Выполните 25 заказов',coins:120,xp:35,coal:1},
 {id:'harvest500',stat:'harvested',target:500,title:'Хозяин полей',detail:'Соберите урожай с 500 грядок',coins:250,xp:60,coal:1}
];
const integer=n=>Number.isSafeInteger(n)&&n>=0?n:0;
export function restoreProgress(saved={}){return {stats:Object.fromEntries(['sown','harvested','sales','eggs','fruit','orders','produced','animalProducts'].map(k=>[k,integer(saved.stats?.[k])])),claimed:ACHIEVEMENTS.filter(a=>saved.claimed?.includes(a.id)).map(a=>a.id),daily:{day:Number.isSafeInteger(saved.daily?.day)?saved.daily.day:-1,streak:Math.min(5,integer(saved.daily?.streak))},orders:{generation:integer(saved.orders?.generation),readyAt:Number.isFinite(saved.orders?.readyAt)?Math.max(0,saved.orders.readyAt):0,items:Array.isArray(saved.orders?.items)?saved.orders.items.filter(o=>o&&SALE_PRICES[o.product]>0&&Number.isSafeInteger(o.quantity)&&o.quantity>0&&o.quantity<=30&&typeof o.id==='string').slice(0,3).map(o=>({id:o.id,product:o.product,quantity:o.quantity,done:!!o.done})):[]}};}
export function record(state,key,amount=1){if(key in state.journey.stats&&Number.isSafeInteger(amount)&&amount>0)state.journey.stats[key]+=amount;}
export function claimAchievement(model,id){const a=ACHIEVEMENTS.find(a=>a.id===id),p=model.state.journey;if(!a||p.claimed.includes(id)||p.stats[a.stat]<a.target)return false;p.claimed.push(id);model.state.coins+=a.coins;model.state.coal+=a.coal||0;model.addXP(a.xp);return true;}
export const dayNumber=now=>Math.floor(now/86400000);
export function claimDaily(model,now=Date.now()){const day=dayNumber(now),p=model.state.journey.daily;if(!Number.isSafeInteger(day)||day<0||day<=p.day)return false;p.streak=p.day===day-1?p.streak%5+1:1;p.day=day;const coins=15+5*p.streak;model.state.coins+=coins;if(p.streak===5)model.state.coal++;return {coins,coal:p.streak===5?1:0};}
export function refreshOrders(model,level,objects=[]){const o=model.state.journey.orders;if(o.items.length&&model.state.clock<o.readyAt)return false;const products=objects.length?orderProducts(level,objects):['wheat',...(level>=2?['tomato']:[]),...(level>=3?['egg']:[]),...(level>=4?['sunflower']:[]),...(level>=6?['lavender']:[])];o.generation++;o.readyAt=model.state.clock+20*60000;o.items=Array.from({length:3},(_,i)=>{const product=products[(o.generation-1+i)%products.length];return {id:`${o.generation}-${i}`,product,quantity:SALE_PRICES[product]>=100?1:product==='egg'?4:4+2*((o.generation+i)%3),done:false}});return true;}
export function fulfillOrder(model,id,prices,fruit={}){const o=model.state.journey.orders.items.find(o=>o.id===id);if(!o||o.done||!(prices[o.product]>0)||(Object.hasOwn(fruit,o.product)?fruit[o.product]:model.state.stock[o.product]||0)<o.quantity)return false;if(Object.hasOwn(fruit,o.product))fruit[o.product]-=o.quantity;else model.state.stock[o.product]-=o.quantity;o.done=true;const coins=Math.round(o.quantity*prices[o.product]*1.2);model.state.coins+=coins;model.addXP(3);record(model.state,'orders');return {coins,xp:3};}
