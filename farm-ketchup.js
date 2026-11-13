import {productionBadge} from './production-badge.js?v=182';
import {KETCHUP_FACTORY} from './ketchup-model.js?v=209';
import {timeLabel} from './crop-model.js?v=210';
const notice=message=>window.dispatchEvent(new CustomEvent('sadovod:action-error',{detail:{message}}));
function activate(o){const r=window.SadovodCrops?.activateKetchup(o);if(!r||r.action==='working')return;if(r.action==='collect'){window.SadovodHarvest?.notify({name:'Кетчуп',type:'ketchup',count:r.count});return;}notice(r.action==='working'?'До готовности: '+timeLabel(r.remaining):r.action==='missing'?`Нужно ${r.input} помидора. Вырастите и соберите их на грядке.`:r.action==='unconfigured'?'Рецепт производства ещё не назначен.':`Завод запущен. Кетчуп через ${KETCHUP_FACTORY.minutes} реальных минут.`);}
function decorate(g,o,box,state){if(o.type!=='ketchup-factory')return;const f=(state??window.SadovodCrops?.getState()).ketchupFactories[o.id],ready=!!f?.ready;g.dataset.ripe=String(ready);g.dataset.ketchupWorking=String(!!f&&!ready);window.SadovodHarvest?.badge(g,'ketchup',box.pivotX,g.artBox?.y-10||box.pivotY-120,ready,()=>activate(o));g.setAttribute('aria-label','Кетчупный завод · '+(ready?'Собрать кетчуп':f?'До готовности: '+timeLabel(f.remaining):'Запустить производство'));
 productionBadge(g,o,box,f&&!ready?timeLabel(f.remaining):'');
}
window.SadovodKetchup={activate,decorate};
function update(){if(document.hidden||document.querySelector('dialog[open]'))return;const d=window.SadovodDecor;if(!d||d.isMoving())return;const state=window.SadovodCrops?.getState();for(const o of d.getObjects()){if(o.type!=='ketchup-factory')continue;const g=d.getGroup(o.id);if(g)decorate(g,o,{pivotX:Number(g.dataset.pivotX),pivotY:Number(g.dataset.pivotY)},state);}}
window.addEventListener('sadovod:crops-changed',update);
