// Original short sound assets; audio never participates in the game transaction.
export const SOUNDS=Object.freeze({click:.30,harvest:.68,sow:.55,dig:.52,water:.52,coins:.62,engine:.40,factory:.48,cow:.45,chicken:.42,duck:.40,sheep:.40,pig:.42,bird:.42});
export const ANIMAL_SOUNDS=Object.freeze({'dairy-cow':'cow','white-hen':'chicken','red-hen':'chicken',black_chicken:'chicken',duck:'duck',sheep:'sheep',pig:'pig',pigeon:'bird'});
export function actionSound(method,result,object){
 if(!result)return null;
 if(result.action==='collect'||result.action==='harvest'||method==='collectFlour'||method==='harvestEggs')return 'harvest';
 if(result.action==='start')return ANIMAL_SOUNDS[object?.type]||(['swan','goose','rabbit','goat','beehive','fundendolik'].includes(object?.type)?'sow':'factory');
 if(method==='feedHen')return 'chicken';
 if(method==='queueBatch')return 'factory';
 if(['buy','buySelectedPack','buyFuel','buyHay','buySyrup','buyBee','sell','fulfillOrder','claimDaily','claimAchievement'].includes(method))return 'coins';
 return null;
}
export class FarmAudio{
 constructor({createContext,fetchAsset,hidden=()=>false,now=()=>performance.now(),read=()=>null,save=()=>{}}){
  this.createContext=createContext;this.fetchAsset=fetchAsset;this.hidden=hidden;this.now=now;this.save=save;
  this.enabled=true;this.volume=.45;try{const s=JSON.parse(read());if(s){this.enabled=s.enabled!==false;if(Number.isFinite(s.volume))this.volume=Math.max(0,Math.min(1,s.volume));}}catch{}
  this.buffers=new Map();this.loads=new Map();this.last=new Map();this.voices=new Set();this.jobs=[];this.loading=0;this.epoch=0;
 }
 unlock(){
  if(!this.enabled||this.hidden())return;
  try{if(!this.context){this.context=this.createContext();this.master=this.context.createGain();this.master.gain.value=this.volume;this.master.connect(this.context.destination);}
   if(this.context.state!=='running')this.context.resume().catch(()=>{});
   if(!this.warmed){this.warmed=true;for(const k of ['click','harvest','sow','coins'])this.load(k).catch(()=>{});}
  }catch{}
 }
 load(key){
  if(this.buffers.has(key))return Promise.resolve(this.buffers.get(key));
  if(!this.loads.has(key)){
   const job=new Promise((resolve,reject)=>this.jobs.push({key,resolve,reject}));this.loads.set(key,job);this.drain();
  }return this.loads.get(key);
 }
 drain(){while(this.loading<3&&this.jobs.length){const job=this.jobs.shift();this.loading++;
  Promise.resolve().then(()=>this.fetchAsset(`https://sadovod-webgl-engine-test.ddenerov.chatgpt.site/assets/audio-v168/${job.key}.mp3`)).then(r=>{if(!r.ok)throw Error('Sound unavailable');return r.arrayBuffer()}).then(bytes=>this.context.decodeAudioData(bytes)).then(buffer=>{this.buffers.set(job.key,buffer);job.resolve(buffer)}).catch(error=>{this.loads.delete(job.key);job.reject(error)}).finally(()=>{this.loading--;this.drain()});
 }}
 async play(key){
  if(!Object.hasOwn(SOUNDS,key)||!this.context||!this.enabled||!this.volume||this.hidden())return false;
  const animal=['cow','chicken','duck','sheep','pig','bird'].includes(key),group=animal?'animal':key;
  const time=this.now(),gap=animal?1400:key==='engine'?2000:key==='click'?85:240;
  if(time-(this.last.get(group)??-Infinity)<gap)return false;this.last.set(group,time);const epoch=this.epoch;
  try{const buffer=await this.load(key);
   if(epoch!==this.epoch||!this.enabled||!this.volume||this.hidden()||this.now()-time>750||this.context.state!=='running')return false;
   // A burst of harvests or clicks cannot accumulate into an ever louder mix.
   if(this.voices.size>=4){const oldest=this.voices.values().next().value;this.voices.delete(oldest);oldest.stop();}
   const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=buffer;source.playbackRate.value=1+(Math.random()-.5)*.04;
   gain.gain.value=SOUNDS[key];source.connect(gain);gain.connect(this.master);this.voices.add(source);
   source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect()};source.start();return true;
  }catch{return false}
 }
 stop(){this.epoch++;for(const source of this.voices){try{source.stop()}catch{}}this.voices.clear();}
 configure({enabled=this.enabled,volume=this.volume}){
  this.enabled=!!enabled;if(Number.isFinite(volume))this.volume=Math.max(0,Math.min(1,volume));
  if(!this.enabled||!this.volume)this.stop();
  if(this.master)this.master.gain.setTargetAtTime(this.enabled?this.volume:0,this.context.currentTime,.025);
  try{this.save(JSON.stringify({enabled:this.enabled,volume:this.volume}))}catch{}
 }
 result(method,result,object){const key=actionSound(method,result,object);if(key)this.play(key);}
}
// Audio withdrawn by the owner. No AudioContext, requests or listeners are created.
export function installFarmAudio(){
 const silent={enabled:false,volume:0,unlock(){},play(){return false},result(){},stop(){},configure(){}};
 window.SadovodSound?.stop?.();window.SadovodSound=silent;return silent;
}
export function mountAudioSettings(dialog){
 const panel=document.createElement('section');panel.className='audio-settings';
 panel.innerHTML='<h3>Звуки фермы</h3><p>Звуки отключены.</p>';dialog.append(panel);
}
