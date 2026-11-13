import {MAX_GRID_SIZE,MAX_CELLS} from './land-model.js?v=182';
import {cellIndex} from './land-model.js?v=182';
// Farm cells are 64 × 32. The one-cell grass verge is walkable,
// but is outside the 24 × 24 buildable plot and never changes terrain.
export function walkableCell(cells,column,row){
 if(!Number.isInteger(column)||!Number.isInteger(row)||column< -1||column>MAX_GRID_SIZE||row< -1||row>MAX_GRID_SIZE)return false;
 if(column<0||column>=MAX_GRID_SIZE||row<0||row>=MAX_GRID_SIZE||!cells[cellIndex(column,row)]||cells[cellIndex(column,row)]==='void')return true;
 return ['grass','path'].includes(cells[cellIndex(column,row)]);
}
export function standingCell(cells,target={column:5,row:5},preferLeft=true,previous=null){
 const {column,row,width=1,height=1}=target;
 const center={x:384+(column-row+(width-height)/2)*32,y:(column+row+(width+height)/2)*16};
 const candidates=[];
 for(let r=-1;r<=MAX_GRID_SIZE;r++)for(let c=-1;c<=MAX_GRID_SIZE;c++){
  if(!walkableCell(cells,c,r))continue;
  if(preferLeft&&c>=column&&c<column+width&&r>=row&&r<row+height)continue;
  const x=384+(c-r)*32,y=(c+r+1)*16;
  const dc=c<column?column-c:c>=column+width?c-column-width+1:0;
  const dr=r<row?row-r:r>=row+height?r-row-height+1:0;
  candidates.push({column:c,row:r,x,y,adjacent:dc+dr===1,left:x<center.x,distance:Math.hypot(x-center.x,(y-center.y)*2)});
 }
 const neighbours=candidates.filter(p=>p.adjacent);
 const leftNeighbours=neighbours.filter(p=>p.left);
 const available=previous&&neighbours.length?neighbours:preferLeft?(leftNeighbours.length?leftNeighbours:neighbours.length?neighbours:candidates):candidates;
 available.sort((a,b)=>(previous?Math.hypot(a.x-previous.x,(a.y-previous.y)*2)-Math.hypot(b.x-previous.x,(b.y-previous.y)*2):0)||a.distance-b.distance||(preferLeft?Number(b.left)-Number(a.left):0)||Math.abs(a.y-center.y)-Math.abs(b.y-center.y)||a.row-b.row);
 return available[0]||null;
}
// Water from the selected bed's verge, even inside a solid block of beds.
// This is a work anchor, not a search for a distant walkable terrain cell.
export function wateringStance(cells,target,previous=null){
 const {column,row}=target;
 if(!Number.isInteger(column)||!Number.isInteger(row)||column<0||row<0||column>=MAX_GRID_SIZE||row>=MAX_GRID_SIZE||cells[cellIndex(column,row)]!=='bed')return null;
 const x=384+(column-row)*32,y=(column+row+1)*16;
 const side=previous&&previous.x>x?1:-1;
 return {column,row,x:x+side*22,y:y+7,onBedEdge:true};
}
