import {productionBadge} from './production-badge.js?v=182';
import {MILL} from './economy.js?v=210';
import {timeLabel} from './crop-model.js?v=210';
const decor=()=>window.SadovodDecor,crops=()=>window.SadovodCrops;
const notice=message=>window.dispatchEvent(new CustomEvent('sadovod:action-error',{detail:{message}}));
function activateFactory(id){
 if(!decor()?.getObjects().some(o=>o.id===id&&o.type==='wheat-mill')||!crops())return;
 const s=crops().getState(),f=s.factories[id]||{jobs:[],ready:0};
 if(f.ready){const count=crops().collectFlour(id);if(count)notice(`Собрано: ${count} мешков муки. Они в запасах.`);return;}
 if(f.jobs.length)return;
 if(s.stock.wheat<MILL.input){notice(`Для запуска нужно ${MILL.input} пшеницы. В запасах: ${s.stock.wheat}.`);return;}
 if(crops().queueBatch(id))notice('Фабрика запущена. Загружено 4 пшеницы.');
}
window.SadovodFactory={activate:activateFactory};


function refreshFactoryTimers(){const state=crops()?.getState();if(!state)return;for(const o of decor()?.getObjects()||[]){if(o.type!=='wheat-mill')continue;const f=state.factories[o.id];const g=decor().getGroup(o.id);if(g){g.dataset.ripe=String(!!f?.ready);window.SadovodHarvest?.badge(g,'flour',g.artBox?.x||0,g.artBox?.y||0,!!f?.ready,()=>activateFactory(o.id));}productionBadge(g,o,{},f?.jobs.length?timeLabel(f.jobs[0].remaining):'');}}
window.addEventListener('sadovod:crops-changed',refreshFactoryTimers);window.addEventListener('sadovod:object-selected',refreshFactoryTimers);
