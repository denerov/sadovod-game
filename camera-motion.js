// Keep one world point under the moving midpoint of a two-finger gesture.
export function cameraZoomRange(boardWidth){return {min:.45,max:4*Math.max(1,boardWidth/772)}}
export function cameraAfterExpansion(previous,next,zoom,pan,baseWidth){
 const newZoom=zoom*next.width/previous.width,scale=baseWidth*zoom/previous.width;if(!(scale>0))return {zoom:newZoom,pan:{...pan}};
 const x=previous.x+previous.width/2-pan.x/scale,y=previous.y+previous.height/2-pan.y/scale;
 return {zoom:newZoom,pan:{x:(next.x+next.width/2-x)*scale,y:(next.y+next.height/2-y)*scale}};
}
export function pinchCamera(start,midpoint,distance,min=.45,max=4){
 const zoom=Math.max(min,Math.min(max,start.zoom*distance/Math.max(1,start.distance))),ratio=zoom/start.zoom;
 return {zoom,x:midpoint.x-(start.midpoint.x-start.x)*ratio,y:midpoint.y-(start.midpoint.y-start.y)*ratio};
}
export function zoomAround(current,zoom,x,y){
 const ratio=zoom/current.zoom;
 return {zoom,x:x+(current.x-x)*ratio,y:y+(current.y-y)*ratio};
}

// A wheel tick changes the destination. Interpolate in log scale so in and
// out feel symmetric. Use the same affine fraction for pan to hold the anchor.
export function zoomStep(current,target,elapsed){
 const distance=Math.log(target.zoom/current.zoom);
 if(Math.abs(distance)<.001)return target;
 const part=1-Math.exp(-elapsed/64);
 const fraction=Math.expm1(distance*part)/Math.expm1(distance);
 return {zoom:current.zoom*Math.exp(distance*part),x:current.x+(target.x-current.x)*fraction,y:current.y+(target.y-current.y)*fraction};
}
// Terrain and objects use the same world-to-screen projection on the same frame.
// The terrain bitmap cache owns landscape rasterisation; this SVG contains only
// live objects and interaction overlays, so it must stay at native screen size.
export class CameraLayer {
 constructor(plot){
  this.plot=plot;
  this.plot.style.willChange='auto';
  this.plot.style.backfaceVisibility='';
  this.plot.style.transform='none';
 }
 update(view){
  this.view=view;
  this.rebase();
 }
 rebase(){
  const {width,height,scale,x,y}=this.view;
  if(this.width!==width||this.height!==height){
   this.plot.style.width=width+'px';
   this.plot.style.height=height+'px';
   this.width=width;
   this.height=height;
  }
  const box=[-x/scale,-y/scale,width/scale,height/scale];
  this.plot.setAttribute('viewBox',box.join(' '));
 }
}
