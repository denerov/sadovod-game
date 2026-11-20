import './garden-intro.js?v=182';
const KEYS=['sadovod.character.v1','sadovod-layout-v77','sadovod-surfaces-v1','sadovod-paving-v1','sadovod-decor-v1','sadovod.farmer.cell.v1','sadovod-crops-v83','sadovod-orchard-v88','sadovod-starter-machinery-v88'];
const PENDING='sadovod-cloud-pending-v1';
const uuid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
// sessionStorage survives a deliberate reload/navigation, but is not shared
// across devices. The browser-local Web Lock still excludes duplicate tabs.
const SESSION_KEY='sadovod-writer-session-v208';
let sessionId;try{sessionId=sessionStorage.getItem(SESSION_KEY);if(!sessionId){sessionId=uuid();sessionStorage.setItem(SESSION_KEY,sessionId)}}catch{sessionId=uuid()}
const snapshot=()=>Object.fromEntries(KEYS.map(k=>[k,localStorage.getItem(k)]).filter(([,v])=>v!==null));
const backup=(state=snapshot())=>{const value=JSON.stringify(state);if(localStorage.getItem('sadovod-cloud-backup-1')===value)return;for(let i=3;i>1;i--){const old=localStorage.getItem('sadovod-cloud-backup-'+(i-1));if(old)localStorage.setItem('sadovod-cloud-backup-'+i,old)}localStorage.setItem('sadovod-cloud-backup-1',value)};
const identical=(a,b)=>KEYS.every(k=>a?.[k]===b?.[k]);
function panel(text,action,label){let n=document.getElementById('cloud-message');if(!n){n=document.createElement('div');n.id='cloud-message';n.setAttribute('role','status');Object.assign(n.style,{position:'fixed',inset:'0',zIndex:'2147483647',background:'#10271999',color:'#fff2cd',font:'18px Georgia,serif',display:'grid',placeContent:'center',gap:'18px',textAlign:'center',padding:'24px'});document.body.append(n)}n.replaceChildren();const p=document.createElement('p');p.textContent=text;p.style.maxWidth='540px';n.append(p);if(action){const b=document.createElement('button');b.textContent=label;Object.assign(b.style,{padding:'12px 20px',color:'#fff2cd',background:'#38623b',border:'1px solid #c7aa65',borderRadius:'12px',font:'inherit',cursor:'pointer'});b.onclick=action;n.append(b)}return n;}
async function request(options={},url='/api/farm'){const r=await fetch(url,{cache:'no-store',credentials:'same-origin',...options,headers:{...options.headers,'X-Sadovod-Session':sessionId},signal:AbortSignal.timeout(12000)});if(!r.ok){const e=new Error('save');e.status=r.status;throw e}return r.json()}
const claimSession=takeover=>request({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,takeover})},'/api/farm-session');
function offerTakeover(done){
 const show=(extra='')=>panel(extra+'Ферма открыта на другом устройстве. Можно продолжить здесь с последнего серверного сохранения. Другое устройство будет приостановлено; несохранённые изменения останутся в его резервной копии.',async()=>{
  panel('Переключаем игровую сессию…');
  try{const result=await claimSession(true);if(!result.acquired)throw Error('session_not_acquired');backup();localStorage.removeItem(PENDING);done()}
  catch{show('Не удалось переключиться. Проверьте соединение и повторите. ')}
 },'Продолжить на этом устройстве');
 show();
}
async function acquireRemoteSession(){
 const result=await claimSession(false);
 if(result.acquired)return;
 await new Promise(resolve=>offerTakeover(resolve));
}
let statusTimer;
function status(text){clearTimeout(statusTimer);let n=document.getElementById('cloud-status');if(!n){n=document.createElement('div');n.id='cloud-status';n.setAttribute('role','status');document.body.append(n)}const quiet=text==='Ферма сохранена'||text==='Сохраняем…';Object.assign(n.style,{position:'fixed',top:'auto',bottom:'max(5px,env(safe-area-inset-bottom))',right:'max(10px,env(safe-area-inset-right))',zIndex:'10000',padding:quiet?'0':'5px 9px',background:quiet?'transparent':'#173b2cee',color:quiet?'#e8e4cd':'#fff0c8',opacity:quiet?'.45':'1',borderRadius:quiet?'0':'8px',font:quiet?'10px/14px Georgia,serif':'13px/18px Georgia,serif',pointerEvents:'none'});n.textContent=text;if(text==='Ферма сохранена')statusTimer=setTimeout(()=>n.remove(),1000);}

