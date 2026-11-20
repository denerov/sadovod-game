export function surfaceMenuPosition(anchor,width,height,vw,vh){return {left:Math.max(8,Math.min(vw-width-8,anchor.left+anchor.width/2-width/2)),top:Math.max(8,Math.min(vh-height-8,anchor.top-height-18))};}
export function createSurfaceMenu(menu,trigger){
 document.body.append(menu);let opened=false,animations=[],closeTimer=0;menu.classList.add('surface-popover');
 const choices=[...menu.querySelectorAll('[data-surface]')];
 const copy={path:['Дорожки','Проложить дорожку','landscape'],grass:['Газон','Вернуть траву','grass'],water:['Вода','Создать пруд','water']};
 choices.forEach((button,i)=>{const [name,description,icon]=copy[button.dataset.surface];button.innerHTML=`<img src="./assets/dock-v149/${icon}.webp" alt=""><strong>${name}</strong><span>${description}</span>`;button.style.setProperty('--fan-angle',`${(i-1)*4}deg`);button.style.setProperty('--fan-lift',i===1?'-10px':'0px');});
 function position(){if(menu.hidden)return;const a=trigger.getBoundingClientRect(),p=surfaceMenuPosition(a,menu.offsetWidth,menu.offsetHeight,innerWidth,innerHeight);menu.style.left=p.left+'px';menu.style.top=p.top+'px';}
 function setOpen(next,focus=false){opened=next;clearTimeout(closeTimer);animations.forEach(a=>a.cancel());animations=[];trigger.setAttribute('aria-expanded',String(next));menu.inert=!next;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(next){menu.hidden=false;position();if(!reduced){const origin=trigger.getBoundingClientRect();choices.forEach((button,i)=>{if(!button.animate)return;const r=button.getBoundingClientRect(),dx=origin.left+origin.width/2-r.left-r.width/2,dy=origin.top-r.top;animations.push(button.animate([{opacity:0,transform:`translate(${dx}px,${dy}px) scale(.3) rotate(0deg)`},{opacity:1,transform:`translateY(${i===1?-10:0}px) scale(1) rotate(${(i-1)*4}deg)`}],{duration:340,delay:i*45,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'}));});}if(focus)choices[0].focus();
  }else if(!menu.hidden){if(!reduced){choices.forEach((button,i)=>{if(button.animate)animations.push(button.animate([{opacity:1},{opacity:0,transform:'translateY(24px) scale(.85)'}],{duration:150,delay:(2-i)*20,fill:'forwards',easing:'ease-in'}));});closeTimer=setTimeout(()=>{if(!opened)menu.hidden=true;},200);}else menu.hidden=true;}
 }
 document.addEventListener('pointerdown',e=>{if(opened&&!menu.contains(e.target)&&!trigger.contains(e.target))setOpen(false)});
 window.addEventListener('resize',position);window.visualViewport?.addEventListener('resize',position);
 menu.addEventListener('keydown',e=>{if(e.key==='Escape'){setOpen(false);trigger.focus();}const i=choices.indexOf(document.activeElement);if(i>=0&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();choices[(i+(e.key==='ArrowRight'?1:choices.length-1))%choices.length].focus();}});
 return {open:()=>opened,setOpen,toggle:()=>setOpen(!opened)};
}
