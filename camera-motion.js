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
// Keep a padded raster at screen size, independent of farm size or zoom.
// Inside that padding, camera motion is a single compositor transform.
export class CameraLayer {
 constructor(plot){this.plot=plot;this.timer=0;this.plot.style.willChange='transform';this.plot.style.backfaceVisibility='hidden'}
 update(view){
  this.view=view;
  const raster=this.raster;
  if(!raster||view.width!==raster.width||view.height!==raster.height){
   this.rebase();
   return;
  }
  const ratio=view.scale/raster.scale;
  const x=view.x+(view.width/2-raster.x)*ratio-view.width/2;
  const y=view.y+(view.height/2-raster.y)*ratio-view.height/2;
  clearTimeout(this.timer);
  // Stay compositor-only while the overscanned scene covers the viewport.
  // Once zoom-out would expose its rectangular edge, rebase immediately.
  // The larger overscan means this happens only at sparse coverage boundaries,
  // not at every wheel frame as in the previous implementation.
  // Never rebuild the SVG in the middle of a gesture. A synchronous viewBox
  // change invalidates the whole SVG raster and is perceived as a white/green
  // flash with objects briefly missing. The settled timer below performs one
  // rebuild after wheel/pinch input stops.
  this.plot.style.transform=`translate3d(${x}px,${y}px,0) scale(${ratio})`;
  if(ratio!==1||x||y)this.timer=setTimeout(()=>this.rebase(),220);
 }
 rebase(){
  clearTimeout(this.timer);
  const {width,height,scale,x,y}=this.view;
  // Overscan hides the SVG rectangle during fast pan and zoom without a
  // mid-gesture rebuild. It remains bounded by the screen, not farm size.
  // A complete zoom-out from the normal 100% view is 1/.45 = 2.22x.
  // Keep that whole range in the already-painted surface so a wheel gesture
  // never crosses an SVG viewBox rebuild boundary.  The previous 1.72–2x
  // buffer forced a synchronous SVG repaint in the middle of the gesture.
  // The old 2.45x buffer turned the SVG into an enormous GPU texture,
  // especially on high-DPI phones. Keep only a modest compositor gutter and
  // repaint the final view once after the gesture settles.
  const overscan=matchMedia('(pointer:coarse)').matches?1.58:1.82;
  const paintWidth=Math.ceil(width*overscan),paintHeight=Math.ceil(height*overscan);
  const padX=(paintWidth-width)/2,padY=(paintHeight-height)/2;
  if(!this.raster||this.raster.width!==width||this.raster.height!==height){
   this.plot.style.width=paintWidth+'px';
   this.plot.style.height=paintHeight+'px';
  }
  const box=[(-x-padX)/scale,(-y-padY)/scale,paintWidth/scale,paintHeight/scale];
  this.plot.setAttribute('viewBox',box.join(' '));
  // Limit the SVG luminance mask to the same raster. Its default world bounds
  // would otherwise grow into a much larger pixel surface when zooming in.
  const turfMask=this.plot.querySelector?.('[data-camera-turf-mask]');
  if(turfMask)for(const [i,attr] of ['x','y','width','height'].entries())turfMask.setAttribute(attr,box[i]);
  this.plot.style.transform='translate3d(0,0,0)';
  this.raster={...this.view,paintWidth,paintHeight};
 }
}
