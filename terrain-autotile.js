import {cellIndex,cellColumn,cellRow} from './land-model.js?v=182';


const project=(c,r)=>[(c-r)*32+384,(c+r)*16];
const noise=(x,y,s=0)=>{let n=(Math.imul(x+s,374761393)^Math.imul(y-s,668265263))>>>0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295};

// Four-bit Farmandia terrain mask: N=1, E=2, S=4, W=8.  Every cell is
// therefore one of the 16 stable atlas cases (isolated, end, straight,
// corner, T, cross). Exposed sides provide the visible edge segments.
export function terrainTiles(cells,type){
 const same=(c,r)=>cellIndex(c,r)>=0&&cells[cellIndex(c,r)]===type,out=[];
 cells.forEach((value,index)=>{if(value!==type)return;const c=cellColumn(index),r=cellRow(index),mask=(same(c,r-1)?1:0)|(same(c+1,r)?2:0)|(same(c,r+1)?4:0)|(same(c-1,r)?8:0),p=[project(c,r),project(c+1,r),project(c+1,r+1),project(c,r+1)],sides=[[0,1,1],[1,2,2],[2,3,4],[3,0,8]],edges=[];
  for(const [a,b,bit] of sides){if(mask&bit)continue;const A=p[a],B=p[b],dx=B[0]-A[0],dy=B[1]-A[1],len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len,points=[];for(let k=0;k<8;k++){const t=(k+.5)/8,j=(noise(c*31+k,r*29-k,bit)-.5)*.7;points.push({x:A[0]+dx*t+nx*j,y:A[1]+dy*t+ny*j,nx,ny,cell:index,side:bit})}edges.push({side:bit,a:A,b:B,points})}
  out.push({index,c,r,mask,variant:(mask*5+Math.floor(noise(c,r,901)*5))%5,edges});
 });return out;
}

export function edgePoints(tiles){return tiles.flatMap(tile=>tile.edges.flatMap(edge=>edge.points))}
