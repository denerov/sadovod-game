export const LAND_COST=2500,BASE_LAND_EXPANSIONS=18,MAX_LAND_EXPANSIONS=21,MAX_GRID_SIZE=48,MAX_CELLS=2304;
export const BASE_BOUNDARY='M384 0L768 192L384 384L0 192Z';
export const EXPANDED_BOUNDARY='M384 0L768 192L256 448L64 352L192 288L0 192Z';
// Four 24x24 banks. Bank zero retains EVERY legacy index and coordinate.
export const cellIndex=(c,r)=>{if(!Number.isInteger(c)||!Number.isInteger(r)||c<0||r<0||c>=48||r>=48)return -1;const bank=Math.floor(c/24)+2*Math.floor(r/24),x=c%24,y=r%24;return bank*576+y*12+x+(x>=12?276:0)};
export const cellColumn=i=>{const local=+i%576;return (Math.floor(+i/576)%2)*24+local%12+(local>=288?12:0)};
export const cellRow=i=>Math.floor(+i/1152)*24+Math.floor((+i%576)/12)%24;
export const LAND_PLOTS=Object.freeze([{c:6,r:12},{c:0,r:12},...[16,20].flatMap(r=>[0,6].map(c=>({c,r}))),...[0,4,8,12,16,20].flatMap(r=>[12,18].map(c=>({c,r})))]);
export const LARGE_TERRITORIES=Object.freeze([{c:24,r:0},{c:0,r:24},{c:24,r:24}]);
export const expansionCount=cells=>{const total=cells.filter(v=>['grass','path','water','bed'].includes(v)).length;return Math.max(0,Math.min(21,total<=576?Math.round((total-144)/24):18+Math.floor((total-576)/576)))};
export const expansionPrice=n=>n>=21?null:n>=18?100000*2**(n-18):n===0?2500:n<4?5000:n<8?10000:n<12?20000:n<16?35000:50000;
export const expansionLevel=n=>n>=18?30:1;
export const expansionSize=n=>n>=18?576:24;
export const expansionTotal=n=>n<=18?144+n*24:576+(n-18)*576;
export const expansionAllowed=(n,level)=>n<21&&level>=expansionLevel(n);
export const ownedCell=(c,r,expanded=0)=>{if(cellIndex(c,r)<0)return false;if(c>=24||r>=24)return LARGE_TERRITORIES.slice(0,Math.max(0,expanded-18)).some(p=>c>=p.c&&c<p.c+24&&r>=p.r&&r<p.r+24);return (c<12&&r<12)||LAND_PLOTS.slice(0,Number(expanded)).some(p=>c>=p.c&&c<p.c+6&&r>=p.r&&r<p.r+4)};
export function landCells(n=0){const ids=[];for(let r=0;r<48;r++)for(let c=0;c<48;c++)if(ownedCell(c,r,n))ids.push(cellIndex(c,r));const cells=Array(Math.max(...ids)+1).fill('void');for(const i of ids)cells[i]='grass';return cells;}
const project=(c,r)=>[384+(c-r)*32,(c+r)*16];
export function landBounds(cells){let minX=0,maxX=768,maxY=384;cells.forEach((v,i)=>{if(!v||v==='void')return;const c=cellColumn(i),r=cellRow(i);for(const [x,y]of [project(c,r),project(c+1,r),project(c+1,r+1),project(c,r+1)]){minX=Math.min(minX,x);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}});return {x:minX-2,y:-2,width:maxX-minX+4,height:maxY+4};}
export function landBoundary(cells){const edges=new Map(),id=p=>p.join(',');cells.forEach((v,i)=>{if(!v||v==='void')return;const c=cellColumn(i),r=cellRow(i),ps=[project(c,r),project(c+1,r),project(c+1,r+1),project(c,r+1)];ps.forEach((a,j)=>{const b=ps[(j+1)%4],reverse=id(b)+'>'+id(a);if(edges.has(reverse))edges.delete(reverse);else edges.set(id(a)+'>'+id(b),[a,b]);});});let d='';while(edges.size){const [key,[a,b]]=edges.entries().next().value;edges.delete(key);d+='M'+a.join(' ')+'L'+b.join(' ');let next=b;while(id(next)!==id(a)){const entry=[...edges.entries()].find(([,e])=>id(e[0])===id(next));if(!entry)break;edges.delete(entry[0]);next=entry[1][1];d+='L'+next.join(' ');}d+='Z';}return d;}
