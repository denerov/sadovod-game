import {cellColumn,cellRow} from './land-model.js?v=182';
import {waterContour,terrainRandom} from './terrain-details.js?v=254';
 const project=(c,r)=>[(c-r)*32+384,(c+r)*16];
 export function contour(cells,type){
  const edges=new Map(),id=p=>p.join(',');
  cells.forEach((v,i)=>{if(v!==type)return;const r=cellRow(i),c=cellColumn(i),ps=[project(c,r),project(c+1,r),project(c+1,r+1),project(c,r+1)];
   ps.forEach((a,j)=>{const b=ps[(j+1)%4],reverse=id(b)+'>'+id(a);if(edges.has(reverse))edges.delete(reverse);else edges.set(id(a)+'>'+id(b),[a,b])});
  });
  let d='';while(edges.size){const [firstKey,first]=edges.entries().next().value;edges.delete(firstKey);const loop=[first[0]],start=id(first[0]);let next=first[1];
   while(id(next)!==start){loop.push(next);const prev=loop[loop.length-2]||first[0],vx=next[0]-prev[0],vy=next[1]-prev[1];const turn=e=>{const wx=e[1][0]-e[0][0],wy=e[1][1]-e[0][1];const a=Math.atan2(vx*wy-vy*wx,vx*wx+vy*wy);return a<0?a+Math.PI*2:a};const entry=[...edges.entries()].filter(([,e])=>id(e[0])===id(next)).sort((a,b)=>turn(a[1])-turn(b[1])||a[0].localeCompare(b[0]))[0];if(!entry)break;edges.delete(entry[0]);next=entry[1][1]}
   // Remove straight cell vertices before rounding the shared shoreline.
   for(let j=loop.length-1;j>=0&&loop.length>3;j--){const a=loop[(j+loop.length-1)%loop.length],b=loop[j],c=loop[(j+1)%loop.length];if(Math.abs((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]))<.001)loop.splice(j,1)}
   // Recess the joined road slightly into its cells, then round both bends and ends.
   // Offset the complete boundary, never each tile, so adjacent road cells stay seamless.
   if(type==='path'){
    const original=loop.map(p=>[...p]),inset=.8;
    loop.forEach((p,j)=>{const a=original[(j+original.length-1)%original.length],b=original[(j+1)%original.length],ex=p[0]-a[0],ey=p[1]-a[1],fx=b[0]-p[0],fy=b[1]-p[1],el=Math.hypot(ex,ey),fl=Math.hypot(fx,fy),cross=ex*fy-ey*fx;
     if(el<.001||fl<.001||Math.abs(cross)<.001)return;
     const q=[p[0]-ey/el*inset,p[1]+ex/el*inset],z=[p[0]-fy/fl*inset,p[1]+fx/fl*inset],t=((z[0]-q[0])*fy-(z[1]-q[1])*fx)/cross;
     loop[j]=[q[0]+t*ex,q[1]+t*ey];
    });
   }
   if(type==='water'){d+=waterContour(loop);continue;}
   const corners=loop.map((p,j)=>{
    const radius=6+terrainRandom(Math.round(p[0]),Math.round(p[1]),719)*5;
    const near=q=>{const length=Math.hypot(q[0]-p[0],q[1]-p[1]),t=Math.min(.38,radius/length);return [p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]};
    return {p,a:near(loop[(j+loop.length-1)%loop.length]),b:near(loop[(j+1)%loop.length])};
   });
   d+='M'+corners[0].a.join(' ');
   corners.forEach(({p,b},j)=>{d+='Q'+p.join(' ')+' '+b.join(' ');const end=corners[(j+1)%corners.length].a,dx=end[0]-b[0],dy=end[1]-b[1],length=Math.hypot(dx,dy)||1;
    // Anchor edge detail to world distance, never corner index or total length.
    // Extending a road must not reshuffle every distant edge of its contour.
    const phase=b[0]*dx/length+b[1]*dy/length,stops=[0];
    for(let s=(Math.floor(phase/7)+1)*7-phase;s<length-.001;s+=7)if(s>.001)stops.push(s);
    stops.push(length);
    for(let k=0;k<stops.length-1;k++){const t=(stops[k]+stops[k+1])/(2*length),u=stops[k+1]/length,x=b[0]+dx*t,y=b[1]+dy*t,wobble=(Math.sin(x*.17+y*.13)*1.2+(terrainRandom(Math.floor(x/17),Math.floor(y/17),731)-.5)*3+(terrainRandom(Math.round(x*4),Math.round(y*4),729)-.5)*1.2)*Math.min(1,(stops[k+1]-stops[k])/7);d+='Q'+[x-dy/length*wobble,y+dx/length*wobble,b[0]+dx*u,b[1]+dy*u].join(' ')}
   });d+='Z';
  }return d;
 }
