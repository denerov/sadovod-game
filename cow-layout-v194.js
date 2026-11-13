// Exact cell-space layout. Art never defines the footprint or fence height.
export const COW_LAYOUT=Object.freeze({size:3,pixelsPerWorld:4,width:1024,height:1024,anchorX:512,anchorY:640});
export function cowRotate([c,r],rotation){for(let i=0;i<rotation;i++)[c,r]=[3-r,c];return [c,r];}
export function cowPoint([c,r]){return [512+(c-r)*128,640+(c+r-3)*64];}
export const cowGround=[[0,0],[3,0],[3,3],[0,3]].map(cowPoint);
export function cowLayout(rotation){
 const edges=[];
 // Inset the post centres; shorten the rails by overlap, NOT image scaling.
 const inset=.09,step=(3-2*inset)/3;
 for(let side=0;side<4;side++)for(let n=0;n<3;n++){
  const ends=[[inset+n*step,inset],[inset+(n+1)*step,inset]].map(p=>cowRotate(p,side));
  const turned=ends.map(p=>cowRotate(p,rotation)),a=cowPoint(turned[0]),b=cowPoint(turned[1]);
  edges.push({side:(side+rotation)%4,gate:side===2&&n===1,ends:turned,center:[(a[0]+b[0])/2,(a[1]+b[1])/2],depth:turned[0][0]+turned[0][1]+turned[1][0]+turned[1][1],span:step});
 }
 return {edges:edges.sort((a,b)=>a.depth-b.depth),barn:cowPoint(cowRotate([1.5,1],rotation)),residents:[[.8,2.2],[2.05,2.2]].map(p=>cowPoint(cowRotate(p,rotation)))};
}
