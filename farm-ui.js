import {installFarmAudio,mountAudioSettings} from './farm-audio.js?v=186';
import {createSurfaceMenu} from './surface-menu.js?v=182';
import {landBounds} from './land-model.js?v=182';
import {fitFarmViewport} from './mobile-layout.js?v=182';
import {CameraLayer,pinchCamera,cameraZoomRange,cameraAfterExpansion,zoomAround,zoomStep} from './camera-motion.js?v=301';
(() => {
 const integer=new Intl.NumberFormat('ru-RU');
 const compact=new Intl.NumberFormat('ru-RU',{notation:'compact',maximumFractionDigits:1});
 document.querySelectorAll('[data-balance]').forEach(e=>{const n=Math.max(0,Number(e.dataset.balance)||0);(e.querySelector('.amount-value')||e).textContent=n>=1e9?compact.format(n):integer.format(n);e.setAttribute('aria-label','Баланс: '+integer.format(n))});
 const dock=document.querySelector('.dock'), surfaces=document.querySelector('.surface-menu'), view=document.querySelector('.farm-view');
 const surfacePicker=createSurfaceMenu(surfaces,dock.querySelector('[data-tool=landscape]'));
 view.dataset.tool='hand';
 const errorNotice=document.querySelector('.action-error');let errorTimer;window.addEventListener('sadovod:action-error',e=>{errorNotice.textContent=e.detail.message;errorNotice.hidden=false;clearTimeout(errorTimer);errorTimer=setTimeout(()=>errorNotice.hidden=true,4500)});
 window.addEventListener('sadovod:tool-selected',()=>{errorNotice.hidden=true;clearTimeout(errorTimer)});
 const dialog=document.querySelector('dialog'),plot=document.querySelector('.plot');let zoom=1,pan={x:0,y:0},drag=null;
 dialog.classList.add('settings-dialog');
 const settingsClose=dialog.querySelector('button');
 mountAudioSettings(dialog,installFarmAudio());
 const testControls=document.createElement('section');testControls.className='test-resources';testControls.hidden=true;testControls.innerHTML='<h3>Тестирование · временно</h3><p>Пополнить баланс до 1 000 000 ₽ и 10 000 угля.</p><button type="button" data-test-resources>Получить тестовые ресурсы</button><p>Открыть покупки и расширения для проверки игры.</p><button type="button" data-test-level>Уровень 100</button><span role="status" aria-live="polite"></span>';dialog.querySelector('h2').after(testControls);
 const levelButton=testControls.querySelector('[data-test-level]');testControls.querySelector('h3').after(levelButton);
 testControls.querySelector('button').addEventListener('click',()=>{const result=window.SadovodCrops?.grantTestResources();if(result)testControls.querySelector('[role="status"]').textContent='Готово: '+integer.format(result.coins)+' ₽ · '+integer.format(result.coal)+' угля';});
 testControls.querySelector('[data-test-level]').addEventListener('click',()=>{const level=window.SadovodCrops?.grantTestLevel();if(level)testControls.querySelector('[role="status"]').textContent='Готово: уровень '+level;});
 function select(button){dock.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)))}
 dock.addEventListener('click',e=>{const button=e.target.closest('[data-tool]');if(!button)return;select(button);const tool=button.dataset.tool;view.dataset.tool=tool;window.dispatchEvent(new CustomEvent('sadovod:tool-selected',{detail:{action:tool==='shovel'?'dig':tool==='watering'?'water':null}}));surfacePicker.setOpen(tool==='landscape'&&!surfacePicker.open(),e.detail===0);
  if(['market','stock'].includes(tool)){window.SadovodMarket?.open(tool,button);return}
  if(tool==='hangar'){window.SadovodHangar?.open();return}
  if(['settings'].includes(tool)){testControls.hidden=tool!=='settings';dialog.querySelector('h2').textContent=button.dataset.label;dialog.querySelector(':scope > p').textContent=({market:'Нет товаров.',stock:'Пока нет собранной продукции.',hangar:'0 из 30 мест занято. Здесь хранятся предметы декора, убранные с участка.',settings:'Масштаб участка можно менять кнопками слева от панели.'})[tool];dialog.showModal();dialog.scrollTop=0;levelButton.focus({preventScroll:true})}
 });
 surfaces.addEventListener('click',e=>{const b=e.target.closest('[data-surface]');if(!b)return;surfaces.querySelectorAll('[data-surface]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));view.dataset.surface=b.dataset.surface;window.dispatchEvent(new CustomEvent('sadovod:tool-selected',{detail:{action:b.dataset.surface==='path'?'rake':b.dataset.surface==='grass'?'dig':null}}));surfacePicker.setOpen(false)});
 settingsClose.addEventListener('click',()=>dialog.close());
 view.addEventListener('pointerleave',()=>window.dispatchEvent(new CustomEvent('sadovod:cell-hover',{detail:null})));
 const zoomSlider=document.querySelector('.zoom-slider');
 const minZoom=.45,pointers=new Map();let maxZoom=4,pinch=null,cameraCenterY=0,tapCandidate=null,baseWidth=0,lastWidth=0,lastHeight=0,lastDpr=0;
 let board={x:-2,y:-2,width:772,height:388},boardSignature='';
 window.addEventListener('sadovod:ground-changed',()=>{const cells=window.SadovodGround?.getCells();if(!cells)return;const next=landBounds(cells),signature=JSON.stringify(next);if(signature===boardSignature)return;stopZoom();const reframed=boardSignature?cameraAfterExpansion(board,next,zoom,pan,baseWidth):{zoom,pan};zoom=reframed.zoom;pan=reframed.pan;boardSignature=signature;board=next;maxZoom=cameraZoomRange(board.width).max;update();});
 const cameraLayer=new CameraLayer(plot);let cameraFrame=0,zoomTarget=null,zoomTime=null,cameraPublish=0,pendingCameraDetail=null,cameraPublished=false;
 function publishCamera(){cameraPublish=0;if(!pendingCameraDetail)return;window.dispatchEvent(new CustomEvent('sadovod:camera',{detail:pendingCameraDetail}));pendingCameraDetail=null;cameraPublished=true}
 const currentZoom=()=>({zoom,x:pan.x,y:pan.y});
 function stopZoom(){zoomTarget=null;zoomTime=null}
 function update(){
  if(!cameraFrame)cameraFrame=requestAnimationFrame(now=>{
   cameraFrame=0;
   if(zoomTarget){
    const elapsed=zoomTime===null?1000/60:Math.min(50,now-zoomTime);
    zoomTime=now;
    const next=zoomStep(currentZoom(),zoomTarget,elapsed);
    zoom=next.zoom;pan={x:next.x,y:next.y};
    if(next===zoomTarget)stopZoom();
   }
   commitCamera();
   if(zoomTarget)update();
  });
 }
 function commitCamera(){
  const width=view.clientWidth,height=view.clientHeight;
  zoom=Math.max(minZoom,Math.min(maxZoom,zoom));
  // Keep some of the field visible, without locking the camera when field and screen sizes match.
  const px=Math.max(0,(width+baseWidth*zoom)/2-Math.min(160,width*.2));
  const py=Math.max(0,(height+baseWidth*board.height/board.width*zoom)/2-Math.min(120,height*.2));
  pan.x=Math.max(-px,Math.min(px,pan.x));pan.y=Math.max(-py,Math.min(py,pan.y));
  const cameraDetail={width:width,height:height,scale:baseWidth*zoom/board.width,x:(width-baseWidth*zoom)/2+pan.x-board.x*baseWidth*zoom/board.width,y:(height-baseWidth*board.height/board.width*zoom)/2+pan.y+cameraCenterY-board.y*baseWidth*zoom/board.width};
  if(!width||!height||!(cameraDetail.scale>0))return;
  cameraLayer.update(cameraDetail);
  window.SadovodCameraView=cameraDetail;
  window.dispatchEvent(new CustomEvent('sadovod:camera-frame',{detail:cameraDetail}));
  // Camera consumers rebuild terrain LOD, object visibility and overlays. Do
  // not let any of that work run inside an active pan/zoom gesture: the whole
  // painted farm is already moving with the compositor transform. Publish the
  // final camera once after the gesture settles (initial layout is immediate).
  pendingCameraDetail=cameraDetail;
  clearTimeout(cameraPublish);
  if(!cameraPublished)publishCamera();else cameraPublish=setTimeout(publishCamera,280);
  if(zoomSlider){zoomSlider.value=String(Math.round(Math.log(zoom/minZoom)/Math.log(maxZoom/minZoom)*100));zoomSlider.setAttribute('aria-valuetext',Math.round(zoom*100)+'%');}
  document.querySelectorAll('[data-zoom]').forEach(button=>{button.disabled=Number(button.dataset.zoom)>0?zoom>=maxZoom-.001:zoom<=minZoom+.001;});
 }
 function queueZoom(factor,x=0,y=0){
  const from=zoomTarget||currentZoom();
  const next=Math.max(minZoom,Math.min(maxZoom,from.zoom*factor));
  if(next===from.zoom)return;
  zoomTarget=zoomAround(from,next,x,y);
  update();
 }
 zoomSlider?.addEventListener('input',()=>{stopZoom();zoom=minZoom*Math.pow(maxZoom/minZoom,Number(zoomSlider.value)/100);update()});
 document.querySelectorAll('[data-zoom]').forEach(b=>b.addEventListener('click',()=>queueZoom(Number(b.dataset.zoom)>0?1.2:1/1.2)));
 let machinePointer=null,wheelFrame=0,wheelDelta=0,wheelAnchor={x:0,y:0};
 view.addEventListener('wheel',e=>{
  e.preventDefault();
  if(!e.deltaY||pointers.size||machinePointer!==null)return;
  const rect=view.getBoundingClientRect(),unit=e.deltaMode===1?16:e.deltaMode===2?rect.height:1;
  // Safari/Chromium on Mac can send several trackpad wheel packets before one
  // animation frame. Applying every packet to an unfinished zoom target makes
  // the target run away and the farm visibly jumps between scales.
  wheelDelta+=e.deltaY*unit;
  wheelAnchor={x:e.clientX-rect.left-rect.width/2,y:e.clientY-rect.top-rect.height/2-cameraCenterY};
  if(!wheelFrame)wheelFrame=requestAnimationFrame(()=>{wheelFrame=0;const delta=Math.max(-32,Math.min(32,wheelDelta));wheelDelta=0;queueZoom(Math.exp(-delta*.00135),wheelAnchor.x,wheelAnchor.y)});
 },{passive:false});
 function midpoint(rect=pinch?.rect||view.getBoundingClientRect()){const [a,b]=[...pointers.values()];return {x:(a.x+b.x)/2-rect.left-rect.width/2,y:(a.y+b.y)/2-rect.top-rect.height/2-cameraCenterY}}
 function distance(){const [a,b]=[...pointers.values()];return Math.hypot(a.x-b.x,a.y-b.y)}
 view.addEventListener('dragstart',e=>e.preventDefault());
 view.addEventListener('pointerdown',e=>{
  if(e.target.closest?.('button,input,select,dialog,.dock,.view-controls,.surface-menu,.selection-tools'))return;
  if(machinePointer!==null)return;
  stopZoom();
  // The second finger belongs to the camera, not hit-testing or object placement.
  if(pointers.size){pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});view.setPointerCapture(e.pointerId);tapCandidate=null;window.SadovodDecor?.endDrag(false);drag=null;if(pointers.size===2){const rect=view.getBoundingClientRect();pinch={distance:distance(),zoom,x:pan.x,y:pan.y,midpoint:midpoint(rect),rect};}return;}
  const areaCell=window.SadovodGrid.cellAtScreen(plot,e.clientX,e.clientY);if(window.SadovodMachines?.beginArea(areaCell)){e.preventDefault();machinePointer=e.pointerId;view.setPointerCapture(e.pointerId);return;}
  if(e.target.closest?.('[data-decor-id]'))e.preventDefault();
  const hover=window.SadovodGrid.cellAtScreen(plot,e.clientX,e.clientY);window.dispatchEvent(new CustomEvent('sadovod:cell-hover',{detail:hover?{...hover,x:e.clientX,y:e.clientY}:null}));
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});view.dataset.dragging='true';
  // The camera owns capture and decides once whether this gesture is a cell tap.
  view.setPointerCapture(e.pointerId);
  tapCandidate=pointers.size===1?{id:e.pointerId,x:e.clientX,y:e.clientY,objectId:window.SadovodDecor?.resolveHit?window.SadovodDecor.resolveHit(e.clientX,e.clientY,e.target.closest?.('[data-decor-id]')?.dataset.decorId):e.target.closest?.('[data-decor-id]')?.dataset.decorId}:null;
  if(pointers.size===2){window.SadovodDecor?.endDrag(false);pinch={distance:distance(),zoom};drag=null}
  else{drag={x:e.clientX,y:e.clientY,px:pan.x,py:pan.y};const id=tapCandidate?.objectId;if(id&&!window.SadovodMachines?.selecting()&&document.querySelector('.dock [aria-pressed="true"]')?.dataset.tool==='hand'&&window.SadovodDecor?.beginDrag(id,e.clientX,e.clientY))drag.objectId=id;}
 });
 view.addEventListener('pointermove',e=>{
  if(machinePointer===e.pointerId){window.SadovodMachines?.updateArea(window.SadovodGrid.cellAtScreen(plot,e.clientX,e.clientY));return;}
  if(!pointers.has(e.pointerId)){const obj=window.SadovodMachines?.selecting()&&window.SadovodMachines?.objectTarget()&&window.SadovodDecor?.getObjects().find(o=>o.id===e.target.closest?.('[data-decor-id]')?.dataset.decorId);const cell=obj?{column:obj.column,row:obj.row}:window.SadovodGrid.cellAtScreen(plot,e.clientX,e.clientY);window.dispatchEvent(new CustomEvent('sadovod:cell-hover',{detail:cell?{...cell,x:e.clientX,y:e.clientY}:null}));return;}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2&&pinch){const next=pinchCamera(pinch,midpoint(),distance(),minZoom,maxZoom);zoom=next.zoom;pan={x:next.x,y:next.y};update()}
  else if(drag){
   if(tapCandidate&&Math.hypot(e.clientX-tapCandidate.x,e.clientY-tapCandidate.y)<=8)return;
   tapCandidate=null;if(window.SadovodMachines?.selecting()){const cell=window.SadovodGrid.cellAtScreen(plot,e.clientX,e.clientY);if(cell)window.dispatchEvent(new CustomEvent('sadovod:cell-hover',{detail:{...cell,x:e.clientX,y:e.clientY}}));return;}if(drag.objectId){window.SadovodDecor?.moveDrag(e.clientX,e.clientY);return}pan={x:drag.px+e.clientX-drag.x,y:drag.py+e.clientY-drag.y};update()
  }
 });
 function endPointer(e){
  if(machinePointer===e.pointerId){machinePointer=null;window.SadovodMachines?.endArea(Number.isFinite(e.clientX)?window.SadovodGrid.cellAtScreen(plot,e.clientX,e.clientY):null,e.type==='pointercancel');return;}
  const objectGesture=drag?.objectId&&pointers.size===1;const tap=objectGesture?null:tapCandidate;tapCandidate=null;if(objectGesture)window.SadovodDecor?.endDrag(e.type!=='pointercancel');
  if(e.type!=='pointercancel'&&tap&&tap.id===e.pointerId&&pointers.size===1&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)<=8){
   const hand=document.querySelector('.dock [aria-pressed="true"]')?.dataset.tool==='hand';const object=hand&&tap.objectId&&window.SadovodDecor?.getObjects().find(o=>o.id===tap.objectId);
   const cell=object&&(!window.SadovodMachines?.selecting()||window.SadovodMachines?.objectTarget())&&!window.SadovodDecor?.isMoving()?{column:object.column,row:object.row}:window.SadovodGrid.cellAtScreen(plot,e.clientX,e.clientY);
   if(cell)window.dispatchEvent(new CustomEvent('sadovod:cell-tap',{detail:{...cell,objectId:hand?tap.objectId:null,pointerX:e.clientX,pointerY:e.clientY,tool:document.querySelector('.dock [aria-pressed="true"]')?.dataset.tool}}));
  }
  pointers.delete(e.pointerId);if(!pointers.size)delete view.dataset.dragging;pinch=null;drag=null;if(pointers.size===1){const a=[...pointers.values()][0];drag={x:a.x,y:a.y,px:pan.x,py:pan.y}}
 }
 view.addEventListener('pointerup',endPointer);view.addEventListener('pointercancel',endPointer);view.addEventListener('lostpointercapture',e=>endPointer({type:'pointercancel',pointerId:e.pointerId}));window.addEventListener('blur',()=>{stopZoom();if(wheelFrame){cancelAnimationFrame(wheelFrame);wheelFrame=0;wheelDelta=0}if(machinePointer!==null){machinePointer=null;window.SadovodMachines?.endArea(null,true);}window.SadovodDecor?.endDrag(false);pointers.clear();delete view.dataset.dragging;pinch=null;drag=null;tapCandidate=null});
 document.querySelectorAll('.currency').forEach(b=>b.addEventListener('click',()=>{const on=b.dataset.tip!=='true';document.querySelectorAll('.currency').forEach(x=>x.dataset.tip='false');b.dataset.tip=String(on)}));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){surfacePicker.setOpen(false);document.querySelectorAll('.currency').forEach(x=>x.dataset.tip='false')}});
 function fitViewport(){
  const w=document.documentElement.clientWidth,h=document.documentElement.clientHeight;
  if(w===lastWidth&&h===lastHeight&&lastDpr===window.devicePixelRatio)return;lastWidth=w;lastHeight=h;lastDpr=window.devicePixelRatio;stopZoom();
  const fit=fitFarmViewport(w,h,matchMedia('(pointer:coarse)').matches),{hs,ds,top,bottom}=fit;
  const root=document.documentElement;
  root.style.setProperty('--hud-scale',hs);
  root.style.setProperty('--dock-scale',ds);
  cameraCenterY=fit.centerY;
  root.style.setProperty('--field-center-y',cameraCenterY+'px');
  root.style.setProperty('--field-top',top+'px');
  root.style.setProperty('--field-bottom',bottom+'px');
  baseWidth=fit.baseWidth;root.style.setProperty('--field-width',baseWidth+'px');
  centerAmounts();
  update();
 }
 window.addEventListener('resize',fitViewport);
 window.addEventListener('pageshow',()=>{lastWidth=0;fitViewport()});
 new ResizeObserver(fitViewport).observe(document.documentElement);
 if(window.visualViewport)window.visualViewport.addEventListener('resize',fitViewport);
 fitViewport();

 // One live HUD state: the medallion contains text, never a baked-in numeral.
 const hudKey='sadovod-hud-state-v1';
 let hudState={level:1,xp:0,ruble:0,coal:0,fuel:0};
 try{const saved=JSON.parse(localStorage.getItem(hudKey)||'null');if(saved&&typeof saved==='object')hudState={...hudState,...saved};}catch{}

 function centerAmounts(){
  document.querySelectorAll('.amount').forEach(el=>{
   const text=el.querySelector('.amount-value');if(!text)return;
   const width=el.parentElement?.clientWidth||300,height=60;
   el.setAttribute('viewBox',`0 0 ${width} ${height}`);
   text.setAttribute('x','0');text.setAttribute('y','0');text.setAttribute('font-size','29');
   let b=text.getBBox();if(!b.width||!b.height)return;
   // Center the live balance in the enamel area to the right of the original currency icon.
   text.setAttribute('font-size',String(29*Math.min(1,Math.max(50,width-90)/b.width,34/b.height)));
   b=text.getBBox();text.setAttribute('x',String((72+width-12)/2-b.x-b.width/2));text.setAttribute('y',String(height/2-b.y-b.height/2));
  });
 }
 function centerLevelNumeral(){
  if(window.SadovodLevelGlyphs){window.SadovodLevelGlyphs.draw(document.querySelector('.level-outline'),hudState.level);return}
  const text=document.querySelector('.level-value');
  text.setAttribute('x','0');text.setAttribute('y','0');
  text.setAttribute('font-size','50');
  let b=text.getBBox();
  if(!b.width||!b.height)return;
  const size=50*Math.min(1,58/b.width,45/b.height);
  text.setAttribute('font-size',String(size));b=text.getBBox();
  // Center actual painted glyph bounds inside the original medallion aperture.
  text.setAttribute('x',String(70-b.x-b.width/2));
  text.setAttribute('y',String(55-b.y-b.height/2));
 }
 if(document.fonts)document.fonts.ready.then(()=>{centerLevelNumeral();centerAmounts()});
 function renderHud(patch={},persist=false){
  for(const key of ['level','xp','ruble','coal','fuel'])if(Number.isFinite(Number(patch[key])))hudState[key]=Math.max(0,Math.floor(Number(patch[key])));
  hudState.level=Math.max(1,Math.min(200,hudState.level));hudState.xp=Math.min(100,hudState.xp);
  const level=document.querySelector('.level');level.setAttribute('aria-label','Уровень '+hudState.level+' из 200');
  level.querySelector('.level-value').textContent=String(hudState.level);level.querySelector('progress').value=hudState.xp;const caption=level.querySelector('.level-caption');if(caption)caption.textContent=Number.isFinite(patch.xpCurrent)&&Number.isFinite(patch.xpNext)?`${integer.format(patch.xpCurrent)} / ${integer.format(patch.xpNext)}`:`${hudState.xp}%`;
  ['ruble','coal','fuel'].forEach((key,i)=>{const el=document.querySelectorAll('.amount')[i];el.dataset.balance=String(hudState[key]);(el.querySelector('.amount-value')||el).textContent=hudState[key]>=1e9?compact.format(hudState[key]):integer.format(hudState[key]);el.setAttribute('aria-label','Баланс: '+integer.format(hudState[key]));});
  if(persist)try{window.SadovodSave.setItem(hudKey,JSON.stringify(hudState));}catch{}
  centerAmounts();centerLevelNumeral();
 }
 window.SadovodHUD=Object.freeze({update:patch=>renderHud(patch,true),getState:()=>({...hudState})});
 window.addEventListener('sadovod:progress',event=>renderHud(event.detail||{},true));
 renderHud();

})();
