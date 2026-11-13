export const DOCK_WIDTH=1280;
export const DOCK_HEIGHT=203.94627;
export function fitFarmViewport(w,h,coarse=false){const landscape=coarse&&w>h&&h<=600;const hs=landscape?Math.min(.62,(w-112)/1120):Math.min(.78,(w-64)/1120,h*.14/78);const dockWidth=landscape?Math.min(720,w-120):Math.min(960,w<760?w-12:w*.72);const ds=Math.min(dockWidth/DOCK_WIDTH,h*(landscape?.26:.20)/DOCK_HEIGHT);const top=(landscape?6:12)+78*hs+8,bottom=(landscape?5:12)+DOCK_HEIGHT*ds+10;return {hs,ds,top,bottom,centerY:(top-bottom)/2,baseWidth:Math.max(0,Math.min(w*.88,2*Math.max(0,h-top-bottom-18)))};}
