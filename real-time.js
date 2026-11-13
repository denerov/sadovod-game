// Durable wall-clock checkpoint lives in the same snapshot as the production state.
// Migration starts now: old active-minute saves have no trustworthy offline date.
export function advanceRealTime(model,objects,now=Date.now()){
 if(!Number.isFinite(now)||now<=0)return 0;
 const previous=model.state.wallClockAt;
 if(!Number.isFinite(previous)||previous<=0){model.state.wallClockAt=now;return 0;}
 const elapsed=Math.max(0,now-previous);
 if(!elapsed)return 0; // clock rollback cannot award time twice
 model.advance(elapsed,
  objects.filter(o=>o.type==='wheat-mill').map(o=>o.id),
  objects.filter(o=>['dairy-cow','dairy-factory'].includes(o.type)),
  objects.filter(o=>o.type==='ketchup-factory').map(o=>o.id),
  objects.filter(o=>['winery','vineyard'].includes(o.type)));
 model.advanceChains(elapsed,objects);
 model.state.wallClockAt=now;
 return elapsed;
}
