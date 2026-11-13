import {productionBadge} from './production-badge.js?v=182';
import {timeLabel} from './crop-model.js?v=210';
const NS='http://www.w3.org/2000/svg';
const notice=message=>window.dispatchEvent(new CustomEvent('sadovod:action-error',{detail:{message}}));
function activate(o){const r=window.SadovodCrops?.activateDairy(o);if(!r||r.action==='working')return;if(r.action==='collect'){window.SadovodHarvest?.notify({name:r.cow?'Молоко':'Сыр и масло',type:r.cow?'milk':'cheese',count:r.count,message:r.cow?`Собрано ${r.count} молока`:`Собрано: ${r.count} сыр и ${r.count} масло`});return}notice(r.action==='working'?'До готовности: '+timeLabel(r.remaining):r.action==='missing'?(r.cow?'Нужно 1 сено. Купите корм в разделе «Животные».':'Нужно 4 молока. Покормите корову и соберите молоко.'):(r.cow?'Корова накормлена. Молоко через 15 реальных минут.':'Му-лочный завод запущен. Сыр и масло через 15 реальных минут.'));}
function decorate(g,o,box,s){if(!o.type.startsWith('dairy-'))return;s??=window.SadovodCrops?.getState();if(!s)return;const cow=o.type==='dairy-cow',f=(cow?s.dairy.cows:s.dairy.factories)[o.id],ready=!!f?.ready;g.dataset.ripe=String(ready);g.dataset.dairyWorking=String(!!f&&!ready);window.SadovodHarvest?.badge(g,cow?'milk':'cheese',box.pivotX,box.pivotY-(cow?58:120),ready,()=>activate(o));g.setAttribute('aria-label',(cow?'Молочная корова':'Му-лочный завод')+' · '+(ready?'Собрать продукцию':f?'До готовности: '+timeLabel(f.remaining):cow?'Покормить сеном':'Запустить производство'));
 productionBadge(g,o,box,f&&!ready?timeLabel(f.remaining):'');
}
window.SadovodDairy={activate,decorate};
function update(){if(document.hidden||document.querySelector('dialog[open]'))return;const d=window.SadovodDecor;if(!d||d.isMoving())return;const state=window.SadovodCrops?.getState();for(const o of d.getObjects()){if(!o.type.startsWith('dairy-'))continue;const g=d.getGroup(o.id);if(g)decorate(g,o,{pivotX:Number(g.dataset.pivotX),pivotY:Number(g.dataset.pivotY)},state)}}
window.addEventListener('sadovod:crops-changed',update);
