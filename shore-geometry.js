// Continuous closed contours. Every curve endpoint is retained, including closure.
export function flattenShore(d){
 const loops=[];let loop=null,p=[0,0];
 const add=q=>{loop.push(q);p=q};
 for(const part of d.match(/[MLQCZ][^MLQCZ]*/g)||[]){const type=part[0],v=(part.slice(1).match(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi)||[]).map(Number);
  if(type==='M'){loop=[];loops.push(loop);add(v);continue}
  if(type==='Z'){if(Math.hypot(p[0]-loop[0][0],p[1]-loop[0][1])>.001)add([...loop[0]]);continue}
  const a=p.slice(),end=v.slice(-2),n=Math.max(1,Math.ceil(Math.hypot(end[0]-a[0],end[1]-a[1])/2));
  for(let i=1;i<=n;i++){const t=i/n,u=1-t;add(type==='L'?[a[0]+(end[0]-a[0])*t,a[1]+(end[1]-a[1])*t]:type==='Q'?[u*u*a[0]+2*u*t*v[0]+t*t*v[2],u*u*a[1]+2*u*t*v[1]+t*t*v[3]]:[u*u*u*a[0]+3*u*u*t*v[0]+3*u*t*t*v[2]+t*t*t*v[4],u*u*u*a[1]+3*u*u*t*v[1]+3*u*t*t*v[3]+t*t*t*v[5]])}
 }return loops.filter(p=>p.length>3);
}
export function shoreSections(d){return flattenShore(d).map(loop=>{
 const ps=loop.slice(0,-1),out=ps.map((p,i)=>{const a=ps[(i+ps.length-1)%ps.length],b=ps[(i+1)%ps.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1,nx=-dy/length,ny=dx/length;
  const variation=.86+.14*Math.sin(p[0]*1.71+p[1]*.91),depth=(.7+1.7*Math.max(0,ny))*variation;
  return {x:p[0],y:p[1],nx,ny,depth};});out.push(out[0]);return out;
})}
