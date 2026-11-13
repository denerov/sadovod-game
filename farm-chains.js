import './farm-apiary.js?v=210';
import {RESTORED,LEGACY_GOODS} from './legacy-data.js?v=282';
import {recipeText} from './chain-model.js?v=210';
import {spriteBox} from './decor-model.js?v=268';
import {timeLabel} from './crop-model.js?v=210';
import {productionBadge} from './production-badge.js?v=182';
const notice=message=>window.dispatchEvent(new CustomEvent('sadovod:action-error',{detail:{message}}));
function activate(o){if(o.type==='beehive'){window.SadovodApiary.open(o);return;}const r=window.SadovodCrops?.activateChain(o);if(!r||r.action==='working')return;
 if(r.action==='collect'){window.SadovodHarvest?.notify({name:LEGACY_GOODS[r.type]?.name||r.type,type:r.type,count:r.count});return;}
 notice(r.action==='missing'?'Не хватает сырья: '+r.missing.map(([k,n])=>`${LEGACY_GOODS[k]?.name||k} — нужно ${n}`).join(', '):r.action==='working'?'До готовности: '+timeLabel(r.remaining):'Цикл начат. '+recipeText(RESTORED[o.type]));
}
function decorate(g,o,box,state){const d=RESTORED[o.type];if(!d?.recipe)return;state??=window.SadovodCrops?.getState();if(!state)return;const j=state.chains[o.id],ready=!!j&&j.remaining===0;g.dataset.ripe=String(ready);window.SadovodHarvest?.badge(g,d.recipe.output,box.pivotX,(g.artBox?.y??box.y)-10,ready,()=>activate(o));productionBadge(g,o,box,j&&j.remaining>0?timeLabel(j.remaining):'');}
function update(){if(document.hidden||document.querySelector('dialog[open]'))return;const d=window.SadovodDecor,s=window.SadovodCrops?.getState();if(!d||!s||d.isMoving())return;for(const o of d.getObjects()){if(!RESTORED[o.type])continue;const g=d.getGroup(o.id),frames=d.getAssets(o.type);if(g&&frames)decorate(g,o,spriteBox(o,frames),s);}}
window.SadovodChains={handles:o=>!!RESTORED[o?.type],activate,decorate};
window.addEventListener('sadovod:crops-changed',update);window.addEventListener('sadovod:decor-changed',update);window.addEventListener('sadovod:decor-ready',update);
