// Fullscreen requests stay inside a user click; saved farm data is never changed.
export function fullscreenHost(win){try{if(win.parent!==win&&win.parent.location.origin===win.location.origin)return win.parent;}catch{}return win;}
export function isStandalone(win){return !!(win.navigator.standalone||win.matchMedia?.('(display-mode: standalone)').matches||win.matchMedia?.('(display-mode: fullscreen)').matches);}
export function installFullscreen(win=document.defaultView){
 const doc=win.document,host=fullscreenHost(win),hd=host.document,root=hd.documentElement;
 const settings=doc.querySelector('dialog[aria-labelledby="menu-title"]'),controls=doc.querySelector('.view-controls');if(!settings||!controls)return;
 const compact=doc.createElement('button');compact.type='button';compact.className='fullscreen-toggle';compact.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/></svg>';controls.prepend(compact);
 const action=doc.createElement('button');action.type='button';action.className='fullscreen-setting';settings.append(action);
 const help=doc.createElement('dialog');help.className='fullscreen-help';help.setAttribute('aria-labelledby','fullscreen-title');help.innerHTML='<h2 id="fullscreen-title">Игра на весь экран</h2><p>На iPhone откройте игру в Safari, нажмите «Поделиться» → «На экран Домой». Оставьте включённым «Открывать как веб-приложение» и запускайте «Садовод» с появившегося значка.</p><p>Если игра открыта внутри ChatGPT, сначала откройте её отдельно.</p><a target="_blank" rel="noopener" href="https://sadovod-render-rebuild.ddenerov.chatgpt.site/farm.html">Открыть игру отдельно</a><form method="dialog"><button>Понятно</button></form>';doc.body.append(help);
 const active=()=>!!(hd.fullscreenElement||hd.webkitFullscreenElement);
 function sync(){const standalone=isStandalone(host);compact.hidden=standalone;action.disabled=standalone;const label=standalone?'Игра уже на весь экран':active()?'Выйти из полного экрана':'На весь экран';compact.setAttribute('aria-label',label);compact.title=label;compact.setAttribute('aria-pressed',String(active()));action.textContent=label;}
 async function toggle(){settings.close();try{if(active()){const exit=hd.exitFullscreen||hd.webkitExitFullscreen;if(exit)await exit.call(hd);}else{const enter=root.requestFullscreen||root.webkitRequestFullscreen;if(!enter)throw Error('unsupported');await enter.call(root);}}catch{help.showModal();}sync();}
 compact.addEventListener('click',toggle);action.addEventListener('click',toggle);hd.addEventListener('fullscreenchange',sync);hd.addEventListener('webkitfullscreenchange',sync);host.addEventListener('pageshow',sync);sync();
}
if(typeof document!=='undefined')installFullscreen();
