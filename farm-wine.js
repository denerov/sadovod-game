import {productionBadge} from './production-badge.js?v=182';
import {WINERY,VINEYARD,vineStage} from './wine-model.js?v=182';
import {timeLabel} from './crop-model.js?v=210';
import {spriteBox} from './decor-model.js?v=268';
const notice=message=>window.dispatchEvent(new CustomEvent('sadovod:action-error',{detail:{message}}));
let visuals=null;
fetch('https://sadovod-webgl-engine-test.ddenerov.chatgpt.site/assets/wine-v137/vineyard-stages.json?v=182').then(r=>{if(!r.ok)throw Error('Wine artwork');return r.json();}).then(v=>{visuals=v;update();}).catch(()=>notice('Не удалось загрузить винодельню. Обновите страницу.'));
function activate(o){const r=window.SadovodCrops?.activateWine(o);if(!r||r.action==='working'||r.action==='growing')return;if(r.action==='collect'||r.action==='harvest'){window.SadovodHarvest?.notify({name:r.action==='harvest'?'Виноград':'Коктебель',type:r.action==='harvest'?'grape':'wine',count:r.count});return;}notice(r.action==='working'?'До готовности вина: '+timeLabel(r.remaining):r.action==='growing'?'До сбора винограда: '+timeLabel(r.remaining):r.action==='missing'?`Нужно ${r.input} винограда. Соберите урожай с виноградника.`:r.action==='unconfigured'?'Рецепт ещё не назначен.':`Винодельня запущена. Вино через ${WINERY.minutes} реальных минут.`);}
function decorate(g,o,box,state){
 if(!['winery','vineyard'].includes(o.type))return;state??=window.SadovodCrops?.getState();if(!state)return;const vine=o.type==='vineyard',f=(vine?state.wine.vines:state.wine.factories)[o.id],ready=vine?!!f&&f.remaining<=0:!!f?.ready,working=!vine&&!!f&&!ready;
 g.dataset.ripe=String(ready);g.dataset.wineWorking=String(working);
 const base=window.SadovodDecor?.getAssets(o.type)?.[o.rotation];let frame=base;
 if(vine&&visuals){const stage=vineStage(f),frames=visuals.vineyard[stage];g.dataset.plantStage=String(stage);frame=frames[o.rotation];}
 const sprite=frame?.src;const visual=[frame?.src,box.x,box.y,box.scale].join(':');if(sprite&&(g.dataset.wineVisual!==visual||g.firstElementChild.getAttribute('href')!==sprite)){g.hitFrame=frame;g.dataset.wineVisual=visual;const img=g.firstElementChild;if(img.getAttribute('href')!==sprite)img.setAttribute('href',sprite);if(frame.hitPolygon){g.querySelector('polygon').setAttribute('points',frame.hitPolygon.map(([x,y])=>`${box.x+x*box.scale},${box.y+y*box.scale}`).join(' '));g.artBox={x:box.pivotX,y:box.y+Math.min(...frame.hitPolygon.map(p=>p[1]))*box.scale};}}

 window.SadovodHarvest?.badge(g,vine?'grape':'wine',box.pivotX,(g.artBox?.y??box.pivotY-(vine?65:130))-10,ready,()=>activate(o));
 g.setAttribute('aria-label',(vine?VINEYARD.name:WINERY.name)+' · '+(ready?'Собрать урожай':f?'До готовности: '+timeLabel(f.remaining):vine?'Растёт':'Запустить производство'));
 productionBadge(g,o,box,f&&!ready&&f.remaining>0?timeLabel(f.remaining):'');
}
window.SadovodWine={activate,decorate};
function update(){if(document.hidden||document.querySelector('dialog[open]'))return;const d=window.SadovodDecor,state=window.SadovodCrops?.getState();if(!d||!state||d.isMoving())return;for(const o of d.getObjects()){if(!['winery','vineyard'].includes(o.type))continue;const g=d.getGroup(o.id),frames=d.getAssets(o.type);if(g&&frames)decorate(g,o,spriteBox(o,frames),state);}}
window.addEventListener('sadovod:crops-changed',update);window.addEventListener('sadovod:decor-changed',update);
