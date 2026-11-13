// Clip actual wood, not a full-height rectangle containing ground/shadow pixels.
export const GATE_LEAF={left:75,right:180};
const RISING=[[75,166],[180,110],[180,168],[75,220]];
const FALLING=[[75,109],[180,159],[180,217],[75,167]];
const BACK_LEFT=[[48,98],[63,91],[78,98],[78,166],[64,176],[48,168]];
const FRONT_RIGHT=[[178,159],[193,151],[209,158],[209,233],[194,241],[178,233]];
const FRONT_LEFT=[[47,158],[62,149],[80,156],[80,228],[63,240],[47,231]];
const BACK_RIGHT=[[179,100],[193,91],[208,98],[208,168],[194,176],[179,168]];
export function gateParts(rotation){return rotation%2?{leaf:RISING,posts:[FRONT_LEFT,BACK_RIGHT],hinge:180}:{leaf:FALLING,posts:[BACK_LEFT,FRONT_RIGHT],hinge:75};}
export function gateLeafMatrix(rotation,progress=1){const t=Math.max(0,Math.min(1,progress))*Math.PI/2,c=Math.abs(Math.cos(t))<1e-10?0:Math.cos(t),s=Math.sin(t),slope=rotation%2?-56/105:50/105,sign=rotation===0||rotation===3?1:-1,targetSlope=-slope,a=c+sign*s,b=slope*(c-1)+targetSlope*sign*s,hinge=gateParts(rotation).hinge;return [a,b,0,1,hinge*(1-a),-b*hinge];}
export function gateLeafPoint(rotation,p,progress=1){const [a,b,c,d,e,f]=gateLeafMatrix(rotation,progress);return {x:a*p.x+c*p.y+e,y:b*p.x+d*p.y+f};}
export function gateSourcePoint(rotation,p,progress=1){const [a,b,,,e,f]=gateLeafMatrix(rotation,progress);if(Math.abs(a)<1e-6)return null;const x=(p.x-e)/a;return {x,y:p.y-f-b*x};}
function inside(p,points){let result=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const [x,y]=points[i],[a,b]=points[j];if((y>p.y)!==(b>p.y)&&p.x<(a-x)*(p.y-y)/(b-y)+x)result=!result;}return result;}
export function gatePostHit(rotation,p){return gateParts(rotation).posts.some(poly=>inside(p,poly));}
export function gateHitPoint(rotation,p){const q=gateSourcePoint(rotation,p);return q&&inside(q,gateParts(rotation).leaf)?q:null;}

// The leaf has depth, not only a front image. Its orthogonal thickness axis
// rotates with the same angle as its width axis in the ground plane.
export function gateThickness(rotation,progress=1){
 const angle=Math.max(0,Math.min(1,progress))*Math.PI/2,c=Math.cos(angle),s=Math.sin(angle);
 const slope=rotation%2?-56/105:50/105,sign=rotation===0||rotation===3?1:-1;
 return {x:7*(c-sign*s),y:7*(-slope*c-slope*sign*s)};
}
export function gateVolumeHit(rotation,p){
 const d=gateThickness(rotation);
 for(const z of [-.5,0,.5])if(gateHitPoint(rotation,{x:p.x-d.x*z,y:p.y-d.y*z}))return true;
 return false;
}
