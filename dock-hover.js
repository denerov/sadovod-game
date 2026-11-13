// Icons move individually; the belt front remains above every icon.
export const dockInfluence=(distance,radius)=>Math.max(0,1-Math.abs(distance)/Math.max(1,radius))**2;
export function installDockHover(){
 const dock=document.querySelector('.dock');if(!dock)return;const buttons=[...dock.querySelectorAll('.dock-button')];
 buttons.forEach(b=>b.removeAttribute('title'));
 const tip=document.createElement('div');tip.className='dock-hover-label';tip.id='dock-hover-label';tip.setAttribute('role','tooltip');tip.hidden=true;document.body.append(tip);
 const mouse=matchMedia('(hover:hover) and (pointer:fine)');let target=null;
 function hide(){buttons.forEach(b=>{b.classList.remove('dock-raised');b.removeAttribute('aria-describedby')});tip.hidden=true;target=null;}
 function activate(button){if(target===button)return;hide();target=button;if(document.querySelector('dialog[open],.surface-popover:not([hidden])'))return;tip.textContent=button.dataset.label||button.getAttribute('aria-label');tip.hidden=false;const r=button.getBoundingClientRect(),scale=r.height/220;tip.style.left=Math.max(8,Math.min(innerWidth-tip.offsetWidth-8,r.left+r.width/2-tip.offsetWidth/2))+'px';tip.style.top=Math.max(8,r.top-tip.offsetHeight-9)+'px';button.setAttribute('aria-describedby',tip.id);}
 dock.addEventListener('pointermove',e=>{if(!mouse.matches||e.pointerType==='touch')return;const b=e.target.closest('.dock-button');if(b)activate(b);else hide();});
 dock.addEventListener('pointerleave',hide);dock.addEventListener('click',hide);dock.addEventListener('focusin',e=>{const b=e.target.closest('.dock-button');if(b&&mouse.matches)activate(b)});dock.addEventListener('focusout',hide);window.addEventListener('blur',hide);window.addEventListener('resize',hide);document.addEventListener('keydown',e=>{if(e.key==='Escape')hide()});
}
if(typeof document!=='undefined')installDockHover();
