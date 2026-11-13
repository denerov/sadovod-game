(() => {
  // Local 2D rib-cage deformation; head, pelvis and feet stay fixed.
  const poses=new Map(),motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let frame=0,last=0;
  function phase(time){const t=(time%4.8)/4.8;return t<.38?(1-Math.cos(Math.PI*t/.38))/2:(1+Math.cos(Math.PI*(t-.38)/.62))/2}
  function offset(y,time,strength=1){
    if(y<=.19||y>=.52)return {width:1,lift:0};
    const p=phase(time),gate=Math.sin(Math.PI*(y-.19)/.33);
    return {width:1+.012*p*gate*gate*strength,lift:-.0014*p*gate*gate*strength};
  }
  function draw(canvas,image,time,strength=1){
    const ctx=canvas.getContext?.('2d');if(!ctx)return;
    const w=450,h=724;ctx.clearRect(0,0,w,h);
    if(!time){ctx.drawImage(image,0,0,w,h);return}
    for(let y=0;y<h;y+=4){const o=offset(y/h,time,strength),width=w*o.width,sh=Math.min(5,h-y);ctx.drawImage(image,0,y,w,sh,(w-width)/2,y+h*o.lift,width,sh)}
  }
  function tick(time){frame=0;if(document.hidden||motion?.matches)return;
    if(time-last>=40){last=time;for(const [canvas,pose] of poses)if(canvas.classList.contains('active'))draw(canvas,pose.image,time/1000,pose.strength)}
    frame=requestAnimationFrame(tick);
  }
  function resume(){if(frame)cancelAnimationFrame(frame);frame=0;
    if(motion?.matches){for(const [canvas,pose] of poses)draw(canvas,pose.image,0);return}
    if(!document.hidden&&poses.size)frame=requestAnimationFrame(tick);
  }
  document.addEventListener('visibilitychange',resume);motion?.addEventListener?.('change',resume);
  window.CharacterBreathing={phase,offset,setImage(canvas,image,{strength=1}={}){canvas.width=450;canvas.height=724;poses.set(canvas,{image,strength});draw(canvas,image,0);resume()}};
})();
