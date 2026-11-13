import {gait3D} from './character-gait3d.js';
// Anatomical two-link limbs; all distances in a fixed world coordinate system.
export const CLIPS=[
 ['idle','Дыхание',4.8,true,'A',0],['walk','Ходьба',1.2,true,'A',1],['sow','Посев',2.1,false,'A',2,'seed-release',.52],['water','Полив грядок',2.8,false,'A',3,'water',.55],['harvest','Сбор с грядок',2.4,false,'A',4,'harvest',.54],
 ['pick','Поднять предмет',2.4,false,'B',0,'grip',.4],['carry','Нести предмет',1.4,true,'B',1],['place','Поставить предмет',2.4,false,'B',2,'release',.68],['sit','Сесть',2.0,false,'B',3,'seat',.85],['stand','Встать',1.8,false,'B',4],
 ['bush','Сбор с кустов',2.2,false,'C',0,'harvest',.52],['tree','Сбор с деревьев',2.5,false,'C',1,'harvest',.52],['roots','Полив деревьев',2.8,false,'C',2,'water',.55],['dig','Копать',2.6,false,'C',3,'soil',.62],['plant','Посадить растение',2.5,false,'C',4,'plant',.56],
 ['feed','Покормить животных',2.2,false,'D',0,'feed',.5],['eggs','Собрать яйца',2.5,false,'D',1,'egg',.52],['milk','Дойка',2.4,true,'D',2,'milk',.5],['operate','Запустить фабрику',1.8,false,'D',3,'activate',.6],['goods','Забрать продукцию',2.4,false,'D',4,'grip',.4]
].map(([id,name,duration,loop,board,row,event,contact])=>({id,name,duration,loop,board,row,event,contact}));
const n={pelvis:[.49,.43],chest:[.5,.29],neck:[.5,.20],head:[.49,.13],shoulderL:[.28,.25],elbowL:[.27,.43],handL:[.31,.58],shoulderR:[.68,.25],elbowR:[.74,.43],handR:[.76,.56],hipL:[.38,.45],kneeL:[.33,.72],footL:[.305,.975],hipR:[.61,.45],kneeR:[.64,.72],footR:[.69,.975]};
export const BIND=Object.fromEntries(Object.entries(n).map(([k,[x,y]])=>[k,[x*80,y*120]]));
export const SEGMENTS=[['pelvis','chest'],['chest','neck'],['neck','head'],...['L','R'].flatMap(s=>[['chest','shoulder'+s],['shoulder'+s,'elbow'+s],['elbow'+s,'hand'+s],['pelvis','hip'+s],['hip'+s,'knee'+s],['knee'+s,'foot'+s]])];
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export const LENGTHS=Object.fromEntries(['L','R'].map(s=>[s,{arm:dist(BIND['shoulder'+s],BIND['elbow'+s]),forearm:dist(BIND['elbow'+s],BIND['hand'+s]),thigh:dist(BIND['hip'+s],BIND['knee'+s]),shin:dist(BIND['knee'+s],BIND['foot'+s])}]));
export function ik(a,b,l1,l2,bend){const dx=b[0]-a[0],dy=b[1]-a[1],d=Math.min(l1+l2-.00001,Math.max(Math.abs(l1-l2)+.00001,Math.hypot(dx,dy))),base=Math.atan2(dy,dx),v=Math.acos(Math.max(-1,Math.min(1,(l1*l1+d*d-l2*l2)/(2*l1*d))));return [[a[0]+l1*Math.cos(base+bend*v),a[1]+l1*Math.sin(base+bend*v)],[a[0]+d*Math.cos(base),a[1]+d*Math.sin(base)]];}
const smooth=t=>t*t*(3-2*t),pulse=t=>Math.sin(Math.PI*t)**2;
const profile={sow:[5,2,21],water:[7,3,23],harvest:[19,24,31],pick:[13,31,25],place:[13,31,25],sit:[5,33,8],stand:[5,33,8],bush:[7,6,26],tree:[2,1,16],roots:[9,8,26],dig:[17,18,25],plant:[17,34,28],feed:[4,2,25],eggs:[16,31,27],milk:[3,33,21],operate:[3,2,28],goods:[13,31,25]};
function foot(base,t,amp){const p=(t+1)%1;return [base[0]+amp*(p<.5?1-4*p:-1+4*(p-.5)),base[1]-(p<.5?0:Math.sin((p-.5)*2*Math.PI)*6)];}
export function sampleRig(id,t){if(!CLIPS.some(c=>c.id===id))throw Error('Unknown action');t=Math.max(0,Math.min(1,t));const j=Object.fromEntries(Object.entries(BIND).map(([k,v])=>[k,[...v]]));const gait=id==='walk'||id==='carry';let amount=pulse(t),lean=0,drop=0,reach=0;const spatial=gait?gait3D(BIND,LENGTHS,t,id==='carry'):null;
 if(profile[id]){[lean,drop,reach]=profile[id];if(id==='sit')amount=smooth(t);if(id==='stand')amount=1-smooth(t);if(id==='milk')amount=1;lean*=amount;drop*=amount;reach*=amount;}
 if(gait){lean=id==='carry'?3:0;drop=spatial.drop;j.footL=foot(BIND.footL,t,id==='carry'?5:8);j.footR=foot(BIND.footR,t+.5,id==='carry'?5:8);}
 const dx=lean,dy=drop;for(const k of ['pelvis','chest','neck','head','shoulderL','shoulderR','hipL','hipR']){j[k][1]+=dy;if(k!=='pelvis'&&!k.startsWith('hip'))j[k][0]+=dx;}
 if(id==='idle'){const b=Math.sin(t*2*Math.PI)*.25;j.chest[1]-=b;j.shoulderL[0]-=b*.7;j.shoulderR[0]+=b*.7;}
 let hands=[['L',[BIND.handL[0]+dx,BIND.handL[1]+dy]],['R',[BIND.handR[0]+dx,BIND.handR[1]+dy]]];
 if(profile[id]){const low=['harvest','pick','place','plant','eggs','dig','goods'].includes(id),high=id==='tree';const y=high?j.chest[1]-31:low?j.pelvis[1]+17:j.chest[1]+19;hands=hands.map(([s,p],i)=>[s,[p[0]+reach*(i? .65:1),p[1]+(y-p[1])*amount]]);}
 if(id==='carry'){hands=[['L',[j.chest[0]+6,j.chest[1]+20]],['R',[j.chest[0]+21,j.chest[1]+20]]];}
 if(id==='walk')hands.forEach(([s,p])=>p[0]+=Math.sin(t*2*Math.PI)*(s==='L'?-2.5:2.5));
 if(id==='milk')hands.forEach(([s,p])=>p[1]+=Math.sin(t*2*Math.PI)*(s==='L'?-1.5:1.5));
 for(const [s,target] of hands){const l=LENGTHS[s],[elbow,hand]=ik(j['shoulder'+s],target,l.arm,l.forearm,s==='L'?1:-1);j['elbow'+s]=elbow;j['hand'+s]=hand;const [knee,end]=ik(j['hip'+s],j['foot'+s],l.thigh,l.shin,s==='L'?1:-1);j['knee'+s]=knee;j['foot'+s]=end;}
 if(spatial)Object.assign(j,spatial.projected);return {joints:j,segments:SEGMENTS,spatial};}