const permanentSaveErrors={
 400:'Сервер не принял формат сохранения. Прогресс сохранён на этом устройстве; общее сохранение не изменено.',
 401:'Сеанс входа завершился. Прогресс сохранён на этом устройстве. Войдите в тот же аккаунт и повторите.',
 403:'Нет доступа к общему сохранению. Прогресс сохранён на этом устройстве. Проверьте аккаунт и повторите.',
 413:'Сохранение превысило допустимый размер. Прогресс сохранён на этом устройстве; требуется исправление лимита сохранений.'
};
// Only the outer document owns the save session; its game iframe shares it.
// Hold the browser lock until this document is destroyed, not just during PUT.
async function acquireSession(){
 if(typeof navigator==='undefined'||!navigator.locks)return true;
 return new Promise((resolve,reject)=>{
  navigator.locks.request('sadovod-farm-writer-v197',{ifAvailable:true},lock=>{
   if(!lock){panel('Ферма уже открыта в другой вкладке этого браузера. Продолжайте там или закройте её и откройте игру здесь.',()=>location.reload(),'Открыть после закрытия другой вкладки');resolve(false);return;}
   resolve(true);return new Promise(()=>{});
  }).catch(reject);
 });
}
async function owner(){let remote=await request(),revision=remote.revision,inflight=null,dirty=false,blocked=false,savePaused=false,timer,polling=false,changeVersion=0;
if(remote.sessionOwned===false){await new Promise(resolve=>offerTakeover(resolve));remote=await request();revision=remote.revision;if(remote.sessionOwned===false)throw Object.assign(Error('session_taken'),{status:423});}
const apply=s=>{backup();for(const k of KEYS){if(s[k]===undefined)localStorage.removeItem(k);else localStorage.setItem(k,s[k])}};
let pending;try{pending=JSON.parse(localStorage.getItem(PENDING))}catch{}
if(remote.snapshot){if(pending){if(identical(pending.snapshot,remote.snapshot)){if(pending.latest){const r=await request({method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({snapshot:pending.latest,revision,writeId:uuid()})});revision=r.revision;remote.snapshot=pending.latest}localStorage.removeItem(PENDING);}else if(pending.revision===revision){const r=await request({method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(pending)});revision=r.revision;remote.snapshot=pending.snapshot;if(pending.latest){const next=await request({method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({snapshot:pending.latest,revision,writeId:uuid()})});revision=next.revision;remote.snapshot=pending.latest}localStorage.removeItem(PENDING)}else{await new Promise((resolve,reject)=>panel('На другом устройстве ферма уже изменилась. Местная копия сохранена. Загрузить последнее общее сохранение?',async()=>{try{const fresh=await request();if(!fresh.snapshot)throw Error('missing_farm');backup();localStorage.removeItem(PENDING);remote=fresh;revision=fresh.revision;resolve()}catch(e){reject(e)}},'Загрузить общую ферму'))}}
apply(remote.snapshot);
}else{const local=snapshot();if(!local['sadovod-decor-v1']||!local['sadovod-surfaces-v1']){panel('Сначала откройте игру на компьютере с вашей готовой фермой и нажмите «Сохранить эту ферму». После этого она появится здесь.',()=>location.reload(),'Проверить сохранение');return false}
await new Promise((resolve,reject)=>panel('Использовать ферму с этого устройства на всех ваших устройствах? Сохранятся расстановка, посадки и ресурсы.',async()=>{try{panel('Сохраняем вашу ферму…');backup();const record={snapshot:snapshot(),revision:0,writeId:uuid()};localStorage.setItem(PENDING,JSON.stringify(record));const result=await request({method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(record)});revision=result.revision;localStorage.removeItem(PENDING);resolve()}catch(e){reject(e)}},'Сохранить эту ферму'));
}
let observedLocal=snapshot(),confirmed=observedLocal;
const stopForConflict=(text,foreignLocal=false,sessionLost=false)=>{
 if(blocked)return;blocked=true;clearTimeout(timer);backup(observedLocal);
 if(sessionLost){offerTakeover(()=>location.reload());return;}
 // Do not erase a neighbouring tab's shared journal or flush this stale model.
 panel(text,()=>{if(!foreignLocal)localStorage.removeItem(PENDING);location.reload()},foreignLocal?'Открыть после закрытия другой вкладки':'Загрузить последнее сохранение');
};
const canWrite=()=>{
 if(blocked)return false;
 if(!identical(snapshot(),observedLocal)){
  stopForConflict('Другая вкладка изменила ферму. Эта вкладка приостановлена, её копия сохранена отдельно. Закройте лишнюю вкладку перед продолжением.',true);return false;
 }
 return true;
};
const flush=async()=>{
 if(blocked||savePaused||inflight)return inflight;clearTimeout(timer);
 if(!dirty&&!localStorage.getItem(PENDING))return;
 if(!canWrite())return;
 let record;try{record=JSON.parse(localStorage.getItem(PENDING))}catch{}
 if(!record)record={snapshot:observedLocal,revision,writeId:uuid()};
 dirty=!!record.latest;localStorage.setItem(PENDING,JSON.stringify(record));status('Сохраняем…');
 inflight=(async()=>{try{
  const r=await request({method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(record)});
  revision=r.revision;confirmed=record.snapshot;
  // A foreign storage event may have paused us while PUT was in flight.
  if(blocked)return;
  localStorage.removeItem(PENDING);
  dirty=!identical(observedLocal,confirmed);
  if(dirty)localStorage.setItem(PENDING,JSON.stringify({snapshot:observedLocal,revision,writeId:uuid()}));
  status('Ферма сохранена');
 }catch(e){
  if(e.status===423)stopForConflict('',false,true);
  else if(e.status===409)stopForConflict('Ферма уже изменена на другом устройстве. Эта копия сохранена отдельно.');
  else if(permanentSaveErrors[e.status]){savePaused=true;dirty=true;backup(observedLocal);panel(permanentSaveErrors[e.status],()=>location.reload(),'Повторить после исправления')}
  else{dirty=true;status('Нет связи — изменения сохранены на устройстве')}
 }finally{inflight=null;if(dirty&&!blocked&&!savePaused)timer=setTimeout(flush,3000)}})();return inflight;
};
const changed=()=>{
 if(blocked)return;const current=snapshot();
 // The iframe also emits a storage event to its parent. It is not a new edit.
 if(identical(current,observedLocal))return;
 observedLocal=current;changeVersion++;dirty=true;
 let queued;try{queued=JSON.parse(localStorage.getItem(PENDING))}catch{}
 if(!queued)queued={snapshot:current,revision,writeId:uuid()};
 else queued.latest=current;
 localStorage.setItem(PENDING,JSON.stringify(queued));clearTimeout(timer);
 if(!savePaused)timer=setTimeout(flush,350);
};
window.SadovodCloud={changed,flush,canWrite};
window.addEventListener('online',flush);
document.addEventListener('visibilitychange',()=>{if(document.hidden)flush()});
window.addEventListener('pagehide',flush);
window.addEventListener('beforeunload',e=>{if(!blocked&&(dirty||inflight||localStorage.getItem(PENDING))){flush();e.preventDefault();e.returnValue=''}});
window.addEventListener('storage',e=>{if(e.key===null||KEYS.includes(e.key))canWrite()});
setInterval(async()=>{
 if(polling||blocked||savePaused||document.hidden||dirty||inflight)return;
 const checkedRevision=revision,checkedChange=changeVersion;polling=true;
 try{
  const newer=await request();
  if(newer.sessionOwned===false){stopForConflict('',false,true);return;}
  // GET may have started BEFORE our own successful PUT, or before a local edit.
  // An old response must never lock the game or roll its revision backwards.
  if(blocked||savePaused||dirty||inflight||revision!==checkedRevision||changeVersion!==checkedChange)return;
  if(newer.revision>revision){
   if(identical(newer.snapshot,confirmed))revision=newer.revision;
   else stopForConflict('На другом устройстве сохранена новая версия фермы. Эта копия сохранена отдельно.');
  }
 }catch{}finally{polling=false}
},15000);return true;
}
function sameOriginParent(){try{return window.parent!==window&&window.parent.location.origin===location.origin}catch{return false}}
async function startLocal(){window.SadovodCloud={changed(){},flush(){},canWrite(){return true}};window.SadovodSave={setItem(k,v){localStorage.setItem(k,String(v))},removeItem(k){localStorage.removeItem(k)}};const scripts=[...document.querySelectorAll('script[type="application/x-sadovod"]')],immediate=scripts.filter(s=>!s.src&&!s.hasAttribute('defer')&&s.dataset.scriptType!=='module'),deferred=scripts.filter(s=>!immediate.includes(s));for(const old of [...immediate,...deferred]){const s=document.createElement('script');if(old.dataset.scriptType==='module')s.type='module';if(old.src)s.src=old.src;else s.textContent=old.textContent;if(s.src||s.type==='module')await new Promise((resolve,reject)=>{s.onload=resolve;s.onerror=reject;old.replaceWith(s)});else old.replaceWith(s)}for(const frame of document.querySelectorAll('iframe[data-cloud-src]'))frame.src=frame.dataset.cloudSrc;document.getElementById('cloud-message')?.remove();document.documentElement.removeAttribute('data-cloud-loading');status('Локальное сохранение')}
async function run(){try{const embedded=sameOriginParent();if(embedded){if(!window.parent.SadovodCloud)throw Error('parent_not_ready')}else{if(!await acquireSession())return;await acquireRemoteSession();if(!await owner())return;}
const cloud=embedded?window.parent.SadovodCloud:window.SadovodCloud;window.SadovodSave={setItem(k,v){if(KEYS.includes(k)&&cloud.canWrite&&!cloud.canWrite())return;const value=String(v);if(localStorage.getItem(k)===value)return;localStorage.setItem(k,value);if(KEYS.includes(k))cloud.changed()},removeItem(k){if(KEYS.includes(k)&&cloud.canWrite&&!cloud.canWrite())return;if(localStorage.getItem(k)===null)return;localStorage.removeItem(k);if(KEYS.includes(k))cloud.changed()}};
const scripts=[...document.querySelectorAll('script[type="application/x-sadovod"]')];const immediate=scripts.filter(s=>!s.src&&!s.hasAttribute('defer')&&s.dataset.scriptType!=='module'),deferred=scripts.filter(s=>!immediate.includes(s));for(const old of [...immediate,...deferred]){const s=document.createElement('script');if(old.dataset.scriptType==='module')s.type='module';if(old.src)s.src=old.src;else s.textContent=old.textContent;if(s.src||s.type==='module')await new Promise((resolve,reject)=>{s.onload=resolve;s.onerror=reject;old.replaceWith(s)});else old.replaceWith(s)}for(const frame of document.querySelectorAll('iframe[data-cloud-src]'))frame.src=frame.dataset.cloudSrc;document.getElementById('cloud-message')?.remove();document.documentElement.removeAttribute('data-cloud-loading');
}catch(e){console.error('Cloud farm unavailable',e.status||e.message);if(e.status===423){backup();offerTakeover(()=>location.reload())}else if(e.status===409){backup();panel('Пока загружалась ферма, другое устройство обновило сохранение. Местная копия сохранена отдельно.',()=>{localStorage.removeItem(PENDING);location.reload()},'Загрузить последнее сохранение')}else await startLocal()}}
// Fetch module graphs concurrently, but retain save-before-start and the exact
// execution order in run(). Preloading never evaluates game modules.
for(const script of document.querySelectorAll('script[type="application/x-sadovod"][src]')){
 const link=document.createElement('link');link.rel=script.dataset.scriptType==='module'?'modulepreload':'preload';
 if(link.rel==='preload')link.as='script';link.href=script.src;document.head.append(link);
}
if(document.documentElement.hasAttribute('data-local-save'))startLocal();
else run();
