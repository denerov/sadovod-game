import {cellIndex} from './land-model.js?v=182';
import {rakeStroke} from './path-progress.js?v=182';
import {cellCenter,cellAt} from './farm-ground.js?v=182';
import {walkableCell,standingCell} from './farmer-placement.js?v=182';
// Breadth-first route stays off water and beds, including the one-cell outer verge.
export function rakeRoute(cells,previous,target){
 if(cells[cellIndex(target.column,target.row)]!=='grass')throw Error('Дорожку можно проложить только по газону');
 let start=previous;
 if(!start||!walkableCell(cells,start.column,start.row))start=standingCell(cells,target,false,previous);
 if(!start)throw Error('Нет прохода к клетке');
 const key=p=>`${p.column},${p.row}`,queue=[start],parents=new Map([[key(start),null]]),positions=new Map([[key(start),start]]);
 for(let n=0;n<queue.length;n++){
  const p=queue[n];if(key(p)===key(target))break;
  for(const [dc,dr]of [[1,0],[0,1],[-1,0],[0,-1]]){const q={column:p.column+dc,row:p.row+dr},k=key(q);if(parents.has(k)||!walkableCell(cells,q.column,q.row))continue;parents.set(k,key(p));positions.set(k,q);queue.push(q)}
 }
 if(!parents.has(key(target)))throw Error('Нет прохода к клетке');
 const route=[];for(let k=key(target);k!==null;k=parents.get(k))route.unshift(positions.get(k));
 const center=cellCenter(target.column,target.row),prior=route.length>1?cellCenter(route.at(-2).column,route.at(-2).row):{x:center.x-32,y:center.y-16};
 const axis=target.axis||{column:target.column-(route.at(-2)?.column??target.column-1),row:target.row-(route.at(-2)?.row??target.row)};
 const dx=(axis.column-axis.row)*32,dy=(axis.column+axis.row)*16,length=Math.hypot(dx,dy),direction={x:dx/length,y:dy/length};
 let side=direction.x<0?-1:1;
 const anchors=side=>({from:{x:center.x-direction.x*length/2-side*28,y:center.y-direction.y*length/2},to:{x:center.x+direction.x*length/2-side*28,y:center.y+direction.y*length/2}});
 const safe=p=>{const c=cellAt(p.x,p.y);return walkableCell(cells,c.column,c.row)};let workAnchors=anchors(side);if(!safe(workAnchors.from)||!safe(workAnchors.to)){side=-side;workAnchors=anchors(side)}
 const {from,to}=workAnchors;
 // Match the existing digging placement: appear at the work start, never glide
 // across the map with a working pose. Adjacent cells share their exact endpoint.
 const travel=0,duration=1.2;
 return {duration,from,to,direction,side,target,travel,sample(progress){const p=Math.max(0,Math.min(1,progress)),step=rakeStroke(p).cleared;
  return {position:{x:from.x+(to.x-from.x)*step,y:from.y+(to.y-from.y)*step},working:true,workProgress:p,direction,axis,cycle:p*2};
 }};
}
