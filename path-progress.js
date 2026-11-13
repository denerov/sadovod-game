import {MAX_GRID_SIZE,MAX_CELLS} from './land-model.js?v=182';
import {cellIndex} from './land-model.js?v=182';
const project=(c,r)=>[384+(c-r)*32,(c+r)*16];
export function pathAxis(target,previous,next,cells){
 const adjacent=p=>p&&Math.abs(p.column-target.column)+Math.abs(p.row-target.row)===1;
 if(adjacent(previous))return {column:target.column-previous.column,row:target.row-previous.row};
 if(adjacent(next))return {column:next.column-target.column,row:next.row-target.row};
 for(const [dc,dr]of [[-1,0],[0,-1],[1,0],[0,1]]){const c=target.column+dc,r=target.row+dr;if(c>=0&&c<MAX_GRID_SIZE&&r>=0&&r<MAX_GRID_SIZE&&cells[cellIndex(c,r)]==='path')return {column:-dc,row:-dr}}
 return {column:1,row:0};
}
// Sweep in logical cell coordinates; a screen-space perpendicular cuts diagonally
// through an isometric diamond. Overlap existing neighbours to erase old end caps.
export function pathSweep(column,row,axis,progress,cells){
 const path=(c,r)=>c>=0&&c<MAX_GRID_SIZE&&r>=0&&r<MAX_GRID_SIZE&&cells[cellIndex(c,r)]==='path',pad=.18,p=Math.max(0,Math.min(1,progress));
 let c0=column-(path(column-1,row)?pad:0),c1=column+1+(path(column+1,row)?pad:0),r0=row-(path(column,row-1)?pad:0),r1=row+1+(path(column,row+1)?pad:0);
 if(axis.column>0)c1=p===1?c1:column+p;else if(axis.column<0)c0=p===1?c0:column+1-p;else if(axis.row>0)r1=p===1?r1:row+p;else r0=p===1?r0:row+1-p;
 return [project(c0,r0),project(c1,r0),project(c1,r1),project(c0,r1)];
}

const clamp=t=>Math.max(0,Math.min(1,t));
export function rakeStroke(progress){
 const p=clamp(progress),stroke=Math.min(1,Math.floor(p*2)),phase=p*2-stroke,t=clamp((phase-.16)/.56),pull=t*t*(3-2*t);
 return {stroke,phase,pull,cleared:(stroke+pull)/2,contact:phase>=.16&&phase<=.76};
}
// Individual rake teeth peel uneven narrow lanes. The mask advances only on pulls.
export function rakeRemoval(column,row,axis,progress,cells){
 const p=rakeStroke(progress).cleared,seed=column*31+row*17,lanes=14;let d='';
 for(let i=0;i<lanes;i++){
  const tooth=((Math.sin((seed+i)*12.9898)*43758.5453)%1+1)%1,front=clamp(p+(tooth-.5)*.15*Math.sin(Math.PI*p));
  const quad=pathSweep(column,row,axis,front,cells),a=(i/lanes)-.003,b=(i+1)/lanes+.003;
  const mix=(u,v,t)=>[u[0]+(v[0]-u[0])*t,u[1]+(v[1]-u[1])*t];
  const corners=axis.column?[mix(quad[0],quad[3],a),mix(quad[1],quad[2],a),mix(quad[1],quad[2],b),mix(quad[0],quad[3],b)]:[mix(quad[0],quad[1],a),mix(quad[0],quad[1],b),mix(quad[3],quad[2],b),mix(quad[3],quad[2],a)];
  d+='M'+corners.map(q=>q.join(' ')).join('L')+'Z';
 }
 return d;
}
