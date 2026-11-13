import {cellIndex,expansionCount,landCells,MAX_CELLS,MAX_GRID_SIZE,MAX_LAND_EXPANSIONS,expansionAllowed} from './land-model.js?v=182';
export const CELL_WIDTH=64,CELL_HEIGHT=32,GRID_SIZE=MAX_GRID_SIZE;
export function cellCenter(column,row){return {x:384+(column-row)*32,y:(column+row+1)*16}}
export function cellAt(x,y){return {column:Math.floor((x-384)/64+y/32),row:Math.floor(y/32-(x-384)/64)}}
export class FarmGround{
 constructor(saved=[],persist=()=>{}){const valid=Array.isArray(saved)&&saved.length>=144&&saved.length<=MAX_CELLS;this.cells=landCells(valid?expansionCount(saved):0);this.pending=new Set();this.persist=persist;if(valid)saved.forEach((v,i)=>{if(this.cells[i]!==undefined&&this.cells[i]!=='void'&&['grass','water','path','bed'].includes(v))this.cells[i]=v})}
 index(column,row){const i=cellIndex(column,row);return i>=0&&this.cells[i]&&this.cells[i]!=='void'?i:-1}
 expand(level=1){const n=expansionCount(this.cells);if(!expansionAllowed(n,level))return false;const next=landCells(n+1);this.cells.forEach((v,i)=>{if(v!=='void')next[i]=v});this.cells.splice(0,this.cells.length,...next);this.persist([...this.cells]);return true}
 reserveDig(column,row){const i=this.index(column,row);if(i<0||this.cells[i]!=='grass'||this.pending.has(i))return false;const limit=globalThis.window?.SadovodCrops?.bedLimit?.()??144;if(this.cells.filter(v=>v==='bed').length+[...this.pending].filter(n=>this.cells[n]==='grass').length>=limit){globalThis.window?.dispatchEvent(new CustomEvent('sadovod:action-error',{detail:{message:'Лимит грядок: '+limit+'. Повышайте уровень, чтобы открыть больше.'}}));return false}this.pending.add(i);return true}
 finishDig(column,row){const i=this.index(column,row);if(!this.pending.delete(i))return false;this.cells[i]='bed';this.persist([...this.cells]);return true}
 cancelDig(column,row){return this.pending.delete(this.index(column,row))}
 reserveGrass(column,row){const i=this.index(column,row);if(i<0||this.cells[i]==='grass'||this.pending.has(i))return false;this.pending.add(i);return true}
 finishGrass(column,row){const i=this.index(column,row);if(!this.pending.delete(i))return false;this.cells[i]='grass';this.persist([...this.cells]);return true}
 paint(column,row,surface){const i=this.index(column,row);if(i<0||!['water','path','grass'].includes(surface)||this.pending.has(i)||(this.cells[i]==='bed'&&surface!=='grass'))return false;this.cells[i]=surface;this.persist([...this.cells]);return true}
}
export class DigQueue{
 constructor(ground,perform,onChange=()=>{},onError=()=>{}){this.ground=ground;this.perform=perform;this.onChange=onChange;this.onError=onError;this.queue=[];this.running=false}
 enqueue(column,row){if(!this.ground.reserveDig(column,row))return false;this.queue.push({column,row});this.onChange();this.drain();return true}
 restoreGrass(column,row){if(!this.ground.reserveGrass(column,row))return false;this.queue.push({column,row,restore:true});this.onChange();this.drain();return true}
 async drain(){if(this.running)return;this.running=true;while(this.queue.length){const cell=this.queue.shift();try{await this.perform(cell);if(cell.restore)this.ground.finishGrass(cell.column,cell.row);else this.ground.finishDig(cell.column,cell.row)}catch(e){this.ground.cancelDig(cell.column,cell.row);this.onError(e)}this.onChange()}this.running=false}
}
