import {cellIndex,cellColumn,cellRow} from './land-model.js?v=182';
import {roundedBed} from './terrain-details.js?v=258';
import {flattenShore,shoreSections} from './shore-geometry.js?v=182';
export function bedCoverage(cells){let d='';cells.forEach((v,i)=>{if(v==='bed')d+=roundedBed(cellColumn(i),cellRow(i))});return d}
export function insideLoops(loops,x,y){let inside=false;for(const loop of loops)for(let i=0,j=loop.length-1;i<loop.length;j=i++){const a=loop[i],b=loop[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside}return inside}
export function terrainSampler(cells,pathD,waterD,bedD=bedCoverage(cells)){
 const shapes=[['water',flattenShore(waterD)],['path',flattenShore(pathD)],['bed',flattenShore(bedD)]];
 return (x,y)=>{const c=Math.floor((x-384)/64+y/32),r=Math.floor(y/32-(x-384)/64),v=cells[cellIndex(c,r)];if(!v||v==='void')return 'void';for(const [type,loops]of shapes)if(insideLoops(loops,x,y))return type;return 'grass'};
}
export function landSide(p,sample){let result='grass';for(const distance of [1.2,2.4,3.6]){const type=sample(p.x-p.nx*distance,p.y-p.ny*distance);if(type==='path'||type==='bed'||type==='water')return type;if(type==='void')result='void'}return result}
export function roadShoreApron(waterD,sample){let d='';for(const loop of shoreSections(waterD))for(let i=0;i<loop.length-1;i++){const p=loop[i],q=loop[i+1],m={x:(p.x+q.x)/2,y:(p.y+q.y)/2,nx:(p.nx+q.nx)/2,ny:(p.ny+q.ny)/2};if(landSide(m,sample)!=='path')continue;d+=`M${p.x} ${p.y}L${q.x} ${q.y}L${q.x-q.nx*3.8} ${q.y-q.ny*3.8}L${p.x-p.nx*3.8} ${p.y-p.ny*3.8}Z`}return d}
