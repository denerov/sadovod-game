import {RESTORED} from './legacy-data.js?v=282';
import {TREES} from './orchard-model.js?v=182';
export const MACHINES={
 tractor:{name:'Трактор',cost:1500,coal:5,action:'Вспахать',size:1,canvasHeight:62,description:'Готовит газон к посеву: опускает плуг и переворачивает землю. После прохода остаются готовые грядки.',target:'Свободный газон',verb:'Вспашка'},
 seeder:{name:'Сеялка',cost:2200,coal:7,action:'Посеять',size:1,canvasHeight:65,description:'Высевает выбранные семена в пустые грядки. Сошники открывают бороздки, семена попадают в землю, и начинается рост.',target:'Пустые грядки',verb:'Посев'},
 combine:{name:'Комбайн',cost:3500,coal:12,action:'Собрать урожай',size:1,canvasHeight:65,description:'Собирает созревшие культуры. Жатка срезает растения, урожай отправляется в запасы, а грядка остаётся для следующего посева.',target:'Созревшие культуры',verb:'Сбор урожая'},
 orchard:{name:'Садовый сборщик',cost:60000,coal:16,action:'Собрать плоды',size:1,canvasHeight:65,description:'Одним запуском собирает все созревшие деревья, кусты и виноградники в пределах запаса топлива. Дерево остаётся на участке и даёт следующий урожай.',target:'Спелые плодовые деревья',verb:'Сбор плодов'}
};
export const machineDirection=(dc,dr,fallback=0)=>Math.abs(dc)+Math.abs(dr)===0?fallback:Math.abs(dc)>=Math.abs(dr)?(dc>0?0:2):(dr>0?3:1);
export function workRoute(a,b){const out=[];for(let r=Math.min(a.row,b.row);r<=Math.max(a.row,b.row);r++){const cs=Array.from({length:Math.abs(a.column-b.column)+1},(_,i)=>Math.min(a.column,b.column)+i);if((r-Math.min(a.row,b.row))%2)cs.reverse();for(const column of cs)out.push({column,row:r})}return out}
export function eligible(type,cell,{surface,crop,pending,object,seedCount=0,ripe=false}){if(pending)return false;if(type==='orchard')return !!object&&(!!TREES[object.type]||object.type==='vineyard'||RESTORED[object.type]?.auto)&&ripe;if(object)return false;if(type==='tractor')return surface==='grass';if(type==='seeder')return surface==='bed'&&!crop&&seedCount>0;if(type==='combine')return surface==='bed'&&!!crop&&ripe;return false}
