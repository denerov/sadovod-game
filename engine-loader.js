const probe=document.createElement('canvas');
const accelerated=false;
const status=document.querySelector('#status');
status.textContent='Запускаю новый интерактивный движок…';
import(accelerated?'./webgl-engine.js?v=307':'./canvas-engine.js?v=307').catch(error=>{
  const fatal=document.querySelector('#fatal');fatal.hidden=false;fatal.textContent='Ошибка запуска движка: '+error.message;
});
