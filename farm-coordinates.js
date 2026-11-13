(() => {
 // CSS translate/scale affects the rectangle. Account for the SVG's letterboxing
 // and viewBox padding, rather than relying on root-SVG CTM browser differences.
 function cellAtScreen(svg,x,y){
  const r=svg.getBoundingClientRect(),v=svg.viewBox.baseVal;
  const scale=Math.min(r.width/v.width,r.height/v.height);
  if(!Number.isFinite(scale)||scale<=0)return null;
  const wx=v.x+(x-r.left-(r.width-v.width*scale)/2)/scale;
  const wy=v.y+(y-r.top-(r.height-v.height*scale)/2)/scale;
  const column=Math.floor((wx-384)/64+wy/32),row=Math.floor(wy/32-(wx-384)/64);
  const index=window.SadovodGround?.cellIndex(column,row)??-1,cells=window.SadovodGround?.getCells();
  return index>=0&&cells?.[index]&&cells[index]!=='void'?{column,row}:null;
 }
 window.SadovodGrid=Object.freeze({cellAtScreen});
})();
