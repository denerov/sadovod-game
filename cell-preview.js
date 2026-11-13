import {cellIndex} from './land-model.js?v=182';
import {cellOutline} from './cell-outline.js?v=182';
const plot=document.querySelector('.plot'),view=document.querySelector('.farm-view'),NS='http://www.w3.org/2000/svg';
const marker=document.createElementNS(NS,'g');marker.setAttribute('pointer-events','none');marker.style.display='none';
const defs=document.createElementNS(NS,'defs');defs.innerHTML='<filter id="cell-edge-soft" x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation=".65"/></filter>';marker.append(defs);
const halo=document.createElementNS(NS,'path'),line=document.createElementNS(NS,'path');for(const n of [halo,line]){n.setAttribute('fill','none');n.setAttribute('stroke-linecap','round');n.setAttribute('stroke-linejoin','round');marker.append(n)}halo.setAttribute('stroke-width','2.4');halo.setAttribute('opacity','.18');halo.setAttribute('filter','url(#cell-edge-soft)');line.setAttribute('stroke-width','.65');line.setAttribute('opacity','.42');plot.append(marker);
const label=document.createElement('div');label.className='cell-action-preview';label.hidden=true;label.setAttribute('role','status');view.append(label);let last=null,frame=0,justPlaced=null;
function show(){frame=0;if(window.SadovodDecor?.isMoving()){marker.style.display='none';label.hidden=true;return}if(!last)return;if(justPlaced&&last.column===justPlaced.column&&last.row===justPlaced.row){marker.style.display='none';label.hidden=true;return}const {column,row,x,y}=last,tool=document.querySelector('.dock [aria-pressed="true"]')?.dataset.tool,action=window.SadovodGround?.getAction(column,row,tool);if(!action){hide();return}
 const d=cellOutline(column,row),color=action.valid?'#ead392':'#d88578';for(const n of [halo,line]){n.setAttribute('d',d);n.setAttribute('stroke',color)}const bed=window.SadovodGround?.getCells()[cellIndex(column,row)]==='bed';marker.style.display=tool==='hand'&&!bed?'none':'';
 label.textContent=action.text;label.dataset.valid=String(action.valid);label.hidden=!!window.SadovodCrops?.getSelected()||!!window.SadovodMachines?.selecting();label.style.left=Math.max(8,Math.min(view.clientWidth-260,x+16))+'px';label.style.top=Math.max(8,Math.min(view.clientHeight-48,y-44))+'px';
}
function hide(){last=null;marker.style.display='none';label.hidden=true}
window.addEventListener('sadovod:cell-hover',e=>{last=e.detail;if(!last){justPlaced=null;hide();return}if(justPlaced&&(last.column!==justPlaced.column||last.row!==justPlaced.row))justPlaced=null;if(!frame)frame=requestAnimationFrame(show)});
window.addEventListener('sadovod:ground-changed',()=>{if(last)show()});window.addEventListener('sadovod:tool-selected',()=>{justPlaced=null;if(last)show()});window.addEventListener('sadovod:camera',hide);
document.querySelector('.dock-wrap').addEventListener('pointerenter',hide);

window.addEventListener('sadovod:crops-changed',()=>{if(last)show()});

window.addEventListener('sadovod:surface-placed',e=>{justPlaced=e.detail;marker.style.display='none';label.hidden=true;});
